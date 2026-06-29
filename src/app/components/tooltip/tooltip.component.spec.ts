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

  it("should open and position the tooltip on show", () => {
    const target = document.createElement("button");
    spyOn(target, "getBoundingClientRect").and.returnValue({
      left: 100,
      width: 40,
      bottom: 50,
    } as DOMRect);

    component.show({ currentTarget: target } as unknown as Event);

    expect(component.open()).toBe(true);
    expect(component.left()).toBe(120);
    expect(component.top()).toBe(56);
  });

  it("should close when the page scrolls while open", () => {
    component.show({
      currentTarget: document.createElement("button"),
    } as unknown as Event);
    fixture.detectChanges();
    expect(component.open()).toBe(true);

    document.dispatchEvent(new Event("scroll"));

    expect(component.open()).toBe(false);
  });
});
