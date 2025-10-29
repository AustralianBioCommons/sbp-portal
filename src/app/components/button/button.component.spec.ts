import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { ButtonComponent } from "./button.component";

describe("ButtonComponent", () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("input properties", () => {
    it("should have default button type", () => {
      expect(component.type()).toBe("button");
    });

    it("should have default primary variant", () => {
      expect(component.variant()).toBe("primary");
    });

    it("should have default width class", () => {
      expect(component.widthClass()).toBe("w-28");
    });

    it("should have default border radius", () => {
      expect(component.borderRadius()).toBe("rounded-md");
    });

    it("should have default disabled state as false", () => {
      expect(component.disabled()).toBe(false);
    });

    it("should have default loading state as false", () => {
      expect(component.loading()).toBe(false);
    });

    it("should have undefined colorClasses by default", () => {
      expect(component.colorClasses()).toBeUndefined();
    });

    it("should have undefined href by default", () => {
      expect(component.href()).toBeUndefined();
    });
  });

  describe("input signal updates", () => {
    beforeEach(() => {
      // Create a fresh component for each test
      fixture = TestBed.createComponent(ButtonComponent);
      component = fixture.componentInstance;
    });

    it("should update type input", () => {
      fixture.componentRef.setInput("type", "submit");
      fixture.detectChanges();
      expect(component.type()).toBe("submit");
    });

    it("should update variant input", () => {
      fixture.componentRef.setInput("variant", "secondary");
      fixture.detectChanges();
      expect(component.variant()).toBe("secondary");
    });

    it("should update colorClasses input", () => {
      fixture.componentRef.setInput("colorClasses", "text-blue-500");
      fixture.detectChanges();
      expect(component.colorClasses()).toBe("text-blue-500");
    });

    it("should update widthClass input", () => {
      fixture.componentRef.setInput("widthClass", "w-full");
      fixture.detectChanges();
      expect(component.widthClass()).toBe("w-full");
    });

    it("should update borderRadius input", () => {
      fixture.componentRef.setInput("borderRadius", "rounded-lg");
      fixture.detectChanges();
      expect(component.borderRadius()).toBe("rounded-lg");
    });

    it("should update disabled input", () => {
      fixture.componentRef.setInput("disabled", true);
      fixture.detectChanges();
      expect(component.disabled()).toBe(true);
    });

    it("should update loading input", () => {
      fixture.componentRef.setInput("loading", true);
      fixture.detectChanges();
      expect(component.loading()).toBe(true);
    });

    it("should update href input", () => {
      fixture.componentRef.setInput("href", "https://example.com");
      fixture.detectChanges();
      expect(component.href()).toBe("https://example.com");
    });
  });

  describe("component rendering", () => {
    it("should render component", () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled).toBeTruthy();
      expect(component).toBeTruthy();
    });
  });

  describe("type validation", () => {
    it("should accept valid button types", () => {
      fixture.componentRef.setInput("type", "button");
      fixture.detectChanges();
      expect(component.type()).toBe("button");

      fixture.componentRef.setInput("type", "submit");
      fixture.detectChanges();
      expect(component.type()).toBe("submit");
    });

    it("should accept valid button variants", () => {
      fixture.componentRef.setInput("variant", "primary");
      fixture.detectChanges();
      expect(component.variant()).toBe("primary");

      fixture.componentRef.setInput("variant", "secondary");
      fixture.detectChanges();
      expect(component.variant()).toBe("secondary");
    });
  });
});
