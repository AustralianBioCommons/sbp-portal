import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not display dialog when isOpen is false', () => {
    component.isOpen = false;
    fixture.detectChanges();
    const dialogElement = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(dialogElement).toBeFalsy();
  });

  it('should display dialog when isOpen is true', () => {
    component.isOpen = true;
    component.title = 'Test Title';
    component.message = 'Test Message';
    fixture.detectChanges();
    
    const dialogElement = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(dialogElement).toBeTruthy();
    
    const titleElement = fixture.nativeElement.querySelector('#dialog-title');
    expect(titleElement?.textContent?.trim()).toBe('Test Title');
    
    const messageElement = fixture.nativeElement.querySelector('p');
    expect(messageElement?.textContent?.trim()).toBe('Test Message');
  });

  it('should emit confirmed event when confirm button is clicked', () => {
    spyOn(component.confirmed, 'emit');
    spyOn(component.closed, 'emit');
    
    component.onConfirm();
    
    expect(component.confirmed.emit).toHaveBeenCalled();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should emit cancelled event when cancel button is clicked', () => {
    spyOn(component.cancelled, 'emit');
    spyOn(component.closed, 'emit');
    
    component.onCancel();
    
    expect(component.cancelled.emit).toHaveBeenCalled();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should call onCancel when backdrop is clicked', () => {
    spyOn(component, 'onCancel');
    
    const element = document.createElement('div');
    const mockEvent = {
      target: element,
      currentTarget: element
    } as unknown as MouseEvent;
    
    component.onBackdropClick(mockEvent);
    
    expect(component.onCancel).toHaveBeenCalled();
  });

  it('should not call onCancel when dialog content is clicked', () => {
    spyOn(component, 'onCancel');
    
    const mockEvent = {
      target: document.createElement('div'),
      currentTarget: document.createElement('span') // Different elements
    } as unknown as MouseEvent;
    
    component.onBackdropClick(mockEvent);
    
    expect(component.onCancel).not.toHaveBeenCalled();
  });

  it('should display title when title is provided', () => {
    component.isOpen = true;
    component.title = 'Custom Title';
    fixture.detectChanges();
    
    const titleElement = fixture.nativeElement.querySelector('#dialog-title');
    expect(titleElement).toBeTruthy();
    expect(titleElement?.textContent?.trim()).toBe('Custom Title');
  });

  it('should not display title section when title is empty', () => {
    component.isOpen = true;
    component.title = '';
    fixture.detectChanges();
    
    const titleElement = fixture.nativeElement.querySelector('#dialog-title');
    expect(titleElement).toBeFalsy();
  });

  it('should display custom button texts', () => {
    component.isOpen = true;
    component.confirmText = 'Yes';
    component.cancelText = 'No';
    fixture.detectChanges();
    
    const buttons = fixture.nativeElement.querySelectorAll('app-button');
    expect(buttons.length).toBe(2);
  });

  it('should apply custom confirm variant', () => {
    component.confirmVariant = 'secondary';
    expect(component.confirmVariant).toBe('secondary');
  });

  it('should apply custom confirm color classes', () => {
    component.confirmColorClasses = 'bg-red-500';
    expect(component.confirmColorClasses).toBe('bg-red-500');
  });

  it('should handle keyboard events on backdrop', () => {
    component.isOpen = true;
    fixture.detectChanges();
    
    spyOn(component, 'onCancel');
    
    const backdrop = fixture.nativeElement.querySelector('[role="button"]');
    
    // Simulate ESC key press
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    backdrop?.dispatchEvent(event);
    
    expect(component.onCancel).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    component.isOpen = true;
    component.title = 'Test Title';
    fixture.detectChanges();
    
    const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(backdrop.getAttribute('role')).toBe('button');
    expect(backdrop.getAttribute('aria-label')).toBe('Close dialog');
    expect(backdrop.getAttribute('tabindex')).toBe('0');
    
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('dialog-title');
  });

  it('should not have aria-labelledby when title is empty', () => {
    component.isOpen = true;
    component.title = '';
    fixture.detectChanges();
    
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-labelledby')).toBeNull();
  });
});