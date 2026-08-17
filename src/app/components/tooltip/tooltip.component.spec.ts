import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

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

  it("describes its own default trigger", () => {
    const button: HTMLElement =
      fixture.nativeElement.querySelector("button[aria-label]");

    expect(button.getAttribute("aria-describedby")).toBe(component.tooltipId);
  });
});

@Component({
  imports: [TooltipComponent],
  template: `
    <app-tooltip message="Custom">
      <button type="button" aria-label="Help">?</button>
    </app-tooltip>
  `,
})
class CustomTriggerHostComponent {}

describe("TooltipComponent with a projected trigger", () => {
  it("describes the projected trigger", async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTriggerHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(CustomTriggerHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tooltip = fixture.debugElement.query(By.directive(TooltipComponent));
    const button: HTMLElement = fixture.nativeElement.querySelector(
      "button[aria-label='Help']"
    );

    expect(button.getAttribute("aria-describedby")).toBe(
      (tooltip.componentInstance as TooltipComponent).tooltipId
    );
  });

  it("describes a focusable trigger that is not a button", async () => {
    // The viewer's help icon is exactly this: focusable, but nothing to click.
    @Component({
      imports: [TooltipComponent],
      template: `
        <app-tooltip message="Custom">
          <span tabindex="0" aria-label="Help">?</span>
        </app-tooltip>
      `,
    })
    class IconTriggerHostComponent {}

    await TestBed.configureTestingModule({
      imports: [IconTriggerHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(IconTriggerHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const tooltip = fixture.debugElement.query(By.directive(TooltipComponent));
    expect(
      fixture.nativeElement
        .querySelector("span")
        .getAttribute("aria-describedby")
    ).toBe((tooltip.componentInstance as TooltipComponent).tooltipId);
  });

  it("leaves a trigger that describes itself alone", async () => {
    @Component({
      imports: [TooltipComponent],
      template: `
        <app-tooltip message="Custom">
          <button type="button" aria-describedby="mine">?</button>
        </app-tooltip>
      `,
    })
    class OwnDescriptionHostComponent {}

    await TestBed.configureTestingModule({
      imports: [OwnDescriptionHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(OwnDescriptionHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement
        .querySelector("button")
        .getAttribute("aria-describedby")
    ).toBe("mine");
  });
});
