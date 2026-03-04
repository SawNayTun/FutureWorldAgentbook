import { Directive, ElementRef, HostListener, inject, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appDragScroll]',
  standalone: true
})
export class DragScrollDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private isDown = false;
  private startX = 0;
  private startY = 0;
  private scrollLeft = 0;
  private scrollTop = 0;
  private isDragging = false;
  
  private clickHandler = (e: MouseEvent) => {
    if (this.isDragging) {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = false;
    }
  };

  private mouseMoveHandler = (e: MouseEvent) => {
    if (!this.isDown) return;
    
    const walkX = (e.clientX - this.startX) * 1.5;
    const walkY = (e.clientY - this.startY) * 1.5;
    
    if (!this.isDragging && (Math.abs(walkX) > 3 || Math.abs(walkY) > 3)) {
        this.isDragging = true;
        this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grabbing');
        this.renderer.setStyle(document.body, 'cursor', 'grabbing');
    }

    if (this.isDragging) {
        e.preventDefault();
        this.el.nativeElement.scrollLeft = this.scrollLeft - walkX;
        this.el.nativeElement.scrollTop = this.scrollTop - walkY;
    }
  };

  private mouseUpHandler = (e: MouseEvent) => {
    if (!this.isDown) return;
    this.isDown = false;
    this.renderer.removeStyle(this.el.nativeElement, 'cursor');
    this.renderer.removeStyle(document.body, 'cursor');
    
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);

    if (this.isDragging) {
       setTimeout(() => this.isDragging = false, 50);
    } else {
       this.isDragging = false;
    }
  };

  ngOnInit() {
    this.el.nativeElement.addEventListener('click', this.clickHandler, true); // Use capture phase
    // Prevent text selection while dragging
    this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none');
    this.renderer.setStyle(this.el.nativeElement, '-webkit-user-select', 'none');
    this.renderer.setStyle(this.el.nativeElement, '-webkit-user-drag', 'none');
  }

  ngOnDestroy() {
    this.el.nativeElement.removeEventListener('click', this.clickHandler, true);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Only left click

    // Don't drag if clicking on a native scrollbar
    if (e.target === this.el.nativeElement) {
       if (e.offsetX > this.el.nativeElement.clientWidth || e.offsetY > this.el.nativeElement.clientHeight) {
          return;
       }
    }

    // Prevent nested drag scrolls from interfering with each other
    e.stopPropagation();

    this.isDown = true;
    this.isDragging = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.scrollLeft = this.el.nativeElement.scrollLeft;
    this.scrollTop = this.el.nativeElement.scrollTop;
    
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(e: DragEvent) {
    // CRITICAL: Prevent native browser ghost dragging (e.g. dragging buttons/text)
    e.preventDefault();
  }
}
