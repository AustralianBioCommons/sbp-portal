import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DeNovoDesignExampleOutputComponent } from "./de-novo-design-example-output.component";

describe("DeNovoDesignExampleOutputComponent", () => {
  let fixture: ComponentFixture<DeNovoDesignExampleOutputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeNovoDesignExampleOutputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeNovoDesignExampleOutputComponent);
    fixture.detectChanges();
  });

  it("keeps example downloads disabled until files are available", () => {
    const element: HTMLElement = fixture.nativeElement;
    const buttons =
      element.querySelectorAll<HTMLButtonElement>("app-button button");

    expect(buttons.length).toBe(2);
    buttons.forEach((button) => expect(button.disabled).toBeTrue());
  });
});
