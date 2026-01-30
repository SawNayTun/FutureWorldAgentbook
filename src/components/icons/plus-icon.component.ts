
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconModel } from './icon.model';

@Component({
  selector: 'app-plus-icon',
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
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlusIconComponent extends IconModel {}
