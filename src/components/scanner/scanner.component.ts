import { Component, ChangeDetectionStrategy, signal, ViewChild, ElementRef, OnDestroy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleGenAI } from "@google/genai";
import { CameraIconComponent } from '../icons/camera-icon.component';
import { XCircleIconComponent } from '../icons/x-circle-icon.component';
import { CheckIconComponent } from '../icons/check-icon.component';
import { CopyIconComponent } from '../icons/copy-icon.component';
import { ShareIconComponent } from '../icons/share-icon.component';
import { ImageIconComponent } from '../icons/image-icon.component';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CameraIconComponent, XCircleIconComponent, CheckIconComponent, CopyIconComponent, ShareIconComponent, ImageIconComponent]
})
export class ScannerComponent implements OnDestroy {
  close = output<void>();
  userIdFound = output<{id: string, name: string}>();

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
    // If browser doesn't support mediaDevices, switch to fallback immediately
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.hasPermission.set(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (this.hasPermission() === null) {
        this.hasPermission.set(false);
      }
    }, 3000);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' 
        } 
      });
      
      clearTimeout(timeoutId);
      this.hasPermission.set(true);
      
      setTimeout(() => {
        if (this.videoElement && this.stream) {
          this.videoElement.nativeElement.srcObject = this.stream;
        }
      }, 100); 
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Error accessing camera:', err);
      this.hasPermission.set(false);
    }
  }

  capture() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    
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
      
      // Try local QR scan on capture as well
      this.tryLocalQrScan(canvas).then(found => {
          if (found) return; // If QR found locally, stop processing
          
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          this.capturedImage.set(imageDataUrl);
          this.stopCamera(); 
          this.processImage(imageDataUrl);
      });
    }
  }

  triggerFileUpload() {
    setTimeout(() => {
        if (this.fileInput && this.fileInput.nativeElement) {
            this.fileInput.nativeElement.click();
        }
    }, 0);
  }

  handleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        const img = new Image();
        img.onload = async () => {
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
             
             // 1. Try Local QR Detection first (Fastest)
             const qrFound = await this.tryLocalQrScan(canvas);
             if (qrFound) {
                 this.stopCamera();
                 return;
             }
             
             // 2. Fallback to Gemini
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

  // Uses the browser's BarcodeDetector API if available
  async tryLocalQrScan(imageSource: ImageBitmapSource): Promise<boolean> {
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const nats = await barcodeDetector.detect(imageSource);
        if (nats.length > 0) {
           const raw = nats[0].rawValue;
           return this.handleDecodedText(raw);
        }
      } catch (e) {
        // Fallback to Gemini if not supported or fails
      }
    }
    return false;
  }

  handleDecodedText(text: string): boolean {
      try {
          // Try decoding URI component first (QR data is encoded in ChatComponent)
          const decoded = decodeURIComponent(text);
          const data = JSON.parse(decoded);
          if (data.type === 'fw_user_id' && data.id && data.name) {
               this.userIdFound.emit({ id: data.id, name: data.name });
               return true;
          }
      } catch(e) {
          // Try parsing raw text if decode failed
          try {
             const data = JSON.parse(text);
             if (data.type === 'fw_user_id' && data.id && data.name) {
                 this.userIdFound.emit({ id: data.id, name: data.name });
                 return true;
             }
          } catch(e2) {}
      }
      return false;
  }

  async processImage(imageDataUrl: string) {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      const base64Data = imageDataUrl.split(',')[1];

      // Dual-Purpose Prompt: Betting Slip OR User ID QR
      const prompt = `
        Analyze the image. It is either:
        1. A handwritten/printed 2D betting list.
        2. A QR Code containing a User ID JSON object (e.g., {"type":"fw_user_id","id":"...","name":"..."}).

        Task:
        - If it is a QR Code, extract the JSON content. If the content is URL encoded, output it as is.
        - If it is a Betting List, extract the list in format: \`[Code] [Amount]\` (one per line). Use strict mapping rules: "R"->R, "အပူး"->apu, etc.
        
        Do not explain. Just output the result.
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
        const text = response.text.trim();
        
        // Attempt to parse as User ID (QR logic fallback)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        if (this.handleDecodedText(cleanText)) {
            return;
        }

        this.scannedText.set(text);
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