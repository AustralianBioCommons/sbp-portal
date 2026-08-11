import {
  MAX_PAE_SIZE,
  ResidueRef,
  ResultFileRef,
  buildChainPairMatrix,
  buildChainSegments,
  buildResidueLookup,
  findChainwiseArtifact,
  findMetricArtifact,
  findMsaArtifact,
  findPaeArtifact,
  findStructureArtifact,
  parseChainPairScores,
  parseModelScore,
  parseMsaCoverage,
  parsePaeMatrix,
  residueIndicesToTokens,
  tokensToResidueIndices,
} from "./prediction-results.utils";

const file = (
  label: string,
  category = "stats_csv",
  key = `run-1/${label}`
): ResultFileRef => ({
  label,
  key,
  url: `https://s3.test/${key}?sig=1`,
  category,
});

describe("findStructureArtifact", () => {
  it("prefers mmCIF over PDB when a run emits both", () => {
    const artifact = findStructureArtifact([
      file("sample.pdb", "pdb"),
      file("sample.cif", "pdb"),
    ]);

    expect(artifact?.label).toBe("sample.cif");
    expect(artifact?.format).toBe("mmcif");
  });

  it("maps a .pdb file to the pdb format", () => {
    const artifact = findStructureArtifact([file("T1024.pdb", "pdb")]);

    expect(artifact?.format).toBe("pdb");
  });

  it("prefers a classified structure over a look-alike in another category", () => {
    const artifact = findStructureArtifact([
      file("uploaded_input.pdb", "settings"),
      file("prediction.pdb", "pdb"),
    ]);

    expect(artifact?.label).toBe("prediction.pdb");
  });

  it("returns null when no structure file is present", () => {
    expect(findStructureArtifact([file("report.html", "report")])).toBeNull();
  });
});

describe("findPaeArtifact", () => {
  it("matches the _pae_0.tsv naming", () => {
    expect(findPaeArtifact([file("T1024_pae_0.tsv")])?.label).toBe(
      "T1024_pae_0.tsv"
    );
  });

  it("matches the _0_pae.tsv naming", () => {
    expect(findPaeArtifact([file("T1024_0_pae.tsv")])?.label).toBe(
      "T1024_0_pae.tsv"
    );
  });

  it("picks model 0, which is the one in top_ranked_structures", () => {
    const artifact = findPaeArtifact([
      file("single-prediction-189aea08_3_pae.tsv"),
      file("single-prediction-189aea08_0_pae.tsv"),
      file("single-prediction-189aea08_1_pae.tsv"),
    ]);

    expect(artifact?.label).toBe("single-prediction-189aea08_0_pae.tsv");
  });

  it("falls back to another model index when model 0 is absent", () => {
    const artifact = findPaeArtifact([
      file("colab-560_2_pae.tsv"),
      file("colab-560_1_pae.tsv"),
    ]);

    expect(artifact?.label).toBe("colab-560_2_pae.tsv");
  });

  it("prefers an exact PAE suffix over a looser match", () => {
    const artifact = findPaeArtifact([
      file("summary_pae_stats.tsv"),
      file("T1024_0_pae.tsv"),
    ]);

    expect(artifact?.label).toBe("T1024_0_pae.tsv");
  });

  it("ignores non-TSV and non-PAE files", () => {
    expect(
      findPaeArtifact([file("T1024_pae_0.csv"), file("T1024_ptm.tsv")])
    ).toBeNull();
  });

  it("does not mistake ipSAE scores for a PAE matrix", () => {
    expect(
      findPaeArtifact([
        file("test-ubq52-real_ipsae.tsv"),
        file("test-ubq52-real_chainwise_ipsae.tsv"),
        file("test-ubq52-real_plddt.tsv"),
      ])
    ).toBeNull();
  });

  it("still finds the PAE matrix alongside ipSAE files", () => {
    const artifact = findPaeArtifact([
      file("test-ubq52-real_ipsae.tsv"),
      file("test-ubq52-real_0_pae.tsv"),
    ]);

    expect(artifact?.label).toBe("test-ubq52-real_0_pae.tsv");
  });
});

