import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({ selector: '[appGridCell]' })
export class GridCellDirective {
  @Input('appGridCell') columnKey!: string;
  constructor(public template: TemplateRef<any>) {}
}
