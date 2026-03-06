import { Component, ChangeDetectionStrategy, input, signal, computed, ViewChild, ElementRef, AfterViewInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Edit3IconComponent } from '../icons/edit3-icon.component';
import { EraserIconComponent } from '../icons/eraser-icon.component';
import { CalculatorIconComponent } from '../icons/calculator-icon.component';
import { Trash2IconComponent } from '../icons/trash2-icon.component';
import { CopyIconComponent } from '../icons/copy-icon.component';
import { DataService, QuickSet, HistoryItem } from '../../services/data.service';
import { SaveIconComponent } from '../icons/save-icon.component';
import { PrinterIconComponent } from '../icons/printer-icon.component';
import { ShareIconComponent } from '../icons/share-icon.component';
import { DownloadIconComponent } from '../icons/download-icon.component';
import { ReceiptComponent } from '../receipt/receipt.component';
import { GridIconComponent } from '../icons/grid-icon.component';
import { HistoryIconComponent } from '../icons/history-icon.component';
import { MessageCircleIconComponent } from '../icons/message-circle-icon.component';
import { XCircleIconComponent } from '../icons/x-circle-icon.component';
import { ChatService, ChatContact } from '../../services/chat.service';

export interface DataItem {
  id: number;
  n: string;
  a: number;
}

import * as QRCode from 'qrcode';

@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'flex-1 flex flex-col min-h-0'
  },
  imports: [CommonModule, Edit3IconComponent, EraserIconComponent, CalculatorIconComponent, Trash2IconComponent, CopyIconComponent, SaveIconComponent, PrinterIconComponent, ShareIconComponent, DownloadIconComponent, ReceiptComponent, GridIconComponent, HistoryIconComponent, MessageCircleIconComponent, XCircleIconComponent]
})
export class CalculatorComponent implements AfterViewInit {
  private dataService = inject(DataService);
  public chatService = inject(ChatService);

  defaultShopName = input.required<string>();

  @ViewChild('numRef') numRef!: ElementRef<HTMLInputElement>;
  
  numInput2D = signal('');
  numInput3D = signal('');
  get numInput() { return this.mode() === '2D' ? this.numInput2D : this.numInput3D; }

  amtInput2D = signal('');
  amtInput3D = signal('');
  get amtInput() { return this.mode() === '2D' ? this.amtInput2D : this.amtInput3D; }

  dataList2D = signal<DataItem[]>([]);
  dataList3D = signal<DataItem[]>([]);
  dataList = computed(() => this.mode() === '2D' ? this.dataList2D() : this.dataList3D());
  
  chips2D = signal<string[]>([]);
  chips3D = signal<string[]>([]);
  get chips() { return this.mode() === '2D' ? this.chips2D : this.chips3D; }

  isReverseMode2D = signal(false);
  isReverseMode3D = signal(false);
  get isReverseMode() { return this.mode() === '2D' ? this.isReverseMode2D : this.isReverseMode3D; }

  isEditingName = signal(false);

  activeModButton2D = signal<string | null>(null);
  activeModButton3D = signal<string | null>(null);
  get activeModButton() { return this.mode() === '2D' ? this.activeModButton2D : this.activeModButton3D; }

  mode = signal<'2D' | '3D'>('2D');
  
  personalShopName = signal('');

  newSetName2D = signal('');
  newSetName3D = signal('');
  get newSetName() { return this.mode() === '2D' ? this.newSetName2D : this.newSetName3D; }

  isPrinting = signal(false);
  showGrid = signal(false);
  showHistory = signal(false);
  showContactPicker = signal(false);
  pendingImageToSend = signal<string | null>(null);
  active3DTab = signal(0);
  currency = signal<'K' | '฿' | '¥'>((localStorage.getItem('fw_currency') as any) || 'K');

  quickSets = this.dataService.quickSets;
  history = this.dataService.history;
  totalAmount = computed(() => this.dataList().reduce((sum, item) => sum + item.a, 0));
  totalCount = computed(() => this.dataList().length);