describe("findMetricArtifact", () => {
  it("finds the global pTM file", () => {
    expect(findMetricArtifact([file("T1024_ptm.tsv")], "ptm")?.label).toBe(
      "T1024_ptm.tsv"
    );
  });

  it("finds the global ipTM file", () => {
    expect(findMetricArtifact([file("T1024_iptm.tsv")], "iptm")?.label).toBe(
      "T1024_iptm.tsv"
    );
  });

  it("does not confuse ipTM for pTM", () => {
    expect(findMetricArtifact([file("T1024_iptm.tsv")], "ptm")).toBeNull();
  });

  it("ignores the per-chain-pair breakdowns", () => {
    expect(
      findMetricArtifact([file("T1024_chainwise_ptm.tsv")], "ptm")
    ).toBeNull();
    expect(
      findMetricArtifact([file("T1024_chainwise_iptm.tsv")], "iptm")
    ).toBeNull();
  });

  it("returns null when a monomer has no ipTM file", () => {
    expect(
      findMetricArtifact(
        [file("T1024_ptm.tsv"), file("T1024_plddt.tsv")],
        "iptm"
      )
    ).toBeNull();
  });
});

describe("parseModelScore", () => {
  it("reads the score for model 0", () => {
    expect(parseModelScore("0\t0.274\r\n")).toBe(0.274);
  });

  it("prefers model 0 over later models", () => {
    expect(parseModelScore("1\t0.5\n0\t0.9\n2\t0.1")).toBe(0.9);
  });

  it("falls back to the first row when there is no index", () => {
    expect(parseModelScore("0.42\n")).toBe(0.42);
  });

  it("returns null for empty or non-numeric content", () => {
    expect(parseModelScore("")).toBeNull();
    expect(parseModelScore("n/a\n")).toBeNull();
  });
});

describe("findMsaArtifact / findChainwiseArtifact", () => {
  it("finds the MSA matrix even with a tool name in the middle", () => {
    expect(findMsaArtifact([file("T1024_boltz_msa.tsv")])?.label).toBe(
      "T1024_boltz_msa.tsv"
    );
  });

  it("finds the chainwise ipSAE breakdown", () => {
    expect(
      findChainwiseArtifact([file("T1024_chainwise_ipsae.tsv")], "ipsae")?.label
    ).toBe("T1024_chainwise_ipsae.tsv");
  });

  it("does not treat the global ipSAE file as the chainwise one", () => {
    expect(
      findChainwiseArtifact([file("T1024_ipsae.tsv")], "ipsae")
    ).toBeNull();
  });
});

describe("parseChainPairScores", () => {
  const text = "\t0\r\nA:B\t0.3912\r\nA:C\t0.1000\r\nA:D\t0.9000\r\n";

  it("skips the header row and sorts by score", () => {
    expect(parseChainPairScores(text)).toEqual([
      { pair: "A:D", value: 0.9 },
      { pair: "A:B", value: 0.3912 },
      { pair: "A:C", value: 0.1 },
    ]);
  });

  it("returns an empty list for a monomer with no pairs", () => {
    expect(parseChainPairScores("\t0\r\n")).toEqual([]);
  });
});

describe("buildChainPairMatrix", () => {
  const scores = parseChainPairScores(
    "\t0\r\nA:B\t0.20\r\nA:C\t0.80\r\nB:C\t0.50\r\n"
  );

  it("fills both halves from the single listed pair", () => {
    const matrix = buildChainPairMatrix(scores);

    expect(matrix.chains).toEqual(["A", "B", "C"]);
    expect(matrix.rows).toEqual([
      [null, 0.2, 0.8],
      [0.2, null, 0.5],
      [0.8, 0.5, null],
    ]);
  });

  it("leaves the diagonal empty", () => {
    const matrix = buildChainPairMatrix(scores);

    matrix.chains.forEach((_, index) => {
      expect(matrix.rows[index][index]).toBeNull();
    });
  });

  it("leaves a missing pair empty rather than zero", () => {
    const matrix = buildChainPairMatrix(
      parseChainPairScores("A:B\t0.2\nC:D\t0.4")
    );

    expect(matrix.chains).toEqual(["A", "B", "C", "D"]);
    expect(matrix.rows[0][2]).toBeNull();
  });

  it("orders uppercase chains before lowercase ones", () => {
    const matrix = buildChainPairMatrix(
      parseChainPairScores("B:a\t0.1\nA:b\t0.2")
    );

    expect(matrix.chains).toEqual(["A", "B", "a", "b"]);
  });

  it("covers every chain the file mentions", () => {
    const matrix = buildChainPairMatrix(scores);

    expect(matrix.chains.length).toBe(3);
    expect(matrix.rows.length).toBe(3);
    expect(matrix.rows.every((row) => row.length === 3)).toBeTrue();
  });

  it("returns an empty matrix for a monomer", () => {
    const matrix = buildChainPairMatrix([]);

    expect(matrix.chains).toEqual([]);
    expect(matrix.rows).toEqual([]);
  });
});

