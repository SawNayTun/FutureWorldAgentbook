
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconModel } from './icon.model';

@Component({
  selector: 'app-device-off-icon',
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
      <rect width="10" height="16" x="7" y="4" rx="2"></rect>
      <line x1="10" y1="18" x2="14" y2="18"></line>
      <line x1="2" y1="2" x2="22" y2="22"></line>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceOffIconComponent extends IconModel {}