  modButtons2D = ['အာ','ခွေ','ပူး','ပါဝါ','နက္ခတ်','ညီအစ်ကို','ဘရိတ်','ထိပ်','ပိတ်','အပါ','ဝမ်းချိန်း','ကိုးညီ','စုံစုံ','မမ','စုံမ','မစုံ'];
  modButtons3D = ['အာ', 'ခွေ', 'ထိပ်', 'ပိတ်', 'အပါ'];
  
  modButtons = computed(() => this.mode() === '2D' ? this.modButtons2D : this.modButtons3D);
  
  // Generate numbers for grid
  numbers2D = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
  numbers3DTabs = Array.from({ length: 10 }, (_, i) => i);
  digits = ['0','1','2','3','4','5','6','7','8','9'];
  
  current3DGrid = computed(() => this.get3DNumbers(this.active3DTab()));
  
  @ViewChild('quickAmtRef') quickAmtRef!: ElementRef<HTMLInputElement>;
  
  quickAmount2D = signal('');
  quickAmount3D = signal('');
  get quickAmount() { return this.mode() === '2D' ? this.quickAmount2D : this.quickAmount3D; }

  primaryChips2D = signal<string[]>([]);
  primaryChips3D = signal<string[]>([]);
  get primaryChips() { return this.mode() === '2D' ? this.primaryChips2D : this.primaryChips3D; }

  constructor() {
    // Initialize shop name
    const storedName = localStorage.getItem('fw_my_shop_name');
    if (storedName) {
      this.personalShopName.set(storedName);
    } else {
      // Use effect to wait for defaultShopName input if not stored
      effect(() => {
        if (!localStorage.getItem('fw_my_shop_name')) {
          this.personalShopName.set(this.defaultShopName());
        }
      }, { allowSignalWrites: true });
    }

    // Persist currency changes
    effect(() => {
      localStorage.setItem('fw_currency', this.currency());
    });
  }

  ngAfterViewInit() {
    this.numRef.nativeElement.focus();
  }
  
  updateShopName(newName: string) {
    const trimmedName = newName.trim();
    if (trimmedName) {
      this.personalShopName.set(trimmedName);
      localStorage.setItem('fw_my_shop_name', trimmedName);
    }
    this.isEditingName.set(false);
  }

  toggleMode() {
    this.mode.update(m => m === '2D' ? '3D' : '2D');
    this.numRef.nativeElement?.focus();
  }

  toggleGrid() {
    this.showGrid.update(v => !v);
  }

  toggleChip(n: string) {
    this.chips.update(current => {
      if (current.includes(n)) {
        return current.filter(c => c !== n);
      } else {
        return [...current, n];
      }
    });
    // Focus quick amount input if chips are selected
    if (this.chips().length > 0) {
        setTimeout(() => this.quickAmtRef?.nativeElement?.focus(), 50);
    }
  }

  get3DNumbers(hundreds: number) {
    return Array.from({ length: 100 }, (_, i) => `${hundreds}${i.toString().padStart(2, '0')}`);
  }

  addEntry() {
    this.processEntry(this.numInput(), this.amtInput());
  }

  addQuickEntry() {
    this.processEntry('', this.quickAmount());
    this.quickAmount.set('');
  }

