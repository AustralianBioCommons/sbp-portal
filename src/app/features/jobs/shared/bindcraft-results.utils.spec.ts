import {
  BINDCRAFT_COLUMNS,
  bindCraftAdapter,
  findBindCraftStatsArtifact,
} from "./bindcraft-results.utils";
import { ResultFileRef } from "./prediction-results.utils";

const RUN = "11111111-2222-4333-8444-555555555555";

/** The download list a completed BindCraft run actually produces. */
const files: ResultFileRef[] = [
  {
    label: "bindcraft_report.html",
    key: `${RUN}/generate/bindcraft_report.html`,
    url: "https://s3.test/bindcraft_report.html?sig=1",
    category: "report",
  },
  {
    label: "demo-binder_0_final_design_stats.csv",
    key: `${RUN}/bindcraft/demo-binder_0_final_design_stats.csv`,
    url: "https://s3.test/demo-binder_0_final_design_stats.csv?sig=1",
    category: "stats_csv",
  },
  {
    label: "demo-binder_final_design_stats.csv",
    key: `${RUN}/ranker/demo-binder_final_design_stats.csv`,
    url: "https://s3.test/demo-binder_final_design_stats.csv?sig=1",
    category: "stats_csv",
  },
  ...[
    "1_demo-binder_l135_s866737_mpnn3_model1.pdb",
    "2_demo-binder_l135_s866737_mpnn2_model1.pdb",
    "3_demo-binder_l113_s219275_mpnn4_model2.pdb",
    "4_demo-binder_l113_s219275_mpnn3_model1.pdb",
    "5_demo-binder_l68_s183565_mpnn13_model1.pdb",
  ].map((name) => ({
    label: name,
    key: `${RUN}/ranker/demo-binder_Ranked/${name}`,
    url: `https://s3.test/${name}?sig=1`,
    category: "pdb",
  })),
];

/** Columns taken verbatim from that run's `_final_design_stats.csv`. */
const statsCsv =
  "Rank,Design,Protocol,Length,Seed,Sequence,InterfaceResidues,Average_pLDDT,Average_i_pTM\n" +
  '1,demo-binder_l135_s866737_mpnn3,4stage,135,866737,GEMGVHDFLLELIRAHHA,"B65,B69,B72,B73",0.92,0.85\n' +
  '2,demo-binder_l135_s866737_mpnn2,4stage,135,866737,GVMSVYDFLLKLIKAHYE,"B65,B69,B72,B73",0.92,0.85\n' +
  '3,demo-binder_l113_s219275_mpnn4,4stage,113,219275,SAAAEAAREAKVEERTHE,"B17,B20,B21,B24",0.94,0.79\n' +
  '4,demo-binder_l113_s219275_mpnn3,4stage,113,219275,SAMEEAEKEAKVEERTHE,"B17,B20,B21,B24",0.92,0.78\n' +
  '5,demo-binder_l68_s183565_mpnn13,4stage,68,183565,MERSAEVREVEERMVRVF,"B28,B29,B39,B40",0.88,0.75\n';

describe("BINDCRAFT_COLUMNS", () => {
  it("lists the requested columns in order, with Rank emphasised", () => {
    expect(
      BINDCRAFT_COLUMNS.map((column) => [column.key, column.heading])
    ).toEqual([
      ["Rank", "Rank"],
      ["Average_i_pTM", "ipTM"],
      ["Length", "Design Length"],
      ["Sequence", "Design Sequence"],
      ["Design", "Design name"],
    ]);
    expect(BINDCRAFT_COLUMNS[0].emphasised).toBeTrue();
    expect(BINDCRAFT_COLUMNS.slice(1).some((c) => c.emphasised)).toBeFalse();
  });

  it("offers sorting only where an order means something", () => {
    const sortable = BINDCRAFT_COLUMNS.filter(
      (column) => column.sortable !== false
    ).map((column) => column.heading);

    expect(sortable).toEqual(["Rank", "ipTM", "Design Length"]);
  });

  it("opens ipTM on its best end, which is the end Rank opens on", () => {
    const column = (key: string) =>
      BINDCRAFT_COLUMNS.find((candidate) => candidate.key === key)!;

    // Rank ascending and ipTM descending are the same order.
    expect(column("Average_i_pTM").higherIsBetter).toBeTrue();
    expect(column("Rank").higherIsBetter).toBeFalsy();
    expect(column("Length").higherIsBetter).toBeFalsy();
  });
});

describe("findBindCraftStatsArtifact", () => {
  it("prefers the ranker's copy, which the ranked structures were written from", () => {
    expect(findBindCraftStatsArtifact(files)?.key).toBe(
      `${RUN}/ranker/demo-binder_final_design_stats.csv`
    );
  });

  it("falls back to BindCraft's own copy when the ranker published none", () => {
    const withoutRanker = files.filter(
      (file) => !file.key.includes("/ranker/demo-binder_final")
    );

    expect(findBindCraftStatsArtifact(withoutRanker)?.key).toBe(
      `${RUN}/bindcraft/demo-binder_0_final_design_stats.csv`
    );
  });

  it("returns null when the run published no stats file", () => {
    expect(
      findBindCraftStatsArtifact(files.filter((f) => f.category === "pdb"))
    ).toBeNull();
  });

  it("matches on the URL when the key carries no filename", () => {
    expect(
      findBindCraftStatsArtifact([
        {
          label: "Design stats",
          key: "opaque-key",
          url: "https://s3.test/sample_final_design_stats.csv?sig=1",
          category: "stats_csv",
        },
      ])
    ).not.toBeNull();
  });
});