describe("parseMsaCoverage", () => {
  // 21 is the gap token; 3 sequences over 4 positions.
  const text = "1\t2\t3\t4\n1\t2\t21\t21\n21\t21\t3\t4\n";

  it("counts coverage per position over every sequence", () => {
    const coverage = parseMsaCoverage(text);

    expect(coverage.totalSequences).toBe(3);
    expect(coverage.length).toBe(4);
    expect(Array.from(coverage.perPosition)).toEqual([2, 2, 2, 2]);
  });

  it("marks where each sequence aligns", () => {
    const coverage = parseMsaCoverage(text);

    // Row 0 is the query (identity 1) and stays first; the other two both have
    // identity 1 over their aligned span, so file order is preserved.
    expect(Array.from(coverage.covered)).toEqual([
      1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1,
    ]);
  });

  it("orders sequences most similar to the query first", () => {
    // Row 1 matches the query at 1 of 2 aligned positions; row 2 matches both.
    const coverage = parseMsaCoverage("1\t2\n1\t5\n1\t2\n");

    expect(Array.from(coverage.identity)).toEqual([1, 1, 0.5]);
    expect(coverage.sequences).toBe(3);
  });

  it("handles CRLF and a missing trailing newline", () => {
    const coverage = parseMsaCoverage("1\t2\r\n21\t2");

    expect(coverage.totalSequences).toBe(2);
    expect(Array.from(coverage.perPosition)).toEqual([1, 2]);
  });

  it("rejects an empty alignment", () => {
    expect(() => parseMsaCoverage("")).toThrowError(/empty/);
  });
});