  private processEntry(nInVal: string, aInVal: string) {
    let finalData: DataItem[] = [];
    let nIn = nInVal.trim();
    let aIn = aInVal.trim();

    // If amount is empty, try to parse from number input (e.g. 12.500)
    if (!aIn && nIn.includes('.')) {
        const parts = nIn.split('.');
        if (parts.length >= 2) {
            nIn = parts[0];
            aIn = parts.slice(1).join('.');
        }
    }

    if (!aIn) return;

    // Handle Split Amount (e.g. 500.200)
    let firstAmt = 0;
    let secondAmt = 0;
    let hasSplitAmt = false;

    if (aIn.includes('.')) {
        const parts = aIn.split('.');
        if (parts.length >= 2 && parts[1].trim() !== '') {
            firstAmt = parseFloat(parts[0]);
            secondAmt = parseFloat(parts[1]);
            hasSplitAmt = !isNaN(firstAmt) && !isNaN(secondAmt);
        }
    }

    if (!hasSplitAmt) {
        firstAmt = parseFloat(aIn);
        if (isNaN(firstAmt)) return;
    }

    const is2D = this.mode() === '2D';
    const targetLen = is2D ? 2 : 3;

    // Logic 1: Using Chips (Selected Numbers)
    if (this.chips().length > 0) {
        const chips = this.chips();
        const primaries = this.primaryChips();
        chips.forEach((n, index) => {
            const finalN = n.padStart(targetLen, '0');
            let amt = firstAmt;

            if (hasSplitAmt) {
                // Split Amount Logic (e.g. 10.5 -> 10 and 5)
                // 3D: 123 -> 10, Permutations -> 5
                // 2D: 12 -> 10, Reverse -> 5
                if (primaries.length > 0) {
                    amt = primaries.includes(finalN) ? firstAmt : secondAmt;
                } else {
                    // Fallback for manual selection: First item gets firstAmt
                    amt = (index === 0) ? firstAmt : secondAmt;
                }
            } else {
                // Single Amount Logic (e.g. 10)
                // 2D Reverse Mode: Divide by 2 (e.g. 12 -> 5, 21 -> 5)
                // 3D Reverse Mode: Full Amount (e.g. 123 -> 10, 132 -> 10)
                if (is2D && this.isReverseMode()) {
                    // If not a double (e.g. 12, 21), split the amount
                    // If double (e.g. 11), keep full amount
                    const isDouble = finalN.split('').every(char => char === finalN[0]);
                    if (!isDouble) {
                        amt = firstAmt / 2;
                    }
                }
            }
            
            finalData.push({ id: Math.random(), n: finalN, a: amt });
        });
    } 
    // Logic 2: Direct Input (No Chips)
    else {
        // Special Auto-Permutation Logic for Split Amount on Direct Input
        if (hasSplitAmt) {
             // 2D: 12 -> 12=Amt1, 21=Amt2
             if (is2D && nIn.length === 2 && !isNaN(Number(nIn))) {
                 const rNum = nIn[1] + nIn[0];
                 finalData.push({ id: Math.random(), n: nIn, a: firstAmt });
                 if (nIn !== rNum) finalData.push({ id: Math.random(), n: rNum, a: secondAmt });
             }
             // 3D: 123 -> 123=Amt1, Permutations=Amt2
             else if (!is2D && nIn.length === 3 && !isNaN(Number(nIn))) {
                 finalData.push({ id: Math.random(), n: nIn, a: firstAmt });
                 const perms = this.getPermutations(nIn);
                 perms.forEach(p => {
                     if (p !== nIn) finalData.push({ id: Math.random(), n: p, a: secondAmt });
                 });
             }
             // Fallback for other cases (just add as is with first amt)
             else {
                 const nums = nIn.includes('.') ? nIn.split('.') : [nIn];
                 nums.forEach(n => {
                    const finalN = n.trim().padStart(targetLen, '0');
                    if (finalN.length <= targetLen) finalData.push({ id: Math.random(), n: finalN, a: firstAmt });
                 });
             }
        } 
        // Normal Amount
        else {
            const divisor = (is2D && this.isReverseMode()) ? 2 : 1; 
            const actualAmt = firstAmt / divisor;
            
            const nums = nIn.includes('.') ? nIn.split('.') : [nIn];
            nums.forEach(n => {
                const finalN = n.trim().padStart(targetLen, '0');
                if (finalN.length <= targetLen) finalData.push({ id: Math.random(), n: finalN, a: actualAmt });
            });
        }
    }

    if (finalData.length > 0) {
        const targetSignal = this.mode() === '2D' ? this.dataList2D : this.dataList3D;
        targetSignal.update(current => [...finalData, ...current]);
        this.chips.set([]); 
        this.primaryChips.set([]);
        this.numInput.set(''); 
        this.amtInput.set(''); 
        this.isReverseMode.set(false);
        this.activeModButton.set(null);
        this.numRef.nativeElement?.focus();
    }
  }

