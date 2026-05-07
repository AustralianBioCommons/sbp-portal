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
      expect(component.message()).toBe("Loading...");
    });

    it("should default inline to false", () => {
      expect(component.inline()).toBe(false);
    });
  });

  describe("message input", () => {
    it("should display default message", () => {
      const messageEl = compiled.querySelector("p");
      expect(messageEl?.textContent?.trim()).toBe("Loading...");
    });

    it("should display custom message", () => {
      fixture.componentRef.setInput("message", "Loading report...");
      fixture.detectChanges();
      const messageEl = compiled.querySelector("p");
      expect(messageEl?.textContent?.trim()).toBe("Loading report...");
    });

    it("should update displayed message when input changes", () => {
      fixture.componentRef.setInput("message", "Loading files...");
      fixture.detectChanges();
      expect(compiled.querySelector("p")?.textContent?.trim()).toBe("Loading files...");

      fixture.componentRef.setInput("message", "Loading logs...");
      fixture.detectChanges();
      expect(compiled.querySelector("p")?.textContent?.trim()).toBe("Loading logs...");
    });
  });

  describe("inline input", () => {
    it("should render overlay by default (inline = false)", () => {
      const wrapper = compiled.querySelector("div") as HTMLElement;
      expect(wrapper.classList.contains("fixed")).toBeTrue();
      expect(wrapper.classList.contains("p-4")).toBeFalse();
    });

    it("should use Tailwind inline classes when inline is true", () => {
      fixture.componentRef.setInput("inline", true);
      fixture.detectChanges();
      const wrapper = compiled.querySelector("div") as HTMLElement;
      expect(wrapper.classList.contains("flex")).toBeTrue();
      expect(wrapper.classList.contains("items-center")).toBeTrue();
      expect(wrapper.classList.contains("justify-center")).toBeTrue();
      expect(wrapper.classList.contains("p-4")).toBeTrue();
      expect(wrapper.classList.contains("fixed")).toBeFalse();
    });

    it("should switch back to overlay when inline is set to false", () => {
      fixture.componentRef.setInput("inline", true);
      fixture.detectChanges();
      fixture.componentRef.setInput("inline", false);
      fixture.detectChanges();
      const wrapper = compiled.querySelector("div") as HTMLElement;
      expect(wrapper.classList.contains("fixed")).toBeTrue();
      expect(wrapper.classList.contains("p-4")).toBeFalse();
    });
  });

  describe("spinner elements", () => {
    it("should render spinner background and foreground", () => {
      expect(compiled.querySelector(".border-gray-100")).toBeTruthy();
      expect(compiled.querySelector(".animate-spin")).toBeTruthy();
    });

    it("should have three pulse dots", () => {
      const pulseDots = compiled.querySelectorAll(".animate-pulse");
      expect(pulseDots.length).toBe(3);
    });

    it("should have primary, accent and secondary pulse dots", () => {
      expect(compiled.querySelector(".bg-pink-500.animate-pulse")).toBeTruthy();
      expect(compiled.querySelector(".bg-orange-500.animate-pulse")).toBeTruthy();
      expect(compiled.querySelector(".bg-blue-500.animate-pulse")).toBeTruthy();
    });

    it("should not render a subtitle element", () => {
      expect(compiled.querySelector(".loading-subtitle")).toBeFalsy();
    });
  });

  describe("overlay mode styles", () => {
    it("should be fixed and full viewport", () => {
      const overlay = compiled.querySelector("div") as HTMLElement;
      expect(overlay.classList.contains("fixed")).toBeTrue();
      expect(overlay.classList.contains("inset-0")).toBeTrue();
    });

    it("should have z-index 1000", () => {
      const overlay = compiled.querySelector("div") as HTMLElement;
      expect(overlay.classList.contains("z-1000")).toBeTrue();
    });

    it("should be centred with flexbox", () => {
      const overlay = compiled.querySelector("div") as HTMLElement;
      expect(overlay.classList.contains("flex")).toBeTrue();
      expect(overlay.classList.contains("items-center")).toBeTrue();
      expect(overlay.classList.contains("justify-center")).toBeTrue();
    });
  });
});
