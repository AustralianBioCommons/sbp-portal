import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ExampleOutputComponent } from "./example-output.component";

describe("ExampleOutputComponent", () => {
  let fixture: ComponentFixture<ExampleOutputComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleOutputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExampleOutputComponent);
    fixture.componentRef.setInput("heading", "Predicted 3D Structure");
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it("should only let a collapsible explanation be closed, keeping focus on its controls", async () => {
    expect(element.querySelector("button")).toBeNull();

    fixture.componentRef.setInput("collapsible", true);
    fixture.detectChanges();
    const panel = element.querySelector('[role="region"]') as HTMLElement;
    const close = element.querySelector(
      '[aria-label="Hide explanation"]'
    ) as HTMLButtonElement;

    close.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const open = element.querySelector(
      '[aria-expanded="false"]'
    ) as HTMLButtonElement;
    expect(panel.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(open);

    open.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel.hasAttribute("inert")).toBe(false);
    expect(element.querySelector('[aria-expanded="false"]')).toBeNull();
    expect(document.activeElement).toBe(close);
  });

  it("should show a placeholder until an image is set", () => {
    const placeholder = 'ng-icon[name="heroPhoto"]';
    expect(element.querySelector("img")).toBeNull();
    expect(element.querySelector(placeholder)).not.toBeNull();

    fixture.componentRef.setInput("image", {
      src: "assets/example.png",
      alt: "Example structure",
      width: 800,
      height: 600,
    });
    fixture.detectChanges();

    expect(element.querySelector("img")?.getAttribute("alt")).toBe(
      "Example structure"
    );
    expect(element.querySelector(placeholder)).toBeNull();
  });
});