  applyMode(type: string) {
    this.activeModButton.set(type);
    let res: string[] = [];
    
    // Determine source numbers: Chips take priority
    const hasChips = this.chips().length > 0;
    const rawValue = this.numInput().trim();
    
    let validNums: string[] = [];
    
    if (hasChips) {
        validNums = [...this.chips()];
    } else {
        const items = rawValue.includes('.') ? rawValue.split('.') : [rawValue];
        validNums = items.map(i => i.trim()).filter(i => i !== '');
    }

    // Auto-focus check
    const autoMods = ['ပါဝါ','နက္ခတ်','ညီအစ်ကို','ကိုးညီ','ပူး','စုံစုံ','မမ','စုံမ','မစုံ', 'အာ', 'ခွေ', 'ထိပ်', 'ပိတ်', 'အပါ'];
    if (validNums.length === 0 && !autoMods.includes(type)) { this.numRef.nativeElement?.focus(); return; }
    
    const is2D = this.mode() === '2D';
    const targetLen = is2D ? 2 : 3;
    this.isReverseMode.set(is2D && type === 'အာ'); 
    
    // Store primary (direct) chips for split amount logic later
    this.primaryChips.set(validNums.map(v => v.padStart(targetLen, '0')));

    if (is2D) {
        switch(type) {
        case 'အာ': validNums.forEach(nStr => { const n = nStr.padStart(2, '0'); res.push(n); const reversed = n[1] + n[0]; if (n !== reversed) res.push(reversed); }); break;
        case 'ခွေ': validNums.forEach(str => { const digits = str.split(''); for(let i=0; i<digits.length; i++) for(let j=0; j<digits.length; j++) if (i !== j) res.push(digits[i] + digits[j]); }); break;
        case 'ပူး': if (validNums.length > 0) validNums.forEach(d => res.push(d.charAt(0) + d.charAt(0))); else res = ['00','11','22','33','44','55','66','77','88','99']; break;
        case 'ပါဝါ': res = ['05','16','27','38','49','50','61','72','83','94']; break;
        case 'နက္ခတ်': res = ['07','18','24','35','69','70','81','42','53','96']; break;
        case 'ညီအစ်ကို': res = ['01','12','23','34','45','56','67','78','89','90','10','21','32','43','54','65','76','87','98','09']; break;
        case 'ကိုးညီ': res = ['18','27','36','45','81','72','63','54']; break;
        case 'စုံစုံ': for(let i=0; i<=8; i+=2) for(let j=0; j<=8; j+=2) if(i !== j) res.push(`${i}${j}`); break;
        case 'မမ': for(let i=1; i<=9; i+=2) for(let j=1; j<=9; j+=2) if(i !== j) res.push(`${i}${j}`); break;
        case 'စုံမ': for(let i=0; i<=8; i+=2) for(let j=1; j<=9; j+=2) res.push(`${i}${j}`); break;
        case 'မစုံ': for(let i=1; i<=9; i+=2) for(let j=0; j<=8; j+=2) res.push(`${i}${j}`); break;
        case 'ဘရိတ်': const b = parseInt(validNums[0], 10); for(let i=0; i<=9; i++) for(let j=0; j<=9; j++) if(!isNaN(b) && (i+j)%10 === b) res.push(`${i}${j}`); break;
        case 'ထိပ်': validNums.forEach(d => { for(let i=0; i<=9; i++) res.push(d.charAt(0)+i); }); break;
        case 'ပိတ်': validNums.forEach(d => { for(let i=0; i<=9; i++) res.push(i+d.charAt(0)); }); break;
        case 'အပါ': validNums.forEach(d => { const digit = d.charAt(0); for (let i = 0; i <= 9; i++) { res.push(`${digit}${i}`); res.push(`${i}${digit}`); } }); break;
        case 'ဝမ်းချိန်း': validNums.forEach(str => { const digits = str.split(''); for(let i=0; i<digits.length; i++) for(let j=0; j<digits.length; j++) res.push(digits[i] + digits[j]); }); break;
        }
    } else {
        // 3D Logic
        switch(type) {
            case 'အာ': 
                validNums.forEach(nStr => {
                    const n = nStr.padStart(3, '0');
                    const p = this.getPermutations(n);
                    res.push(...p);
                });
                break;
            case 'ခွေ': 
                validNums.forEach(str => {
                    const digits = str.split('');
                    if (digits.length < 3) return;
                    const perms = this.getPermutationsFromDigits(digits, 3);
                    res.push(...perms);
                });
                break;
            case 'ထိပ်':
                validNums.forEach(d => {
                    const digit = d.charAt(0);
                    // 1 -> 100 to 199
                    for (let i = 0; i <= 99; i++) {
                        res.push(digit + i.toString().padStart(2, '0'));
                    }
                });
                break;
            case 'ပိတ်':
                validNums.forEach(d => {
                    const digit = d.charAt(0); // Last digit
                    // 1 -> 001, 011, ... 991
                    for (let i = 0; i <= 99; i++) {
                        res.push(i.toString().padStart(2, '0') + digit);
                    }
                });
                break;
            case 'အပါ':
                validNums.forEach(d => {
                    const digit = d.charAt(0);
                    // 1 -> Any number containing 1 from 000-999
                    for (let i = 0; i <= 999; i++) {
                        const s = i.toString().padStart(3, '0');
                        if (s.includes(digit)) res.push(s);
                    }
                });
                break;
        }
    }

    this.chips.set([...new Set(res)]);
    this.numInput.set('');
    
    // Focus quick amount if chips exist, else main amount
    setTimeout(() => {
        if (this.chips().length > 0) {
            this.quickAmtRef?.nativeElement?.focus();
        } else {
            this.numRef.nativeElement?.focus();
        }
    }, 50);
  }

