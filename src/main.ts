import { bootstrapApplication } from "@angular/platform-browser";
import { getAppConfig } from "./app/app.config";
import { App } from "./app/app";
import { buildVersion } from "./environments/build-version";

console.info("Structural Biology Portal build version:", buildVersion);

getAppConfig()
  .then((appConfig) => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
