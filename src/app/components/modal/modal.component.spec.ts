import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ModalComponent } from "./modal.component";

@Component({
  imports: [ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [dismissible]="dismissible"
      [ariaLabelledby]="ariaLabelledby"
      panelClass="w-full max-w-3xl"
      (dismissed)="dismissed = dismissed + 1"
    >
      <div modalHeader><h2 id="host-title">Header</h2></div>
      <div modalBody><p>Body content</p></div>
      <div modalActions><button type="button">Action</button></div>
    </app-modal>
  `,
})
class HostComponent {
  isOpen = false;
  dismissible = true;
  ariaLabelledby: string | null = "host-title";
  dismissed = 0;
}

describe("ModalComponent", () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const getDialog = (): HTMLDialogElement =>
    fixture.nativeElement.querySelector("dialog");

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    host.isOpen = false;
    fixture.detectChanges();
    fixture.destroy();
  });

  it("should create and project all slots", () => {
    expect(getDialog()).toBeTruthy();
    expect(fixture.nativeElement.querySelector("#host-title")).toBeTruthy();
    expect(fixture.nativeElement.querySelector("p")?.textContent).toContain(
      "Body content"
    );
    expect(
      fixture.nativeElement.querySelector("[modalActions] button")
    ).toBeTruthy();
  });

  it("should open and lock body scroll when isOpen becomes true", () => {
    host.isOpen = true;
    fixture.detectChanges();

    expect(getDialog().open).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("should close and release the scroll lock when isOpen becomes false", () => {
    host.isOpen = true;
    fixture.detectChanges();
    host.isOpen = false;
    fixture.detectChanges();

    expect(getDialog().open).toBe(false);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("should reflect the panelClass and aria-labelledby inputs on the dialog", () => {
    expect(getDialog().className).toContain("max-w-3xl");
    expect(getDialog().getAttribute("aria-labelledby")).toBe("host-title");
  });

  it("should emit dismissed on backdrop click", () => {
    host.isOpen = true;
    fixture.detectChanges();

    getDialog().dispatchEvent(new MouseEvent("click"));

    expect(host.dismissed).toBe(1);
  });

  it("should not emit dismissed when projected content is clicked", () => {
    host.isOpen = true;
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector("p")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.dismissed).toBe(0);
  });

  it("should emit dismissed and prevent default on the Escape (cancel) event", () => {
    host.isOpen = true;
    fixture.detectChanges();

    const event = new Event("cancel", { cancelable: true });
    getDialog().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(host.dismissed).toBe(1);
  });

  it("should not dismiss while not dismissible", () => {
    host.isOpen = true;
    host.dismissible = false;
    fixture.detectChanges();

    getDialog().dispatchEvent(new MouseEvent("click"));
    getDialog().dispatchEvent(new Event("cancel", { cancelable: true }));

    expect(host.dismissed).toBe(0);
  });

  it("should omit aria-labelledby when null", () => {
    host.ariaLabelledby = null;
    fixture.detectChanges();

    expect(getDialog().getAttribute("aria-labelledby")).toBeNull();
  });
});
