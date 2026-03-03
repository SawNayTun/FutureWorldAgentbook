import { Component, ChangeDetectionStrategy, input, signal, computed, ViewChild, ElementRef, AfterViewInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Edit3IconComponent } from '../icons/edit3-icon.component';
import { EraserIconComponent } from '../icons/eraser-icon.component';
import { CalculatorIconComponent } from '../icons/calculator-icon.component';
import { Trash2IconComponent } from '../icons/trash2-icon.component';
import { CopyIconComponent } from '../icons/copy-icon.component';
import { DataService, QuickSet } from '../../services/data.service';
import { SaveIconComponent } from '../icons/save-icon.component';
import { PrinterIconComponent } from '../icons/printer-icon.component';
import { ShareIconComponent } from '../icons/share-icon.component';
import { ReceiptComponent } from '../receipt/receipt.component';

export interface DataItem {
  id: number;
  n: string;
  a: number;
}

@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Edit3IconComponent, EraserIconComponent, CalculatorIconComponent, Trash2IconComponent, CopyIconComponent, SaveIconComponent, PrinterIconComponent, ShareIconComponent, ReceiptComponent]
})
export class CalculatorComponent implements AfterViewInit {
  private dataService = inject(DataService);

  defaultShopName = input.required<string>();

  @ViewChild('numRef') numRef!: ElementRef<HTMLInputElement>;
  @ViewChild('amtRef') amtRef!: ElementRef<HTMLInputElement>;
  
  numInput = signal('');
  amtInput = signal('');
  dataList = signal<DataItem[]>([]);
  chips = signal<string[]>([]);
  isReverseMode = signal(false);
  isEditingName = signal(false);
  activeModButton = signal<string | null>(null);
  
  // Initialize from localStorage directly
  mode = signal<'2D' | '3D'>((localStorage.getItem('fw_mode') as '2D' | '3D') || '2D');
  currency = signal<'MMK' | 'THB' | 'CNY'>((localStorage.getItem('fw_currency') as 'MMK' | 'THB' | 'CNY') || 'MMK');
  
  personalShopName = signal(localStorage.getItem('fw_my_shop_name') || '');
  newSetName = signal('');
  isPrinting = signal(false);

  quickSets = this.dataService.quickSets;
  totalAmount = computed(() => this.dataList().reduce((sum, item) => sum + item.a, 0));
  totalCount = computed(() => this.dataList().length);

  modButtons2D = ['အာ','ခွေ','ပူး','ပါဝါ','နက္ခတ်','ညီအစ်ကို','ဘရိတ်','ထိပ်','ပိတ်','အပါ','ကိုးညီ','စုံစုံ','မမ','စုံမ','မစုံ','စုံပူး','မပူး', 'စုံဘရိတ်', 'မဘရိတ်'];
  modButtons3D = ['အာ', 'ခွေ', 'ထိပ်', 'ပိတ်'];
  
  modButtons = computed(() => this.mode() === '2D' ? this.modButtons2D : this.modButtons3D);

