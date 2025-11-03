import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";

import { BinderDesignComponent } from "./binder-design";

describe("BinderDesignComponent", () => {
  let component: BinderDesignComponent;
  let fixture: ComponentFixture<BinderDesignComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj("Router", ["navigate"]);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [BinderDesignComponent],
      providers: [{ provide: Router, useValue: mockRouter }]
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
      expect(component.workflows).toBeDefined();
      expect(component.workflows.length).toBe(3);
    });

    it('workflows should contain de novo design workflow as default active', () => {
    const deNovoWorkflow = component.workflows.find(w => w.id === 'de-novo-design');
    expect(deNovoWorkflow).toBeDefined();
    expect(deNovoWorkflow?.active).toBe(true);
    expect(deNovoWorkflow?.href).toBe('/workflow/de-novo-design');
  });

  it('workflows should contain motif scaffolding workflow as inactive', () => {
    const motifWorkflow = component.workflows.find(w => w.id === 'motif-scaffolding');
    expect(motifWorkflow).toBeDefined();
    expect(motifWorkflow?.active).toBe(false);
    expect(motifWorkflow?.href).toBe('/workflow/motif-scaffolding');
  });

  it('workflows should contain partial diffusion workflow as inactive', () => {
    const partialWorkflow = component.workflows.find(w => w.id === 'partial-diffusion');
    expect(partialWorkflow).toBeDefined();
    expect(partialWorkflow?.active).toBe(false);
    expect(partialWorkflow?.href).toBe('/workflow/partial-diffusion');
  });

    it("should have all workflows with required properties", () => {
      component.workflows.forEach((workflow) => {
        expect(workflow.id).toBeDefined();
        expect(workflow.id).not.toBe("");
        expect(workflow.label).toBeDefined();
        expect(workflow.label).not.toBe("");
        expect(workflow.href).toBeDefined();
        expect(workflow.href).not.toBe("");
        expect(workflow.active).toBeDefined();
      });
    });
  });

  describe("tools", () => {
  it('tools should have correct tools structure', () => {
    expect(component.tools).toBeDefined();
    expect(component.tools.length).toBe(3);
  });

  it('tools should contain BindCraft tool as default active', () => {
    const bindCraftTool = component.tools.find(t => t.label === 'BindCraft');
    expect(bindCraftTool).toBeDefined();
    expect(bindCraftTool?.label).toBe('BindCraft');
    expect(bindCraftTool?.active).toBe(true);
  });

  it('tools should contain RFdiffusion tool', () => {
    const rfdiffusionTool = component.tools.find(t => t.label === 'RFdiffusion');
    expect(rfdiffusionTool).toBeDefined();
    expect(rfdiffusionTool?.label).toBe('RFdiffusion');
    expect(rfdiffusionTool?.active).toBe(false);
  });

  it('tools should contain BoltzGen tool', () => {
    const boltzGenTool = component.tools.find(t => t.label === 'BoltzGen');
    expect(boltzGenTool).toBeDefined();
    expect(boltzGenTool?.label).toBe('BoltzGen');
    expect(boltzGenTool?.active).toBe(false);
  });    it("should have all tools with required properties", () => {
      component.tools.forEach((tool) => {
        expect(tool.id).toBeDefined();
        expect(tool.id).not.toBe("");
        expect(tool.label).toBeDefined();
        expect(tool.label).not.toBe("");
      });
    });

    it("should have unique tool IDs", () => {
      const ids = component.tools.map((tool) => tool.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe("community resources", () => {
    it("should have correct community resources structure", () => {
      expect(component.communityResources).toBeDefined();
      expect(component.communityResources.length).toBe(4);
    });

    it("should contain documentation resource", () => {
      const docs = component.communityResources.find(
        (r) => r.title === "Documentation"
      );
      expect(docs).toBeDefined();
      expect(docs?.description).toContain("guides and tutorials");
    });

    it("should contain community forum resource", () => {
      const forum = component.communityResources.find(
        (r) => r.title === "Community Forum"
      );
      expect(forum).toBeDefined();
      expect(forum?.description).toContain("Connect with other researchers");
    });

    it("should contain best practices resource", () => {
      const practices = component.communityResources.find(
        (r) => r.title === "Best Practices"
      );
      expect(practices).toBeDefined();
      expect(practices?.description).toContain("protocols and methodologies");
    });

    it("should contain publication repository resource", () => {
      const publications = component.communityResources.find(
        (r) => r.title === "Publication Repository"
      );
      expect(publications).toBeDefined();
      expect(publications?.description).toContain("research papers");
    });

    it("should have all resources with required properties", () => {
      component.communityResources.forEach((resource) => {
        expect(resource.title).toBeDefined();
        expect(resource.title).not.toBe("");
        expect(resource.description).toBeDefined();
        expect(resource.description).not.toBe("");
      });
    });

    it("should have unique resource titles", () => {
      const titles = component.communityResources.map(
        (resource) => resource.title
      );
      const uniqueTitles = [...new Set(titles)];
      expect(titles.length).toBe(uniqueTitles.length);
    });
  });

  describe("data validation", () => {
    it("should have consistent data structures", () => {
      // Ensure all workflows have the same structure
      component.workflows.forEach((workflow) => {
        expect(typeof workflow.id).toBe("string");
        expect(typeof workflow.label).toBe("string");
      });

      // Ensure all tools have the same structure
      component.tools.forEach((tool) => {
        expect(typeof tool.id).toBe("string");
        expect(typeof tool.label).toBe("string");
      });

      // Ensure all community resources have the same structure
      component.communityResources.forEach((resource) => {
        expect(typeof resource.title).toBe("string");
        expect(typeof resource.description).toBe("string");
      });
    });

    it("should have proper data types", () => {
      expect(Array.isArray(component.workflows)).toBe(true);
      expect(Array.isArray(component.tools)).toBe(true);
      expect(Array.isArray(component.communityResources)).toBe(true);
    });
  });

  describe("navigation methods", () => {
    beforeEach(() => {
      spyOn(console, "log");
    });

    describe("navigateToWorkflow", () => {
      it("should update workflow active state and navigate", () => {
        const workflowId = "motif-scaffolding";

        component.navigateToWorkflow(workflowId);

        // Check that active states are updated
        const activeWorkflow = component.workflows.find((w) => w.active);
        expect(activeWorkflow?.id).toBe(workflowId);

        // Check that previously active workflow is now inactive
        const deNovoDesign = component.workflows.find(
          (w) => w.id === "de-novo-design"
        );
        expect(deNovoDesign?.active).toBe(false);

        // Check router navigation was called
        expect(mockRouter.navigate).toHaveBeenCalledWith([
          "/workflow",
          workflowId
        ]);

        // Check console log
        expect(console.log).toHaveBeenCalledWith(
          `Navigating to workflow: ${workflowId}`
        );
      });

      it("should handle navigation to each workflow", () => {
        const workflowIds = [
          "de-novo-design",
          "motif-scaffolding",
          "partial-diffusion"
        ];

        workflowIds.forEach((workflowId) => {
          component.navigateToWorkflow(workflowId);

          const activeWorkflow = component.workflows.find((w) => w.active);
          expect(activeWorkflow?.id).toBe(workflowId);
          expect(mockRouter.navigate).toHaveBeenCalledWith([
            "/workflow",
            workflowId
          ]);
        });

        expect(mockRouter.navigate).toHaveBeenCalledTimes(workflowIds.length);
      });
    });

    describe("navigateToTool", () => {
      it("should update tool active state and navigate", () => {
        const toolId = "rfdiffusion";

        component.navigateToTool(toolId);

        // Check that active states are updated
        const activeTool = component.tools.find((t) => t.active);
        expect(activeTool?.id).toBe(toolId);

        // Check that previously active tool is now inactive
        const bindcraft = component.tools.find((t) => t.id === "bindcraft");
        expect(bindcraft?.active).toBe(false);

        // Check router navigation was called
        expect(mockRouter.navigate).toHaveBeenCalledWith(["/tools", toolId]);

        // Check console log
        expect(console.log).toHaveBeenCalledWith(
          `Navigating to tool: ${toolId}`
        );
      });

      it("should handle navigation to each tool", () => {
        const toolIds = ["bindcraft", "rfdiffusion", "boltzgen"];

        toolIds.forEach((toolId) => {
          component.navigateToTool(toolId);

          const activeTool = component.tools.find((t) => t.active);
          expect(activeTool?.id).toBe(toolId);
          expect(mockRouter.navigate).toHaveBeenCalledWith(["/tools", toolId]);
        });

        expect(mockRouter.navigate).toHaveBeenCalledTimes(toolIds.length);
      });
    });

    describe("navigateToResource", () => {
      it("should log navigation to resource", () => {
        const href = "/docs";

        component.navigateToResource(href);

        expect(console.log).toHaveBeenCalledWith(
          `Navigating to resource: ${href}`
        );
      });

      it("should handle navigation to each resource", () => {
        const hrefs = ["/docs", "/forum", "/best-practices", "/publications"];

        hrefs.forEach((href) => {
          component.navigateToResource(href);
          expect(console.log).toHaveBeenCalledWith(
            `Navigating to resource: ${href}`
          );
        });

        expect(console.log).toHaveBeenCalledTimes(hrefs.length);
      });
    });
  });
});