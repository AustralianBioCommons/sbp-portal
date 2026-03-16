import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { JobsActionMenuComponent } from "./jobs-action-menu.component";

describe("JobsActionMenuComponent", () => {
  let component: JobsActionMenuComponent;
  let fixture: ComponentFixture<JobsActionMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsActionMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JobsActionMenuComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("menuStyle", { left: "12px", top: "24px" });
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should apply the provided overlay style", () => {
    const menuElement = fixture.nativeElement.querySelector("div.fixed") as HTMLDivElement;

    expect(menuElement.style.left).toBe("12px");
    expect(menuElement.style.top).toBe("24px");
  });

  it("should emit actions when buttons are clicked", () => {
    spyOn(component.viewRequested, "emit");
    spyOn(component.cancelRequested, "emit");
    spyOn(component.deleteRequested, "emit");

    const buttons = fixture.debugElement.queryAll(By.css("button"));
    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();
    buttons[2].nativeElement.click();

    expect(component.viewRequested.emit).toHaveBeenCalled();
    expect(component.cancelRequested.emit).toHaveBeenCalled();
    expect(component.deleteRequested.emit).toHaveBeenCalled();
  });

  it("should disable stop and delete actions when configured", () => {
    fixture.componentRef.setInput("cancelDisabled", true);
    fixture.componentRef.setInput("deleteDisabled", true);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css("button"));

    expect(buttons[1].nativeElement.disabled).toBeTrue();
    expect(buttons[2].nativeElement.disabled).toBeTrue();
  });
});
