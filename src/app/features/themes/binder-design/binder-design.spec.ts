import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { By } from "@angular/platform-browser";
import { RouterLink } from "@angular/router";

import { BinderDesignComponent } from "./binder-design";

describe("BinderDesignComponent", () => {
  let component: BinderDesignComponent;
  let fixture: ComponentFixture<BinderDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BinderDesignComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BinderDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("workflows", () => {
    it("should have correct workflow structure", () => {
      expect(component.workflows()).toBeDefined();
      expect(component.workflows().length).toBe(3);
    });

    it("workflows should contain de novo design workflow", () => {
      const deNovoWorkflow = component
        .workflows()
        .find((w) => w.id === "de-novo-design");
      expect(deNovoWorkflow).toBeDefined();
      expect(deNovoWorkflow?.label).toBe("De Novo Design");
      expect(deNovoWorkflow?.href).toBe("/binder-design/de-novo-design");
    });

    it("should contain disabled partial diffusion and motif scaffolding workflows", () => {
      const partial = component
        .workflows()
        .find((w) => w.id === "partial-diffusion");
      expect(partial?.label).toBe("Partial Diffusion");
      expect(partial?.disabled).toBeTrue();
      expect(partial?.tools.map((t) => t.id)).toEqual(["rfdiffusion"]);

      const motif = component
        .workflows()
        .find((w) => w.id === "motif-scaffolding");
      expect(motif?.label).toBe("Motif Scaffolding");
      expect(motif?.disabled).toBeTrue();
      expect(motif?.tools.map((t) => t.id)).toEqual(["rfdiffusion"]);
    });

    it("should have all workflows with required properties", () => {
      component.workflows().forEach((workflow) => {
        expect(workflow.id).toBeDefined();
        expect(workflow.id).not.toBe("");
        expect(workflow.label).toBeDefined();
        expect(workflow.label).not.toBe("");
        expect(workflow.href).toBeDefined();
        expect(workflow.href).not.toBe("");
      });
    });
  });

  describe("tools", () => {
    const deNovoTools = () =>
      component.workflows().find((w) => w.id === "de-novo-design")?.tools ?? [];

    it("de novo design workflow should have correct tools structure", () => {
      expect(deNovoTools().length).toBe(2);
    });

    it("tools should contain BindCraft tool", () => {
      const bindCraftTool = deNovoTools().find((t) => t.label === "BindCraft");
      expect(bindCraftTool).toBeDefined();
      expect(bindCraftTool?.id).toBe("bindcraft");
      expect(bindCraftTool?.href).toBe("/binder-design/de-novo-design");
    });

    it("tools should contain RFdiffusion tool", () => {
      const rfdiffusionTool = deNovoTools().find(
        (t) => t.label === "RFdiffusion"
      );
      expect(rfdiffusionTool).toBeDefined();
      expect(rfdiffusionTool?.id).toBe("rfdiffusion");
      expect(rfdiffusionTool?.href).toBe("/binder-design/de-novo-design");
      expect(rfdiffusionTool?.disabled).toBeFalsy();
    });

    it("should have all tools with required properties", () => {
      deNovoTools().forEach((tool) => {
        expect(tool.id).toBeDefined();
        expect(tool.id).not.toBe("");
        expect(tool.label).toBeDefined();
        expect(tool.label).not.toBe("");
      });
    });

    it("should have unique tool IDs", () => {
      const ids = deNovoTools().map((tool) => tool.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe("data validation", () => {
    it("should have consistent data structures", () => {
      component.workflows().forEach((workflow) => {
        expect(typeof workflow.id).toBe("string");
        expect(typeof workflow.label).toBe("string");

        workflow.tools.forEach((tool) => {
          expect(typeof tool.id).toBe("string");
          expect(typeof tool.label).toBe("string");
        });
      });
    });

    it("should have proper data types", () => {
      expect(Array.isArray(component.workflows())).toBe(true);
    });
  });

  describe("link rendering", () => {
    it("should render an enabled card linking to the workflow", () => {
      const hrefs = fixture.debugElement
        .queryAll(By.directive(RouterLink))
        .map((link) => link.nativeElement.getAttribute("href"));

      expect(hrefs).toContain("/binder-design/de-novo-design");
    });

    it("should render workflow tools as badges", () => {
      const badgeTexts = fixture.debugElement
        .queryAll(By.css("li span"))
        .map((el) => el.nativeElement.textContent.trim());

      expect(badgeTexts).toContain("BindCraft");
      expect(badgeTexts).toContain("RFdiffusion");
    });
  });
});
