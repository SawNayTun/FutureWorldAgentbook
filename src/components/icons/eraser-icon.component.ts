
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconModel } from './icon.model';

@Component({
  selector: 'app-eraser-icon',
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
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"></path>
      <path d="M22 21H7"></path>
      <path d="m5 12 5 5"></path>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EraserIconComponent extends IconModel {}