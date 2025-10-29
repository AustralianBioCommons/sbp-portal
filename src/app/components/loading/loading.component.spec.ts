import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { LoadingComponent } from './loading.component';

describe('LoadingComponent', () => {
  let component: LoadingComponent;
  let fixture: ComponentFixture<LoadingComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoadingComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render loading overlay', () => {
    const loadingOverlay = compiled.querySelector('.loading-overlay');
    expect(loadingOverlay).toBeTruthy();
  });

  it('should display loading title', () => {
    const loadingTitle = compiled.querySelector('.loading-title');
    expect(loadingTitle).toBeTruthy();
    expect(loadingTitle?.textContent?.trim()).toBe('Loading...');
  });

  it('should display loading text without subtitle', () => {
    const loadingText = compiled.querySelector('.loading-text');
    expect(loadingText).toBeTruthy();
    
    // The component only has a loading title, no subtitle
    const loadingSubtitle = compiled.querySelector('.loading-subtitle');
    expect(loadingSubtitle).toBeFalsy();
  });

  it('should have spinner elements', () => {
    const spinnerBackground = compiled.querySelector('.spinner-background');
    const spinnerForeground = compiled.querySelector('.spinner-foreground');
    
    expect(spinnerBackground).toBeTruthy();
    expect(spinnerForeground).toBeTruthy();
  });

  it('should have three pulse dots', () => {
    const pulseDots = compiled.querySelectorAll('.pulse-dot');
    expect(pulseDots.length).toBe(3);
  });

  it('should have correct CSS classes for pulse dots', () => {
    const primaryDot = compiled.querySelector('.dot-primary');
    const accentDot = compiled.querySelector('.dot-accent');
    const secondaryDot = compiled.querySelector('.dot-secondary');
    
    expect(primaryDot).toBeTruthy();
    expect(accentDot).toBeTruthy();
    expect(secondaryDot).toBeTruthy();
  });

  it('should have proper z-index for overlay', () => {
    const loadingOverlay = compiled.querySelector('.loading-overlay') as HTMLElement;
    expect(loadingOverlay).toBeTruthy();
    
    const computedStyle = window.getComputedStyle(loadingOverlay);
    expect(computedStyle.position).toBe('fixed');
    expect(computedStyle.zIndex).toBe('1000');
  });

  it('should cover full viewport', () => {
    const loadingOverlay = compiled.querySelector('.loading-overlay') as HTMLElement;
    const computedStyle = window.getComputedStyle(loadingOverlay);
    
    expect(computedStyle.top).toBe('0px');
    expect(computedStyle.left).toBe('0px');
    expect(computedStyle.right).toBe('0px');
    expect(computedStyle.bottom).toBe('0px');
  });

  it('should be centered', () => {
    const loadingOverlay = compiled.querySelector('.loading-overlay') as HTMLElement;
    const computedStyle = window.getComputedStyle(loadingOverlay);
    
    expect(computedStyle.display).toBe('flex');
    expect(computedStyle.alignItems).toBe('center');
    expect(computedStyle.justifyContent).toBe('center');
  });
});