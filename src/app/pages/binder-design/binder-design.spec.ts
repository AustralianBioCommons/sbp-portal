import { ComponentFixture, TestBed } from "@angular/core/testing";

import { BinderDesignComponent } from "./binder-design";

describe("BinderDesignComponent", () => {
  let component: BinderDesignComponent;
  let fixture: ComponentFixture<BinderDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BinderDesignComponent],
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

    it("should contain de novo design workflow as default active", () => {
      const deNovoDesign = component.workflows.find(
        (w) => w.id === "de-novo-design"
      );
      expect(deNovoDesign).toBeDefined();
      expect(deNovoDesign?.label).toBe("De Novo Design");
      expect(deNovoDesign?.active).toBe(true);
      expect(deNovoDesign?.href).toBe("/workflows/de-novo-design");
    });

    it("should contain motif scaffolding workflow as inactive", () => {
      const motifScaffolding = component.workflows.find(
        (w) => w.id === "motif-scaffolding"
      );
      expect(motifScaffolding).toBeDefined();
      expect(motifScaffolding?.label).toBe("Motif Scaffolding");
      expect(motifScaffolding?.active).toBe(false);
      expect(motifScaffolding?.href).toBe("/workflows/motif-scaffolding");
    });

    it("should contain partial diffusion workflow as inactive", () => {
      const partialDiffusion = component.workflows.find(
        (w) => w.id === "partial-diffusion"
      );
      expect(partialDiffusion).toBeDefined();
      expect(partialDiffusion?.label).toBe("Partial Diffusion");
      expect(partialDiffusion?.active).toBe(false);
      expect(partialDiffusion?.href).toBe("/workflows/partial-diffusion");
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
    it("should have correct tools structure", () => {
      expect(component.tools).toBeDefined();
      expect(component.tools.length).toBe(4);
    });

    it("should contain AlphaFold tool", () => {
      const alphafold = component.tools.find((t) => t.id === "alphafold");
      expect(alphafold).toBeDefined();
      expect(alphafold?.label).toBe("AlphaFold");
    });

    it("should contain BindCraft tool", () => {
      const bindcraft = component.tools.find((t) => t.id === "bindcraft");
      expect(bindcraft).toBeDefined();
      expect(bindcraft?.label).toBe("BindCraft");
    });

    it("should contain ColabFold tool", () => {
      const colabfold = component.tools.find((t) => t.id === "colabfold");
      expect(colabfold).toBeDefined();
      expect(colabfold?.label).toBe("ColabFold");
    });

    it("should contain RosettaFold tool", () => {
      const rosettafold = component.tools.find((t) => t.id === "rosettafold");
      expect(rosettafold).toBeDefined();
      expect(rosettafold?.label).toBe("RosettaFold");
    });

    it("should have all tools with required properties", () => {
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
      const titles = component.communityResources.map((resource) => resource.title);
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
});