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
    component.onConfirm();
    expect(component.confirmed.emit).toHaveBeenCalled();
  });

  it('should emit cancelled event when cancel button is clicked', () => {
    spyOn(component.cancelled, 'emit');
    component.onCancel();
    expect(component.cancelled.emit).toHaveBeenCalled();
  });
});