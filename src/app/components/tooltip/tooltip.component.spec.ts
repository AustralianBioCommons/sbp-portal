import { ComponentFixture, TestBed } from "@angular/core/testing";

import { TooltipComponent } from "./tooltip.component";

describe("TooltipComponent", () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("message", "Test tooltip message");
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should show popup and set position on onTriggerEnter", () => {
    const mockRect = { bottom: 100, left: 50 } as DOMRect;
    const mockEl = {
      getBoundingClientRect: () => mockRect,
    } as HTMLElement;
    const event = { currentTarget: mockEl } as unknown as MouseEvent;

    component.onTriggerEnter(event);

    expect(component.showPopup()).toBeTrue();
    expect(component.popupTop()).toBe("106px");
    expect(component.popupLeft()).toBe("50px");
  });

  it("should hide popup on onTriggerLeave", () => {
    component.showPopup.set(true);
    component.onTriggerLeave();
    expect(component.showPopup()).toBeFalse();
  });

  it("should not render popup when showPopup is false", () => {
    component.showPopup.set(false);
    fixture.detectChanges();
    const popup = fixture.nativeElement.querySelector("[role='tooltip']");
    expect(popup).toBeNull();
  });

  it("should render popup with message when showPopup is true", () => {
    const mockRect = { bottom: 100, left: 50 } as DOMRect;
    const mockEl = {
      getBoundingClientRect: () => mockRect,
    } as HTMLElement;
    component.onTriggerEnter({
      currentTarget: mockEl,
    } as unknown as MouseEvent);
    fixture.detectChanges();

    const popup = fixture.nativeElement.querySelector("[role='tooltip']");
    expect(popup).toBeTruthy();
    expect(popup.textContent).toContain("Test tooltip message");
  });

  it("should assign a unique tooltipId", () => {
    const fixture2 = TestBed.createComponent(TooltipComponent);
    fixture2.componentRef.setInput("message", "Another message");
    fixture2.detectChanges();
    expect(component.tooltipId).not.toBe(fixture2.componentInstance.tooltipId);
  });
});
