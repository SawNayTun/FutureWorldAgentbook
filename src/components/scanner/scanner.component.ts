import { Component, ChangeDetectionStrategy, signal, ViewChild, ElementRef, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleGenAI } from "@google/genai";
import { CameraIconComponent } from '../icons/camera-icon.component';
import { XCircleIconComponent } from '../icons/x-circle-icon.component';
import { CheckIconComponent } from '../icons/check-icon.component';
import { CopyIconComponent } from '../icons/copy-icon.component';
import { ShareIconComponent } from '../icons/share-icon.component';
import { ImageIconComponent } from '../icons/image-icon.component';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CameraIconComponent, XCircleIconComponent, CheckIconComponent, CopyIconComponent, ShareIconComponent, ImageIconComponent]
})
export class ScannerComponent implements OnDestroy {
  close = output<void>();

  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  stream: MediaStream | null = null;
  capturedImage = signal<string | null>(null);
  isProcessing = signal(false);
  scannedText = signal('');
  error = signal<string | null>(null);
  
  // Camera permission state
  hasPermission = signal<boolean | null>(null);

  constructor() {
    this.startCamera();
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Prefer back camera
        } 
      });
      this.hasPermission.set(true);
      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
        }
      }, 100); // Small delay to ensure view is ready
    } catch (err) {
      console.error('Error accessing camera:', err);
      this.hasPermission.set(false);
      this.error.set('Camera access denied. Please enable permissions.');
    }
  }

  capture() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    
    // Performance Optimization: Resize image
    // Large images take too long to upload/process. 1024px is enough for OCR.
    const MAX_SIZE = 1024;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
      if (width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      }
    } else {
      if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, width, height);
      // Reduce quality to 0.6 (60%) to speed up transfer
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      this.capturedImage.set(imageDataUrl);
      this.stopCamera(); 
      this.processImage(imageDataUrl);
    }
  }

  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  handleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // We need to resize uploaded images too, as they might be 4K+ resolution
        const img = new Image();
        img.onload = () => {
             const canvas = this.canvasElement.nativeElement;
             const MAX_SIZE = 1024;
             let width = img.width;
             let height = img.height;

             if (width > height) {
               if (width > MAX_SIZE) {
                 height *= MAX_SIZE / width;
                 width = MAX_SIZE;
               }
             } else {
               if (height > MAX_SIZE) {
                 width *= MAX_SIZE / height;
                 height = MAX_SIZE;
               }
             }

             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx?.drawImage(img, 0, 0, width, height);
             
             const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
             this.capturedImage.set(resizedDataUrl);
             this.stopCamera();
             this.processImage(resizedDataUrl);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
    input.value = ''; 
  }

  async processImage(imageDataUrl: string) {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      const base64Data = imageDataUrl.split(',')[1];

      // Specialized prompt for Burmese 2D Lottery
      const prompt = `
        You are an expert data entry assistant for a Burmese 2D lottery agent. 
        Analyze the image (handwritten or printed) and extract the betting list.
        
        **Translation Rules (Strict Mapping):**
        You must strictly map the Burmese terms or mixed usage to the following specific codes.

        1.  **Direct Numbers:** "25 100" -> \`25 100\`
        2.  **R (Reverse):** "25r", "25R", "၂၅အာ", "၂၅ အပြန်" -> \`25R\`
        3.  **Apu (Doubles):** "အပူး", "apu" -> \`apu\`
        4.  **Nk (Brothers):** "ညီကို", "nk" -> \`nk\`
        5.  **Pao (Power):** "ပါဝါ", "pao" -> \`pao\`
        6.  **Nat (Nat Khat):** "နက္ခတ်", "nat" -> \`nat\`
        7.  **Head (T):** "ထိပ်", "t" (e.g., "1ထိပ်", "1t") -> \`1t\`
        8.  **Tail (P):** "ပိတ်", "p" (e.g., "1ပိတ်", "1p") -> \`1p\`
        9.  **K (Kway/Permute):** "ခွေ", "k" (e.g., "12ခွေ", "12k") -> \`12k\`
        10. **A (Apa/Include):** "အပါ", "a" (e.g., "1အပါ", "1a") -> \`1a\`
        11. **V (Brake/Vyit):** "ဗြိတ်", "ဘရိတ်", "v", "b" (e.g., "1ဗြိတ်", "1v") -> \`1v\`
        12. **SS (EvenEven):** "စုံစုံ", "ss", "ssss" -> \`ss\`
        13. **MM (OddOdd):** "မမ", "mm", "mmmm" -> \`mm\`
        14. **SM (EvenOdd):** "စုံမ", "sm", "smsm" -> \`sm\`
        15. **MS (OddEven):** "မစုံ", "ms", "msms" -> \`ms\`
        16. **SP (TenFull):** "ဆယ်ပြည့်", "sp", "spsp" -> \`sp\`
        17. **BB (Bhu/ZeroTen):** "ဘူ", "bb", "bbbb" -> \`bb\`
        18. **AK (Akat/Neighbor):** "အကပ်", "ak" (e.g., "1အကပ်", "1ak") -> \`1ak\`

        **Output Format:**
        - STRICTLY output one item per line: \`[Code] [Amount]\`
        - Do not output explanations, headers, bold text, or totals.
        - Example Output:
          25 500
          1t 1000
          apu 500
          25R 300
          ss 1000
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          thinkingConfig: { thinkingBudget: 0 } 
        }
      });

      if (response.text) {
        this.scannedText.set(response.text.trim());
      } else {
        this.error.set('Could not read text. Please try again.');
      }
    } catch (e) {
      console.error('Gemini Error:', e);
      this.error.set('Failed to process. Check internet.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  retry() {
    this.capturedImage.set(null);
    this.scannedText.set('');
    this.error.set(null);
    this.startCamera();
  }

  async copyText() {
    try {
      await navigator.clipboard.writeText(this.scannedText());
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  async shareText() {
    const text = this.scannedText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Betting List',
          text: text,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      this.copyText(); 
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  closeScanner() {
    this.stopCamera();
    this.close.emit();
  }

  ngOnDestroy() {
    this.stopCamera();
  }
}