describe("the BindCraft adapter's rows", () => {
  const rows = bindCraftAdapter.parseRows(statsCsv, files);

  it("keeps the file's own ranking order", () => {
    expect(rows.map((row) => row.values["Rank"])).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("carries every CSV column through, not only the displayed ones", () => {
    expect(rows[0].values["Protocol"]).toBe("4stage");
    expect(rows[0].values["InterfaceResidues"]).toBe("B65,B69,B72,B73");
  });

  it("pairs each design with the ranked structure named after it", () => {
    expect(rows.map((row) => row.structure?.key)).toEqual([
      `${RUN}/ranker/demo-binder_Ranked/1_demo-binder_l135_s866737_mpnn3_model1.pdb`,
      `${RUN}/ranker/demo-binder_Ranked/2_demo-binder_l135_s866737_mpnn2_model1.pdb`,
      `${RUN}/ranker/demo-binder_Ranked/3_demo-binder_l113_s219275_mpnn4_model2.pdb`,
      `${RUN}/ranker/demo-binder_Ranked/4_demo-binder_l113_s219275_mpnn3_model1.pdb`,
      `${RUN}/ranker/demo-binder_Ranked/5_demo-binder_l68_s183565_mpnn13_model1.pdb`,
    ]);
    expect(rows[0].structure?.format).toBe("pdb");
  });

  it("matches a design whose name is not all lower case", () => {
    // Real design names carry capitals, e.g. PDL1.
    const mixedCase = [
      {
        label: "1_PDL1_l80_s995529_mpnn20_model1.pdb",
        key: `${RUN}/ranker/PDL1_Ranked/1_PDL1_l80_s995529_mpnn20_model1.pdb`,
        url: "https://s3.test/1_PDL1.pdb?sig=1",
        category: "pdb",
      },
    ];

    expect(
      bindCraftAdapter.parseRows(
        "Rank,Design\n1,PDL1_l80_s995529_mpnn20\n",
        mixedCase
      )[0].structure?.key
    ).toBe(mixedCase[0].key);
  });

  it("does not let one design claim another's file on a shared prefix", () => {
    // `_mpnn1` prefixes `_mpnn13`, so only the name boundary tells them apart.
    const prefixed = bindCraftAdapter.parseRows(
      "Rank,Design\n5,demo-binder_l68_s183565_mpnn1\n6,demo-binder_l68_s183565_mpnn13\n",
      files
    );

    expect(prefixed[0].structure).toBeNull();
    expect(prefixed[1].structure?.key).toContain("mpnn13_model1.pdb");
  });

  it("names each row by its design", () => {
    expect(rows[0].label).toBe("demo-binder_l135_s866737_mpnn3");
  });

  it("gives every row a distinct id", () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it("leaves a design with no ranked structure unpaired", () => {
    const extra = bindCraftAdapter.parseRows(
      "Rank,Design\n9,demo-binder_l99_s1_mpnn1\n",
      files
    );

    expect(extra[0].structure).toBeNull();
    expect(extra[0].label).toBe("demo-binder_l99_s1_mpnn1");
  });

  it("leaves a row unpaired rather than pairing it on rank alone", () => {
    const renamed = bindCraftAdapter.parseRows(
      "Rank,Design\n3,relabelled-design\n",
      files
    );

    expect(renamed[0].structure).toBeNull();
  });

  it("picks the model matching the rank when a design has more than one", () => {
    const design = "demo-binder_l135_s866737_mpnn3";
    const twoModels = [
      ...files,
      {
        label: `9_${design}_model2.pdb`,
        key: `${RUN}/ranker/demo-binder_Ranked/9_${design}_model2.pdb`,
        url: "https://s3.test/model2.pdb?sig=1",
        category: "pdb",
      },
    ];

    expect(
      bindCraftAdapter.parseRows(
        "Rank,Design\n9," + design + "\n",
        twoModels
      )[0].structure?.key
    ).toContain(`9_${design}_model2.pdb`);
  });

  it("ignores PDBs outside the ranked folder", () => {
    const unranked = bindCraftAdapter.parseRows(statsCsv, [
      {
        label: "1_demo-binder_l135_s866737_mpnn3_model1.pdb",
        key: `${RUN}/bindcraft/demo-binder_0_output/Accepted/1_demo-binder_l135_s866737_mpnn3_model1.pdb`,
        url: "https://s3.test/accepted.pdb?sig=1",
        category: "pdb",
      },
    ]);

    expect(unranked.every((row) => row.structure === null)).toBeTrue();
  });

  it("names a row without a design after its rank", () => {
    const nameless = bindCraftAdapter.parseRows("Rank\n7\n", []);

    expect(nameless[0].label).toBe("Design 7");
  });

  it("names a row with neither a design nor a rank after its position", () => {
    const bare = bindCraftAdapter.parseRows("Protocol\n4stage\n4stage\n", []);

    expect(bare.map((row) => row.label)).toEqual(["Design 1", "Design 2"]);
    expect(bare[0].structure).toBeNull();
  });

  it("returns nothing for a stats file with no rows", () => {
    expect(bindCraftAdapter.parseRows("Rank,Design\n", files)).toEqual([]);
  });
});