  constructor() {
    // Only update personalShopName from default if local storage is empty
    effect(() => {
      const defaultName = this.defaultShopName();
      const storedName = localStorage.getItem('fw_my_shop_name');
      
      // If we don't have a stored name, use the default
      if (!storedName && defaultName) {
        this.personalShopName.set(defaultName);
      }
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
    const next = this.mode() === '2D' ? '3D' : '2D';
    this.mode.set(next);
    localStorage.setItem('fw_mode', next);
    
    this.clearChips();
    this.dataList.set([]); 
    this.numRef.nativeElement?.focus();
  }

  toggleCurrency() {
    const current = this.currency();
    const next = current === 'MMK' ? 'THB' : (current === 'THB' ? 'CNY' : 'MMK');
    this.currency.set(next);
    localStorage.setItem('fw_currency', next);
    this.numRef.nativeElement?.focus();
  }

  addEntry() {
    let finalData: DataItem[] = [];
    const nIn = this.numInput().trim();
    let aIn = this.amtInput().trim();
    if (!aIn) return;

    // Check for R syntax (e.g., 500r200) or . syntax (e.g., 500.200)
    let directAmt = 0;
    let reverseAmt = 0;
    let hasReverseAmt = false;

    // Normalize separators: treat '.' same as 'r' for splitting
    const separator = aIn.toLowerCase().includes('r') ? 'r' : (aIn.includes('.') ? '.' : null);

    if (separator) {
        const parts = aIn.toLowerCase().split(separator);
        if (parts.length === 2) {
            let d = parseFloat(parts[0]);
            let r = parseFloat(parts[1]);
            if (!isNaN(d) && !isNaN(r)) {
                // Shorthand logic: if single digit (1-9), treat as hundreds (100-900)
                // ONLY for MMK currency
                if (this.currency() === 'MMK') {
                    if (d > 0 && d < 10) d *= 100;
                    if (r > 0 && r < 10) r *= 100;
                }

                directAmt = d;
                reverseAmt = r;
                hasReverseAmt = true;
            }
        }
    }

    // Fallback if no separator or invalid
    if (!hasReverseAmt) {
        let baseAmt = parseFloat(aIn);
        if (isNaN(baseAmt)) return;
        
        // Apply shorthand logic for single amount too?
        // If user types "5", do they mean 500? Likely yes if they use the shorthand above.
        // But "5" could be 5 kyats.
        // However, given the context of "5.2" -> 500/200, consistent behavior is better.
        // Let's apply it only if it looks like a shorthand entry (e.g. length 1).
        // But let's be careful. For now, only apply to the split syntax as explicitly requested.
        // Wait, if I type "5.2", I get 500 and 200.
        // If I type "5", I might expect 500?
        // Let's stick to the split syntax for now to avoid breaking normal small inputs.
        
        directAmt = baseAmt;
    }

    const is2D = this.mode() === '2D';
    const targetLen = is2D ? 2 : 3;

    // Special case for 2D: "12.500.300" -> 12=500, 21=300 (Reverse with different amount)
    // We preserve this legacy logic if NO 'r' syntax was used AND we are in 2D mode AND input is standard
    // Actually, the new logic covers this if we treat '.' as separator.
    // The original logic was: if (aIn.includes('.') && nIn.length === 2 ...)
    // My new logic parses 500.300 as direct=500, reverse=300.
    // So we can unify the logic.

    const divisor = (!hasReverseAmt && is2D && this.isReverseMode()) ? 2 : 1; 
    const actualDirectAmt = directAmt / divisor;
    // If hasReverseAmt is true, we use it. If not, and isReverseMode is true, we use the split amount (same as direct).
    const actualReverseAmt = hasReverseAmt ? reverseAmt : (this.isReverseMode() ? actualDirectAmt : 0);

    let nums = this.chips().length > 0 ? [...this.chips()] : (nIn.includes('.') ? nIn.split('.') : [nIn]);
    
    // If chips exist (e.g. from 'Ah'), the first chip is usually the "Direct" number (the one typed).
    // We should apply directAmt to the first chip, and reverseAmt to the rest.
    // BUT only if 'Ah' (Permutation) logic was used. 
    // If 'Pate' or 'Hteik' was used, "Direct" vs "Reverse" doesn't make as much sense (they are all generated).
    // However, the user specifically asked for "123 Ah 5.2".
    // So if chips are present, we assume the first one is "Direct".

    if (this.chips().length > 0) {
        nums.forEach((n, index) => {
            const cleanN = n.toString().trim().padStart(targetLen, '0');
            if (cleanN && cleanN.length <= targetLen) {
                // First item gets direct amount, others get reverse amount (if specified or implied by mode)
                // If hasReverseAmt is false, and NOT isReverseMode, then all get directAmt.
                // If hasReverseAmt is true, first gets direct, others get reverse.
                
                let amt = actualDirectAmt;
                if (index > 0) {
                    if (hasReverseAmt) {
                        amt = actualReverseAmt;
                    } else if (is2D && this.isReverseMode()) {
                        amt = actualReverseAmt; // Split amount
                    }
                }
                
                finalData.push({ id: Math.random(), n: cleanN, a: amt });
            }
        });
    } else {
        // No chips, just manual input
        nums.forEach(n => {
            const cleanN = n.toString().trim().padStart(targetLen, '0');
            if (cleanN && cleanN.length <= targetLen) {
                // Add Direct Number
                finalData.push({ id: Math.random(), n: cleanN, a: actualDirectAmt });

                // Handle Reverse/Permutations if needed (Auto-generate if not using chips but using R syntax)
                if (hasReverseAmt || (is2D && this.isReverseMode())) {
                    let perms: string[] = [];
                    if (is2D) {
                        const rev = cleanN[1] + cleanN[0];
                        if (rev !== cleanN) perms.push(rev);
                    } else {
                        // 3D Permutations (only if R syntax is used, we assume they want permutations for the reverse amount)
                        // If they just typed "123" and "500.200", they expect 123=500, and perms=200.
                        perms = this.getPermutations(cleanN).filter(p => p !== cleanN);
                    }

                    perms.forEach(p => {
                        finalData.push({ id: Math.random(), n: p, a: actualReverseAmt });
                    });
                }
            }
        });
    }

    if (finalData.length > 0) {
        this.dataList.update(current => [...finalData, ...current]);
        this.chips.set([]); 
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
    const rawValue = this.numInput().trim();
    const items = rawValue.includes('.') ? rawValue.split('.') : [rawValue];
    const validNums = items.map(i => i.trim()).filter(i => i !== '');
    
    // Auto-focus check
    const autoMods = ['ပါဝါ','နက္ခတ်','ညီအစ်ကို','ကိုးညီ','ပူး','စုံစုံ','မမ','စုံမ','မစုံ','စုံပူး','မပူး', 'စုံဘရိတ်', 'မဘရိတ်', 'အာ', 'ခွေ', 'ထိပ်', 'ပိတ်'];
    if (validNums.length === 0 && !autoMods.includes(type)) { this.numRef.nativeElement?.focus(); return; }
    
    const is2D = this.mode() === '2D';
    this.isReverseMode.set(is2D && type === 'အာ'); // Only enable reverse split for 2D 'Ah'

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
        case 'စုံပူး': res = ['00','22','44','66','88']; break;
        case 'မပူး': res = ['11','33','55','77','99']; break;
        case 'ဘရိတ်': const b = parseInt(validNums[0], 10); for(let i=0; i<=9; i++) for(let j=0; j<=9; j++) if(!isNaN(b) && (i+j)%10 === b) res.push(`${i}${j}`); break;
        case 'ထိပ်': validNums.forEach(d => { for(let i=0; i<=9; i++) res.push(d.charAt(0)+i); }); break;
        case 'ပိတ်': validNums.forEach(d => { for(let i=0; i<=9; i++) res.push(i+d.charAt(0)); }); break;
        case 'အပါ': validNums.forEach(d => { const digit = d.charAt(0); for (let i = 0; i <= 9; i++) { res.push(`${digit}${i}`); res.push(`${i}${digit}`); } }); break;
        case 'စုံဘရိတ်': for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) if ((i + j) % 2 === 0) res.push(`${i}${j}`); break;
        case 'မဘရိတ်': for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) if ((i + j) % 2 !== 0) res.push(`${i}${j}`); break;
        }
    } else {
        // 3D Logic
        switch(type) {
            case 'အာ': // Permutation of the input number
                validNums.forEach(nStr => {
                    const n = nStr.padStart(3, '0');
                    const p = this.getPermutations(n);
                    res.push(...p);
                });
                break;
            case 'ခွေ': // Permutations of digits (Combination)
                // If input is 1234, make all 3-digit permutations
                validNums.forEach(str => {
                    const digits = str.split('');
                    if (digits.length < 3) return;
                    // Generate 3 digit permutations from these digits
                    const perms = this.getPermutationsFromDigits(digits, 3);
                    res.push(...perms);
                });
                break;
            case 'ထိပ်': // 3D Head (e.g. 1 -> 100-199)
                validNums.forEach(str => {
                    const digit = str.charAt(0);
                    for(let i=0; i<=9; i++) {
                        for(let j=0; j<=9; j++) {
                            res.push(`${digit}${i}${j}`);
                        }
                    }
                });
                break;
            case 'ပိတ်': // 3D End (e.g. 1 -> 001, 011... 991)
                validNums.forEach(str => {
                    const digit = str.charAt(0);
                    for(let i=0; i<=9; i++) {
                        for(let j=0; j<=9; j++) {
                            res.push(`${i}${j}${digit}`);
                        }
                    }
                });
                break;
        }
    }

