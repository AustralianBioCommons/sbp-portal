module.exports = function (config) {
  config.set({
    basePath: "",
    frameworks: ["jasmine", "@angular-devkit/build-angular"],
    plugins: [
      require("karma-jasmine"),
      require("karma-chrome-launcher"),
      require("karma-jasmine-html-reporter"),
      require("karma-coverage"),
      require("@angular-devkit/build-angular/plugins/karma"),
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
      },
    },
    reporters: ["progress", "kjhtml", "coverage"],
    coverageReporter: {
      // Include all sources so files that aren't executed in tests are still
      // counted in the coverage totals (this makes the CI gate reflect
      // untested source files).
      includeAllSources: true,
      dir: require("path").join(__dirname, "./coverage/sbp-portal"),
      reporters: [
        { type: "html" },
        { type: "lcovonly" },
        // json-summary produces coverage/coverage-summary.json which our
        // CI workflow parses to enforce thresholds.
        { type: "json-summary" },
        { type: "text" },
        { type: "text-summary" },
        { type: "cobertura", subdir: ".", file: "cobertura.txt" },
      ],
      check: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        each: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
          overrides: {},
        },
      },
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ["ChromeHeadless"],
    singleRun: true,
    restartOnFileChange: false,
  });
};
