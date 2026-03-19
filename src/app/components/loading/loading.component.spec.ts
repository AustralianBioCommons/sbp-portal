import { ComponentFixture, TestBed } from "@angular/core/testing";

import { LoadingComponent } from "./loading.component";

describe("LoadingComponent", () => {
  let component: LoadingComponent;
  let fixture: ComponentFixture<LoadingComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("default inputs", () => {
    it("should default message to 'Loading...'", () => {
      expect(component.message).toBe("Loading...");
    });

    it("should default inline to false", () => {
      expect(component.inline).toBe(false);
    });
  });

  describe("message input", () => {
    it("should display default message", () => {
      const loadingTitle = compiled.querySelector(".loading-title");
      expect(loadingTitle?.textContent?.trim()).toBe("Loading...");
    });

    it("should display custom message", () => {
      component.message = "Loading report...";
      fixture.detectChanges();
      const loadingTitle = compiled.querySelector(".loading-title");
      expect(loadingTitle?.textContent?.trim()).toBe("Loading report...");
    });

    it("should update displayed message when input changes", () => {
      component.message = "Loading files...";
      fixture.detectChanges();
      expect(compiled.querySelector(".loading-title")?.textContent?.trim()).toBe("Loading files...");

      component.message = "Loading logs...";
      fixture.detectChanges();
      expect(compiled.querySelector(".loading-title")?.textContent?.trim()).toBe("Loading logs...");
    });
  });

  describe("inline input", () => {
    it("should render loading-overlay by default (inline = false)", () => {
      expect(compiled.querySelector(".loading-overlay")).toBeTruthy();
      expect(compiled.querySelector(".loading-inline")).toBeFalsy();
    });

    it("should render loading-inline when inline is true", () => {
      component.inline = true;
      fixture.detectChanges();
      expect(compiled.querySelector(".loading-inline")).toBeTruthy();
      expect(compiled.querySelector(".loading-overlay")).toBeFalsy();
    });

    it("should switch back to loading-overlay when inline is set to false", () => {
      component.inline = true;
      fixture.detectChanges();
      component.inline = false;
      fixture.detectChanges();
      expect(compiled.querySelector(".loading-overlay")).toBeTruthy();
      expect(compiled.querySelector(".loading-inline")).toBeFalsy();
    });
  });

  describe("spinner elements", () => {
    it("should render spinner background and foreground", () => {
      expect(compiled.querySelector(".spinner-background")).toBeTruthy();
      expect(compiled.querySelector(".spinner-foreground")).toBeTruthy();
    });

    it("should have three pulse dots", () => {
      const pulseDots = compiled.querySelectorAll(".pulse-dot");
      expect(pulseDots.length).toBe(3);
    });

    it("should have primary, accent and secondary pulse dots", () => {
      expect(compiled.querySelector(".dot-primary")).toBeTruthy();
      expect(compiled.querySelector(".dot-accent")).toBeTruthy();
      expect(compiled.querySelector(".dot-secondary")).toBeTruthy();
    });

    it("should not render a subtitle element", () => {
      expect(compiled.querySelector(".loading-subtitle")).toBeFalsy();
    });
  });

  describe("overlay mode styles", () => {
    it("should be fixed and full viewport", () => {
      const overlay = compiled.querySelector(".loading-overlay") as HTMLElement;
      const style = window.getComputedStyle(overlay);
      expect(style.position).toBe("fixed");
      expect(style.top).toBe("0px");
      expect(style.left).toBe("0px");
      expect(style.right).toBe("0px");
      expect(style.bottom).toBe("0px");
    });

    it("should have z-index 1000", () => {
      const overlay = compiled.querySelector(".loading-overlay") as HTMLElement;
      expect(window.getComputedStyle(overlay).zIndex).toBe("1000");
    });

    it("should be centred with flexbox", () => {
      const overlay = compiled.querySelector(".loading-overlay") as HTMLElement;
      const style = window.getComputedStyle(overlay);
      expect(style.display).toBe("flex");
      expect(style.alignItems).toBe("center");
      expect(style.justifyContent).toBe("center");
    });
  });
});