    this.chips.update(currentChips => [...new Set([...currentChips, ...res])]);
    this.numInput.set('');
    setTimeout(() => this.amtRef.nativeElement?.focus(), 50);
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

  async copyAndClear() {
    if (this.dataList().length === 0) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB'); 
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    let text = `--- ${this.personalShopName()} ---\nနေ့စွဲ - ${dateStr} (${timeStr})\n\n`;
    this.dataList().forEach(item => { text += `${item.n} = ${item.a}\n`; });
    text += `----------\nစုစုပေါင်း: (${this.totalCount()}) ကွက် - ${this.totalAmount()} ${this.currency()}`;
    
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }

    this.dataList.set([]);
    this.chips.set([]);
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

  async shareAsImage() {
    if (this.dataList().length === 0) return;

    // We manually draw the receipt on a canvas to share it as an image
    // This avoids heavy libraries like html2canvas and works in this constrained environment
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const items = this.dataList();
    const shopName = this.personalShopName();
    const totalAmt = this.totalAmount();
    const count = this.totalCount();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Measurements
    const width = 500;
    const padding = 20;
    const lineHeight = 30;
    const headerHeight = 100;
    const footerHeight = 100;
    const bodyHeight = items.length * lineHeight;
    const height = headerHeight + bodyHeight + footerHeight;

    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Text Config
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    // Header
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(shopName, width / 2, 40);
    
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(dateStr, width / 2, 70);

    // Divider
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(padding, 85);
    ctx.lineTo(width - padding, 85);
    ctx.stroke();

    // Body (Items)
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#000000';

    let y = 120;
    items.forEach(item => {
        ctx.fillText(item.n, padding + 20, y);
        
        // Dots
        ctx.save();
        ctx.fillStyle = '#aaaaaa';
        const dots = '................................';
        ctx.fillText(dots, 100, y);
        ctx.restore();

        // Amount (Right aligned)
        const amtStr = item.a.toLocaleString();
        const amtWidth = ctx.measureText(amtStr).width;
        ctx.fillText(amtStr, width - padding - amtWidth - 10, y);
        y += lineHeight;
    });

    // Divider Footer
    y += 10;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    // Footer
    y += 40;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Count: ${count}`, padding, y);
    
    const totalStr = `${totalAmt.toLocaleString()} ${this.currency()}`;
    const totalWidth = ctx.measureText(totalStr).width;
    ctx.textAlign = 'right';
    ctx.fillText(totalStr, width - padding, y);
    
    y += 40;
    ctx.font = 'italic 14px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'center';
    ctx.fillText('Thank you & Good Luck!', width / 2, y);

    // Convert to Blob and Share
    canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], 'receipt.png', { type: 'image/png' });
        
        if (navigator.share) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Betting Receipt',
                    text: `Receipt from ${shopName}`
                });
            } catch (err) {
                console.log('Share failed (user cancelled or not supported)');
            }
        } else {
            // Fallback: Download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'receipt.png';
            a.click();
            alert('Image saved to gallery (Sharing not supported on this browser)');
        }
    }, 'image/png');
  }

  removeSingleItem(id: number) {
    this.dataList.update(list => list.filter(item => item.id !== id));
  }

  removeLastEntry() {
    this.dataList.update(list => list.slice(1));
    this.numRef.nativeElement?.focus();
  }

  clearAllEntries() {
    this.dataList.set([]);
  }

  clearChips() {
    this.chips.set([]);
    this.isReverseMode.set(false);
    this.activeModButton.set(null);
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
    this.amtRef.nativeElement?.focus();
  }

  deleteQuickSet(setName: string) {
    if (confirm(`Are you sure you want to delete the Quick Set "${setName}"?`)) {
      this.dataService.deleteQuickSet(setName);
    }
  }
}