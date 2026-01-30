
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconModel } from './icon.model';

@Component({
  selector: 'app-calculator-icon',
  template: `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      [attr.width]="size()" 
      [attr.height]="size()" 
      viewBox="0 0 24 24" 
      fill="none" 
      [attr.stroke]="color()" 
      [attr.stroke-width]="strokeWidth()" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2"></rect>
      <line x1="8" x2="16" y1="6" y2="6"></line>
      <line x1="16" x2="16" y1="14" y2="18"></line>
      <line x1="16" x2="12" y1="14" y2="14"></line>
      <line x1="12" x2="12" y1="14" y2="18"></line>
      <line x1="12" x2="8" y1="18" y2="18"></line>
      <line x1="8" x2="8" y1="18" y2="14"></line>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculatorIconComponent extends IconModel {
}
