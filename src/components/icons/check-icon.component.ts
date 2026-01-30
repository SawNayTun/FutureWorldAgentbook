
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconModel } from './icon.model';

@Component({
  selector: 'app-check-icon',
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
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckIconComponent extends IconModel {
}
