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
  imports: [CommonModule, Edit3IconComponent, EraserIconComponent, CalculatorIconComponent, Trash2IconComponent, CopyIconComponent, SaveIconComponent, PrinterIconComponent, ReceiptComponent]
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
  
  personalShopName = signal('');
  newSetName = signal('');
  isPrinting = signal(false);

  quickSets = this.dataService.quickSets;
  totalAmount = computed(() => this.dataList().reduce((sum, item) => sum + item.a, 0));
  totalCount = computed(() => this.dataList().length);

  modButtons = ['အာ','ခွေ','ပူး','ပါဝါ','နက္ခတ်','ညီအစ်ကို','ဘရိတ်','ထိပ်','ပိတ်','လုံးပိုင်','ဝမ်း','ကိုးညီ','စုံစုံ','မမ','စုံမ','မစုံ','စုံပူး','မပူး', 'စုံဘရိတ်', 'မဘရိတ်'];

  constructor() {
    effect(() => {
      const storedName = localStorage.getItem('fw_my_shop_name');
      this.personalShopName.set(storedName || this.defaultShopName());
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

  addEntry() {
    let finalData: DataItem[] = [];
    const nIn = this.numInput().trim();
    const aIn = this.amtInput().trim();
    if (!aIn) return;
    const baseAmt = parseFloat(aIn);
    if (isNaN(baseAmt)) return;

    if (aIn.includes('.') && nIn.length === 2 && !isNaN(Number(nIn))) {
        const amtParts = aIn.split('.');
        const firstAmt = parseFloat(amtParts[0]);
        const secondAmt = parseFloat(amtParts[1]);
        const rNum = nIn[1] + nIn[0];
        if (!isNaN(firstAmt)) finalData.push({ id: Math.random(), n: nIn, a: firstAmt });
        if (!isNaN(secondAmt) && nIn !== rNum) finalData.push({ id: Math.random(), n: rNum, a: secondAmt });
    } else {
        const actualAmt = this.isReverseMode() ? (baseAmt / 2) : baseAmt;
        let nums = this.chips().length > 0 ? [...this.chips()] : (nIn.includes('.') ? nIn.split('.') : [nIn]);
        nums.forEach(n => {
            const cleanN = n.toString().trim().padStart(2, '0');
            if (cleanN && cleanN.length <= 2) finalData.push({ id: Math.random(), n: cleanN, a: actualAmt });
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
    const autoMods = ['ပါဝါ','နက္ခတ်','ညီအစ်ကို','ကိုးညီ','ပူး','စုံစုံ','မမ','စုံမ','မစုံ','စုံပူး','မပူး', 'စုံဘရိတ်', 'မဘရိတ်'];
    if (validNums.length === 0 && !autoMods.includes(type)) { this.numRef.nativeElement?.focus(); return; }
    
    this.isReverseMode.set(type === 'အာ');

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
      case 'လုံးပိုင်': validNums.forEach(d => { const digit = d.charAt(0); for (let i = 0; i <= 9; i++) { res.push(`${digit}${i}`); res.push(`${i}${digit}`); } }); break;
      case 'စုံဘရိတ်': for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) if ((i + j) % 2 === 0) res.push(`${i}${j}`); break;
      case 'မဘရိတ်': for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) if ((i + j) % 2 !== 0) res.push(`${i}${j}`); break;
      case 'ဝမ်း': for(let i=0; i<validNums.length; i++) for(let j=0; j<validNums.length; j++) res.push(validNums[i].charAt(0)+validNums[j].charAt(0)); break;
    }
    this.chips.update(currentChips => [...new Set([...currentChips, ...res])]);
    this.numInput.set('');
    setTimeout(() => this.amtRef.nativeElement?.focus(), 50);
  }

  async copyAndClear() {
    if (this.dataList().length === 0) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB'); 
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    let text = `--- ${this.personalShopName()} ---\nနေ့စွဲ - ${dateStr} (${timeStr})\n\n`;
    this.dataList().forEach(item => { text += `${item.n} = ${item.a}\n`; });
    text += `----------\nစုစုပေါင်း: (${this.totalCount()}) ကွက် - ${this.totalAmount()} ကျပ်`;
    
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
    }, 100);
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