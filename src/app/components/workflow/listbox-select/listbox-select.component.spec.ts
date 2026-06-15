import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import {
  ListboxSelectComponent,
  ListboxSelectOption,
} from "./listbox-select.component";

describe("ListboxSelectComponent", () => {
  let component: ListboxSelectComponent;
  let fixture: ComponentFixture<ListboxSelectComponent>;

  const options: ListboxSelectOption[] = [
    { value: "protein", label: "Protein" },
    { value: "dna", label: "DNA" },
    { value: "rna", label: "RNA" },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListboxSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListboxSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("inputId", "test-listbox");
    fixture.componentRef.setInput("options", options);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should derive menu id from input id", () => {
    expect(component.menuId).toBe("test-listbox-menu");
  });

  it("should show placeholder when no value is selected", () => {
    fixture.componentRef.setInput("placeholder", "Pick a type");
    fixture.componentRef.setInput("value", "");
    fixture.detectChanges();

    expect(component.selectedLabel).toBe("Pick a type");
    expect(fixture.nativeElement.textContent).toContain("Pick a type");
  });

  it("should show the selected option label when value matches", () => {
    fixture.componentRef.setInput("value", "dna");
    fixture.detectChanges();

    expect(component.selectedLabel).toBe("DNA");
    expect(fixture.nativeElement.textContent).toContain("DNA");
  });

  it("should apply invalid styling to the trigger button", () => {
    fixture.componentRef.setInput("invalid", true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css("button"));
    expect(button.nativeElement.className).toContain("border-red-500");
  });

  it("should toggle the menu open and closed", () => {
    const trigger = fixture.debugElement.query(By.css("button"));

    trigger.nativeElement.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);
    expect(fixture.debugElement.query(By.css('[role="listbox"]'))).toBeTruthy();

    trigger.nativeElement.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
    expect(fixture.debugElement.query(By.css('[role="listbox"]'))).toBeFalsy();
  });

  it("should emit valueChange and blurred when an option is selected", () => {
    spyOn(component.valueChange, "emit");
    spyOn(component.blurred, "emit");
    component.isOpen.set(true);
    fixture.detectChanges();

    const optionButtons = fixture.debugElement.queryAll(
      By.css('[role="option"]')
    );
    optionButtons[1].nativeElement.click();

    expect(component.valueChange.emit).toHaveBeenCalledWith("dna");
    expect(component.blurred.emit).toHaveBeenCalled();
    expect(component.isOpen()).toBe(false);
  });

  it("should keep the menu open when focus stays inside the component", () => {
    spyOn(component.blurred, "emit");
    component.isOpen.set(true);
    fixture.detectChanges();

    const wrapper = fixture.debugElement.query(By.css("div.relative"))
      .nativeElement as HTMLElement;
    const trigger = fixture.debugElement.query(By.css("button"))
      .nativeElement as HTMLButtonElement;

    component.handleFocusOut({
      currentTarget: wrapper,
      relatedTarget: trigger,
    } as unknown as FocusEvent);

    expect(component.blurred.emit).not.toHaveBeenCalled();
    expect(component.isOpen()).toBe(true);
  });

  it("should emit blurred and close the menu when focus leaves the component", () => {
    spyOn(component.blurred, "emit");
    component.isOpen.set(true);

    component.handleFocusOut({
      currentTarget: document.createElement("div"),
      relatedTarget: null,
    } as unknown as FocusEvent);

    expect(component.blurred.emit).toHaveBeenCalled();
    expect(component.isOpen()).toBe(false);
  });
});
