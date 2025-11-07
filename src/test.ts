// This file is required by karma.conf and loads up the Angular testing environment.
import "zone.js/testing";
import { getTestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

// Load all the test files (*.spec.ts).
declare const require: {
  context(
    path: string,
    deep?: boolean,
    filter?: RegExp
  ): {
    keys(): string[];
    <T>(id: string): T;
  };
};

const context = require.context("./", true, /\.spec\.ts$/);
context.keys().forEach(context);

// Prevent full page reloads during unit tests by stubbing navigation helpers.
if (typeof window !== "undefined") {
  const warnNavigation = (target: string, args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(
      `[test-nav] Blocked ${target} during unit tests`,
      ...(args.length ? args : [])
    );
  };

  window.open = ((...args) => {
    warnNavigation("window.open", args);
    return null;
  }) as typeof window.open;

  const locationAny = window.location as Location & Record<string, (...args: unknown[]) => unknown>;
  (["assign", "replace", "reload"] as const).forEach((methodName) => {
    locationAny[methodName] = (...args: unknown[]) => {
      warnNavigation(`window.location.${methodName}`, args);
      return undefined;
    };
  });
}
