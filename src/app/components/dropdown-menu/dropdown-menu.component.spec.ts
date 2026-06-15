import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownMenuComponent } from './dropdown-menu.component';
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-test-host',
  standalone: true,
  imports: [DropdownMenuComponent],
  template: `
    <app-dropdown-menu [isOpen]="isOpen()" (isOpenChange)="isOpen.set($event)">
      <ng-template #trigger>
        <button class="trigger-button" (click)="isOpen.set(!isOpen())">
          Toggle
        </button>
      </ng-template>
      <ng-template #menu>
        <button class="menu-item">Action 1</button>
        <button class="menu-item">Action 2</button>
      </ng-template>
    </app-dropdown-menu>
  `,
})
class TestHostComponent {
  isOpen = signal(false);
}

describe('DropdownMenuComponent', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render trigger button', () => {
    const triggerButton =
      fixture.nativeElement.querySelector('.trigger-button');
    expect(triggerButton).toBeTruthy();
    expect(triggerButton.textContent).toContain('Toggle');
  });

  it('should not show menu initially', () => {
    const menuItems = fixture.nativeElement.querySelectorAll('.menu-item');
    expect(menuItems.length).toBe(0);
  });

  it('should show menu when isOpen is true', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    const menuItems = fixture.nativeElement.querySelectorAll('.menu-item');
    expect(menuItems.length).toBe(2);
  });

  it('should toggle menu when trigger is clicked', () => {
    const triggerButton =
      fixture.nativeElement.querySelector('.trigger-button');

    expect(component.isOpen()).toBe(false);

    triggerButton.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    triggerButton.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should close menu when clicking outside', (done) => {
    component.isOpen.set(true);
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);

    // Simulate pointerdown outside
    setTimeout(() => {
      const pointerdownEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(pointerdownEvent);
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.isOpen()).toBe(false);
        done();
      }, 10);
    }, 10);
  });

  it('should apply right alignment by default', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('[role="menu"]');
    expect(menu.classList.contains('right-0')).toBe(true);
  });
});