  // Helper for 3D Permutations
  getPermutations(str: string): string[] {
    if (str.length <= 1) return [str];
    const permutations: string[] = [];
    const smallerPerms = this.getPermutations(str.slice(1));
    const firstChar = str[0];
    for (const perm of smallerPerms) {
      for (let i = 0; i <= perm.length; i++) {
        permutations.push(perm.slice(0, i) + firstChar + perm.slice(i));
      }
    }
    return [...new Set(permutations)];
  }

  getPermutationsFromDigits(digits: string[], length: number): string[] {
      const results: string[] = [];
      
      function permute(arr: string[], m: string[] = []) {
          if (m.length === length) {
              results.push(m.join(''));
              return;
          }
          for (let i = 0; i < arr.length; i++) {
              const curr = arr.slice();
              const next = curr.splice(i, 1);
              permute(curr.slice(), m.concat(next));
          }
      }
      
      permute(digits);
      return [...new Set(results)];
  }

  // Helper to generate receipt text
  private generateReceiptText(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB'); 
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const symbol = this.currency();
    
    let text = `--- ${this.personalShopName()} ---\nနေ့စွဲ - ${dateStr} (${timeStr})\n\n`;
    this.dataList().forEach(item => { text += `${item.n} = ${item.a}\n`; });
    text += `----------\nစုစုပေါင်း: (${this.totalCount()}) ကွက် - ${this.totalAmount()} ${symbol}`;
    return text;
  }

  async copyAndClear() {
    if (this.dataList().length === 0) return;
    const text = this.generateReceiptText();
    
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }

