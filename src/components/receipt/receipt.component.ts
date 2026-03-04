
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DataItem } from '../calculator/calculator.component';

@Component({
  selector: 'app-receipt',
  templateUrl: './receipt.component.html',
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiptComponent {
  shopName = input.required<string>();
  dataList = input.required<DataItem[]>();
  totalAmount = input.required<number>();
  totalCount = input.required<number>();
  currencySymbol = input.required<string>();

  currentDate = new Date();
}
