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
      expect(component.workflows().length).toBe(1);
    });

    it("workflows should contain de novo design workflow", () => {
      const deNovoWorkflow = component
        .workflows()
        .find((w) => w.id === "de-novo-design");
      expect(deNovoWorkflow).toBeDefined();
      expect(deNovoWorkflow?.label).toBe("De Novo Design");
      expect(deNovoWorkflow?.href).toBe("/binder-design/de-novo-design");
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
    it("tools should have correct tools structure", () => {
      expect(component.tools()).toBeDefined();
      expect(component.tools().length).toBe(2);
    });

    it("tools should contain BindCraft tool", () => {
      const bindCraftTool = component
        .tools()
        .find((t) => t.label === "BindCraft");
      expect(bindCraftTool).toBeDefined();
      expect(bindCraftTool?.id).toBe("bindcraft");
      expect(bindCraftTool?.href).toBe("/binder-design/de-novo-design");
    });

    it("tools should contain RFdiffusion tool", () => {
      const rfdiffusionTool = component
        .tools()
        .find((t) => t.label === "RFdiffusion");
      expect(rfdiffusionTool).toBeDefined();
      expect(rfdiffusionTool?.id).toBe("rfdiffusion");
      expect(rfdiffusionTool?.href).toBe("/tools/rfdiffusion");
      expect(rfdiffusionTool?.disabled).toBeTrue();
    });

    it("should have all tools with required properties", () => {
      component.tools().forEach((tool) => {
        expect(tool.id).toBeDefined();
        expect(tool.id).not.toBe("");
        expect(tool.label).toBeDefined();
        expect(tool.label).not.toBe("");
      });
    });

    it("should have unique tool IDs", () => {
      const ids = component.tools().map((tool) => tool.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe("community resources", () => {
    it("should have correct community resources structure", () => {
      expect(component.communityResources()).toBeDefined();
      expect(component.communityResources().length).toBe(4);
    });

    it("should contain documentation resource", () => {
      const docs = component
        .communityResources()
        .find((r) => r.title === "Documentation");
      expect(docs).toBeDefined();
      expect(docs?.description).toContain("guides and tutorials");
    });

    it("should contain community forum resource", () => {
      const forum = component
        .communityResources()
        .find((r) => r.title === "Community Forum");
      expect(forum).toBeDefined();
      expect(forum?.description).toContain("Connect with other researchers");
    });

    it("should contain best practices resource", () => {
      const practices = component
        .communityResources()
        .find((r) => r.title === "Best Practices");
      expect(practices).toBeDefined();
      expect(practices?.description).toContain("protocols and methodologies");
    });

    it("should contain publication repository resource", () => {
      const publications = component
        .communityResources()
        .find((r) => r.title === "Publication Repository");
      expect(publications).toBeDefined();
      expect(publications?.description).toContain("research papers");
    });

    it("should have all resources with required properties", () => {
      component.communityResources().forEach((resource) => {
        expect(resource.title).toBeDefined();
        expect(resource.title).not.toBe("");
        expect(resource.description).toBeDefined();
        expect(resource.description).not.toBe("");
      });
    });

    it("should have unique resource titles", () => {
      const titles = component
        .communityResources()
        .map((resource) => resource.title);
      const uniqueTitles = [...new Set(titles)];
      expect(titles.length).toBe(uniqueTitles.length);
    });
  });

  describe("data validation", () => {
    it("should have consistent data structures", () => {
      component.workflows().forEach((workflow) => {
        expect(typeof workflow.id).toBe("string");
        expect(typeof workflow.label).toBe("string");
      });

      component.tools().forEach((tool) => {
        expect(typeof tool.id).toBe("string");
        expect(typeof tool.label).toBe("string");
      });

      component.communityResources().forEach((resource) => {
        expect(typeof resource.title).toBe("string");
        expect(typeof resource.description).toBe("string");
      });
    });

    it("should have proper data types", () => {
      expect(Array.isArray(component.workflows())).toBe(true);
      expect(Array.isArray(component.tools())).toBe(true);
      expect(Array.isArray(component.communityResources())).toBe(true);
    });
  });

  describe("link rendering", () => {
    it("should render enabled workflows and tools as routerLink anchors", () => {
      const linkTexts = fixture.debugElement
        .queryAll(By.directive(RouterLink))
        .map((link) => link.nativeElement.textContent.trim());

      expect(linkTexts).toContain("De Novo Design");
      expect(linkTexts).toContain("BindCraft");
    });

    it("should render disabled workflows and tools as non-clickable spans", () => {
      const disabledText = fixture.debugElement
        .queryAll(By.css("span.cursor-not-allowed"))
        .map((el) => el.nativeElement.textContent.trim());
      const linkTexts = fixture.debugElement
        .queryAll(By.directive(RouterLink))
        .map((link) => link.nativeElement.textContent.trim());

      ["RFdiffusion"].forEach((label) => {
        expect(disabledText).toContain(label);
        expect(linkTexts).not.toContain(label);
      });
    });
  });
});