    this.saveToHistoryAndClear();
  }

  private saveToHistoryAndClear() {
    const symbol = this.currency();
    const now = new Date();
    
    // Save to history
    const historyItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      shopName: this.personalShopName(),
      mode: this.mode(),
      currency: symbol,
      items: this.dataList().map(i => ({ n: i.n, a: i.a })),
      totalAmount: this.totalAmount(),
      totalCount: this.totalCount()
    };
    this.dataService.addToHistory(historyItem);

    const targetSignal = this.mode() === '2D' ? this.dataList2D : this.dataList3D;
    targetSignal.set([]);
    this.chips.set([]);
    this.primaryChips.set([]);
    this.numInput.set('');
    this.amtInput.set('');
    this.numRef.nativeElement?.focus();
  }

  printReceipt() {
    if (this.dataList().length === 0) return;
    
    this.isPrinting.set(true);
  
    // Wait for the DOM to update with the receipt component, then print
    setTimeout(() => {
      window.print();
      this.isPrinting.set(false);
    }, 300);
  }

  previewImage = signal<string | null>(null);

  closePreview() {
    this.previewImage.set(null);
  }

  async shareAsImage() {
    const base64 = await this.generateReceiptImage();
    if (!base64) return;

    try {
        const blob = await (await fetch(base64)).blob();
        const file = new File([blob], 'receipt.png', { type: 'image/png' });
        
        // 1. Try Web Share API (Best for mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Betting Receipt',
                    text: `Receipt from ${this.personalShopName()}`
                });
                this.saveToHistoryAndClear();
                return;
            } catch (shareErr) {
                console.warn('Share failed or cancelled, falling back to preview', shareErr);
            }
        }

        // 2. Fallback to Preview Modal
        this.previewImage.set(base64);
        this.saveToHistoryAndClear();

    } catch (err) {
        console.error('Image generation failed', err);
        alert('Could not generate image.');
    }
  }

  async saveImage(base64: string) {
    if (!base64) return;
    try {
        const blob = await (await fetch(base64)).blob();

        // 1. Try File System Access API (Desktop Chrome/Edge)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: `receipt-${Date.now()}.png`,
                    types: [{
                        description: 'Receipt Image',
                        accept: { 'image/png': ['.png'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('File System Access API failed', err);
                } else {
                    return; // User cancelled
                }
            }
        }

        // 2. Try Web Share API (Mobile) - often the best way to "save" on mobile
        const file = new File([blob], `receipt-${Date.now()}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Save Receipt',
                    text: 'Save this receipt'
                });
                return;
            } catch (shareErr) {
                console.warn('Share failed, falling back to download', shareErr);
            }
        }

        // 3. Fallback: Anchor Tag Download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Download failed', err);
        // 4. Final Fallback: Open in new tab
        const win = window.open();
        if (win) {
            win.document.write('<img src="' + base64 + '" style="width:100%"/>');
        } else {
            alert('Could not save image. Please allow popups.');
        }
    }
  }

  async shareImage(base64: string) {
    if (!base64) return;
    try {
        const blob = await (await fetch(base64)).blob();
        const file = new File([blob], `receipt-${Date.now()}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Betting Receipt',
                text: `Receipt from ${this.personalShopName()}`
            });
        } else {
            // Fallback for desktop or unsupported browsers
            this.saveImage(base64);
            alert('Sharing not supported on this device. Image saved instead.');
        }
    } catch (err) {
        console.error('Share failed', err);
        // Fallback: Try to share just the URL or download
        this.saveImage(base64);
    }
  }

  async downloadReceipt() {
    const base64 = await this.generateReceiptImage();
    if (!base64) return;
    // Show preview modal for manual save
    this.previewImage.set(base64);
    this.saveToHistoryAndClear();
  }

  async openSendToChat() {
    if (this.dataList().length === 0) return;
    const base64 = await this.generateReceiptImage();
    if (base64) {
      this.pendingImageToSend.set(base64);
      this.showContactPicker.set(true);
    }
  }

  async sendImageToContact(contact: ChatContact) {
    const base64 = this.pendingImageToSend();
    const me = this.dataService.currentUser();
    if (base64 && me) {
      await this.chatService.sendMessage(
        contact.chatId,
        base64,
        me.id,
        me.id,
        contact.userId,
        'image'
      );
      this.saveToHistoryAndClear();
      alert(`Sent to ${contact.name}`);
      this.showContactPicker.set(false);
      this.pendingImageToSend.set(null);
    }
  }

  private async generateReceiptImage(): Promise<string | null> {
    if (this.dataList().length === 0) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const items = this.dataList();
    const shopName = this.personalShopName();
    const totalAmt = this.totalAmount();
    const count = this.totalCount();
    const symbol = this.currency();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Measurements
    const width = 500;
    const padding = 20;
    const lineHeight = 35;
    const headerHeight = 120;
    const footerHeight = 120;
    const bodyHeight = items.length * lineHeight;
    const height = headerHeight + bodyHeight + footerHeight;

    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, width - 10, height - 10);

    // Text Config
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    // Header
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`--- ${shopName} ---`, width / 2, 50);
    
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText(`နေ့စွဲ: ${dateStr}`, width / 2, 85);

    // Real QR Code (Top Right)
    try {
        const qrText = this.generateReceiptText();
        const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 0, width: 90 });
        const qrImage = new Image();
        qrImage.src = qrDataUrl;
        await new Promise((resolve) => { qrImage.onload = resolve; });
        ctx.drawImage(qrImage, width - 110, 20, 90, 90);
    } catch (e) {
        console.error('QR Gen Error', e);
    }

    // Divider
    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.moveTo(padding, 105);
    ctx.lineTo(width - padding, 105);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Body (Items)
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#000000';

    let y = 145;
    items.forEach(item => {
        ctx.fillText(item.n, padding + 20, y);
        
        // Dots
        ctx.save();
        ctx.fillStyle = '#999999';
        const dots = '................................';
        ctx.fillText(dots, 100, y);
        ctx.restore();

        // Amount (Right aligned)
        const amtStr = `${item.a.toLocaleString()}`;
        const amtWidth = ctx.measureText(amtStr).width;
        ctx.fillText(amtStr, width - padding - amtWidth - 10, y);
        y += lineHeight;
    });

    // Divider Footer
    y += 15;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    // Footer
    y += 45;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`စုစုပေါင်း: (${count})`, padding, y);
    
    const totalStr = `${totalAmt.toLocaleString()} ${symbol}`;
    const totalWidth = ctx.measureText(totalStr).width;
    ctx.textAlign = 'right';
    ctx.fillText(totalStr, width - padding, y);
    
    y += 45;
    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.fillText('Thank you & Good Luck!', width / 2, y);

    return canvas.toDataURL('image/png');
  }

  removeSingleItem(id: number) {
    const targetSignal = this.mode() === '2D' ? this.dataList2D : this.dataList3D;
    targetSignal.update(list => list.filter(item => item.id !== id));
  }

  removeLastEntry() {
    const targetSignal = this.mode() === '2D' ? this.dataList2D : this.dataList3D;
    targetSignal.update(list => list.slice(1));
    this.numRef.nativeElement?.focus();
  }

  clearAllEntries() {
    const targetSignal = this.mode() === '2D' ? this.dataList2D : this.dataList3D;
    targetSignal.set([]);
  }

  clearChips() {
    this.chips.set([]);
    this.primaryChips.set([]);
    this.isReverseMode.set(false);
    this.activeModButton.set(null);
  }

  loadHistoryItem(item: HistoryItem) {
    const targetSignal = item.mode === '2D' ? this.dataList2D : this.dataList3D;
    const restoredItems: DataItem[] = item.items.map((it, idx) => ({
      id: Date.now() + idx,
      n: it.n,
      a: it.a
    }));
    
    if (this.mode() !== item.mode) {
      this.mode.set(item.mode);
    }
    
    targetSignal.set(restoredItems);
    this.showHistory.set(false);
    this.numRef.nativeElement?.focus();
    
    // Remove from history after loading
    this.dataService.deleteHistoryItem(item.id);
  }

  deleteHistoryItem(id: string) {
    this.dataService.deleteHistoryItem(id);
  }

  clearHistory() {
    this.dataService.clearHistory();
  }

  saveCurrentChipsAsSet() {
    const name = this.newSetName().trim();
    const numbers = this.chips();
    if (!name || numbers.length === 0) {
      alert('Please provide a name for the set and generate numbers first.');
      return;
    }
    this.dataService.addQuickSet({ name, numbers });
    this.newSetName.set('');
    this.chips.set([]);
  }

  loadQuickSet(set: QuickSet) {
    this.chips.set(set.numbers);
    setTimeout(() => this.quickAmtRef?.nativeElement?.focus(), 50);
  }

  deleteQuickSet(setName: string) {
    if (confirm(`Are you sure you want to delete the Quick Set "${setName}"?`)) {
      this.dataService.deleteQuickSet(setName);
    }
  }
}