describe("parsePaeMatrix", () => {
  it("parses a tab separated square matrix", () => {
    const matrix = parsePaeMatrix("0\t1.5\n2.5\t0\n");

    expect(matrix.size).toBe(2);
    expect(Array.from(matrix.values)).toEqual([0, 1.5, 2.5, 0]);
    expect(matrix.min).toBe(0);
    expect(matrix.max).toBe(2.5);
  });

  it("parses CRLF line endings", () => {
    const matrix = parsePaeMatrix("0\t1.5\r\n2.5\t0\r\n");

    expect(matrix.size).toBe(2);
    expect(Array.from(matrix.values)).toEqual([0, 1.5, 2.5, 0]);
  });

  it("parses CRLF with an index column", () => {
    const matrix = parsePaeMatrix("0\t0\t4\r\n1\t4\t0\r\n");

    expect(matrix.size).toBe(2);
    expect(Array.from(matrix.values)).toEqual([0, 4, 4, 0]);
  });

  it("ignores blank lines between rows", () => {
    const matrix = parsePaeMatrix("0\t2\n\n2\t0\n");

    expect(matrix.size).toBe(2);
    expect(matrix.max).toBe(2);
  });

  it("skips a non-numeric header row", () => {
    const matrix = parsePaeMatrix("res1\tres2\n0\t3\n3\t0");

    expect(matrix.size).toBe(2);
    expect(matrix.max).toBe(3);
  });

  it("keeps a first column that only looks like a row index", () => {
    // 0, 1, 2, ... is plausible real data in column 0, so the row count is what
    // tells it from an index column. Guessing wrong drops a residue silently.
    const matrix = parsePaeMatrix("0\t1\t2\n1\t0\t3\n2\t3\t0");

    expect(matrix.size).toBe(3);
    expect(Array.from(matrix.values)).toEqual([0, 1, 2, 1, 0, 3, 2, 3, 0]);
  });

  it("drops a leading index column", () => {
    const matrix = parsePaeMatrix("1\t0\t4\n2\t4\t0");

    expect(matrix.size).toBe(2);
    expect(Array.from(matrix.values)).toEqual([0, 4, 4, 0]);
  });

  it("accepts comma separated values", () => {
    expect(parsePaeMatrix("0,2\n2,0").size).toBe(2);
  });

  it("accepts whitespace separated values", () => {
    expect(parsePaeMatrix("0 2\n2 0").size).toBe(2);
  });

  it("rejects an empty file", () => {
    expect(() => parsePaeMatrix("  \n\n")).toThrowError(
      /PAE file is empty|no data rows/
    );
  });

  it("rejects a non-square matrix whose extra column is not a row index", () => {
    expect(() => parsePaeMatrix("5\t1\t2\n1\t0\t3")).toThrowError(/not square/);
  });

  it("rejects a matrix that is wider than it is tall by more than an index", () => {
    expect(() => parsePaeMatrix("0\t1\t2\t3\n1\t0\t3\t4")).toThrowError(
      /not square/
    );
  });

  it("rejects a ragged matrix", () => {
    expect(() => parsePaeMatrix("0\t1\n1")).toThrowError(/Row 2/);
  });

  it("rejects an index column that stops counting its rows", () => {
    // Starts at 0 like a real index, so the shape check accepts it, and the
    // per-row verification is what catches it.
    expect(() => parsePaeMatrix("0\t0\t1\n5\t1\t0")).toThrowError(
      /index column/
    );
  });

  it("reports a wide matrix whose first column is not an index as non-square", () => {
    expect(() => parsePaeMatrix("7\t0\t1\n9\t1\t0")).toThrowError(/not square/);
  });

  it("rejects non-numeric data", () => {
    expect(() => parsePaeMatrix("0\t1\nn/a\t0")).toThrowError(/non-numeric/);
  });

  it("parses a large matrix without allocating per-value strings", () => {
    // ~7 MB of text and a million values, and the real files are larger — this
    // guards the single-pass scan against regressing to a split-based parse.
    const size = 1000;
    const row = new Array(size).fill("12.34").join("\t");
    const text = new Array(size).fill(row).join("\n");

    const started = performance.now();
    const matrix = parsePaeMatrix(text);
    const elapsed = performance.now() - started;

    expect(matrix.size).toBe(size);
    expect(matrix.values.length).toBe(size * size);
    expect(matrix.min).toBeCloseTo(12.34, 2);
    expect(elapsed).toBeLessThan(2000);
  });

  it("refuses a matrix larger than the render limit", () => {
    const size = MAX_PAE_SIZE + 1;
    const row = new Array(size).fill("0").join("\t");
    const text = new Array(size).fill(row).join("\n");

    expect(() => parsePaeMatrix(text)).toThrowError(/too large/);
  });
});

describe("residue index helpers", () => {
  const residues: ResidueRef[] = [
    { chain: "A", seq: 1 },
    { chain: "A", seq: 2 },
    { chain: "A", seq: 3 },
    { chain: "B", seq: 10 },
    { chain: "B", seq: 11 },
  ];

  it("groups residues into contiguous chain segments", () => {
    expect(buildChainSegments(residues)).toEqual([
      { chain: "A", start: 0, end: 2 },
      { chain: "B", start: 3, end: 4 },
    ]);
  });

  it("builds a token to index lookup", () => {
    expect(buildResidueLookup(residues).get("B11")).toBe(4);
  });

  it("collapses consecutive indices into range tokens", () => {
    expect(residueIndicesToTokens([0, 1, 2, 4], residues)).toEqual([
      "A1-A3",
      "B11",
    ]);
  });

  it("does not merge a range across a chain boundary", () => {
    expect(residueIndicesToTokens([2, 3], residues)).toEqual(["A3", "B10"]);
  });

  it("ignores indices outside the residue list", () => {
    expect(residueIndicesToTokens([0, 99], residues)).toEqual(["A1"]);
  });

  it("expands range tokens back to indices", () => {
    const lookup = buildResidueLookup(residues);

    expect(tokensToResidueIndices("A1-A3,B11", lookup)).toEqual([0, 1, 2, 4]);
  });

  it("ignores unknown tokens", () => {
    const lookup = buildResidueLookup(residues);

    expect(tokensToResidueIndices("A1,Z9,", lookup)).toEqual([0]);
  });

  it("round-trips a selection", () => {
    const lookup = buildResidueLookup(residues);
    const indices = [1, 2, 3];
    const tokens = residueIndicesToTokens(indices, residues).join(",");

    expect(tokensToResidueIndices(tokens, lookup)).toEqual(indices);
  });
});
