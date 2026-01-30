import { Directive, input } from '@angular/core';

@Directive()
export abstract class IconModel {
  size = input<number | string>(24);
  color = input<string>('currentColor');
  strokeWidth = input<number | string>(2);
}