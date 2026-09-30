import { formatToolName } from "./job-tool.utils";

describe("formatToolName", () => {
  it("normalizes known tools regardless of source casing", () => {
    expect(formatToolName("rfdiffusion")).toBe("RFdiffusion");
    expect(formatToolName("RFDiffusion")).toBe("RFdiffusion");
    expect(formatToolName("bindcraft")).toBe("BindCraft");
    expect(formatToolName("Bindcraft")).toBe("BindCraft");
    expect(formatToolName("colabfold")).toBe("ColabFold");
    expect(formatToolName("Colabfold")).toBe("ColabFold");
    expect(formatToolName("alphafold2")).toBe("AlphaFold2");
    expect(formatToolName("boltz")).toBe("Boltz");
  });

  it("passes unknown values through unchanged", () => {
    expect(formatToolName("")).toBe("");
    expect(formatToolName("Some Other Tool")).toBe("Some Other Tool");
  });
});
