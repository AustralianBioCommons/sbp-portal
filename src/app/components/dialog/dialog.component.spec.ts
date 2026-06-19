import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DialogComponent } from "./dialog.component";

describe("DialogComponent", () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;

  const getDialog = (): HTMLDialogElement =>
    fixture.nativeElement.querySelector("dialog");

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Closing restores the body scroll lock the effect applied while open.
    fixture.componentRef.setInput("isOpen", false);
    fixture.detectChanges();
    fixture.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should not open the dialog when isOpen is false", () => {
    fixture.componentRef.setInput("isOpen", false);
    fixture.detectChanges();

    expect(getDialog().open).toBe(false);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("should open the dialog and lock body scroll when isOpen is true", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.componentRef.setInput("title", "Test Title");
    fixture.componentRef.setInput("message", "Test Message");
    fixture.detectChanges();

    expect(getDialog().open).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    const titleElement = fixture.nativeElement.querySelector("#dialog-title");
    expect(titleElement?.textContent?.trim()).toBe("Test Title");

    const messageElement = fixture.nativeElement.querySelector("p");
    expect(messageElement?.textContent?.trim()).toBe("Test Message");
  });

  it("should emit confirmed and closed when onConfirm is called", () => {
    spyOn(component.confirmed, "emit");
    spyOn(component.closed, "emit");

    component.onConfirm();

    expect(component.confirmed.emit).toHaveBeenCalled();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it("should emit cancelled and closed when onCancel is called", () => {
    spyOn(component.cancelled, "emit");
    spyOn(component.closed, "emit");

    component.onCancel();

    expect(component.cancelled.emit).toHaveBeenCalled();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it("should call onCancel when the backdrop (dialog element) is clicked", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.detectChanges();
    spyOn(component, "onCancel");

    const dialog = getDialog();
    dialog.dispatchEvent(new MouseEvent("click"));

    expect(component.onCancel).toHaveBeenCalled();
  });

  it("should not call onCancel when dialog content is clicked", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.detectChanges();
    spyOn(component, "onCancel");

    const content = fixture.nativeElement.querySelector("p");
    content.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(component.onCancel).not.toHaveBeenCalled();
  });

  it("should not dismiss on backdrop click while loading", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.componentRef.setInput("loading", true);
    fixture.detectChanges();
    spyOn(component, "onCancel");

    getDialog().dispatchEvent(new MouseEvent("click"));

    expect(component.onCancel).not.toHaveBeenCalled();
  });

  it("should cancel and prevent default on the native cancel (Escape) event", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.detectChanges();
    spyOn(component, "onCancel");

    const event = new Event("cancel", { cancelable: true });
    getDialog().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(component.onCancel).toHaveBeenCalled();
  });

  it("should not dismiss on the native cancel event while loading", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.componentRef.setInput("loading", true);
    fixture.detectChanges();
    spyOn(component, "onCancel");

    getDialog().dispatchEvent(new Event("cancel", { cancelable: true }));

    expect(component.onCancel).not.toHaveBeenCalled();
  });

  it("should display custom button texts", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.componentRef.setInput("confirmText", "Yes");
    fixture.componentRef.setInput("cancelText", "No");
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll("app-button");
    expect(buttons.length).toBe(2);
  });

  it("should show the warning icon only for the danger variant", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector("ng-icon")).toBeFalsy();

    fixture.componentRef.setInput("variant", "danger");
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector("ng-icon")).toBeTruthy();
  });

  it("should set aria-labelledby on the dialog when a title is provided", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.componentRef.setInput("title", "Test Title");
    fixture.detectChanges();

    expect(getDialog().getAttribute("aria-labelledby")).toBe("dialog-title");
  });

  it("should not set aria-labelledby when title is empty", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.componentRef.setInput("title", "");
    fixture.detectChanges();

    expect(getDialog().getAttribute("aria-labelledby")).toBeNull();
  });
});
