# AngularBuiltInAi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.8.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running integration tests (Built-in AI E2E)

Playwright integration tests under `e2e/` drive real Chrome stable with
Built-in AI feature flags enabled and exercise the Summarizer and Prompt
pages end-to-end against the real on-device Gemini Nano model.

```bash
pnpm test:e2e            # headless
pnpm test:e2e:headed     # show the browser
pnpm test:e2e:ui         # Playwright UI mode
```

Requirements:

- Google Chrome **stable** at the default macOS path. The Summarizer
  surface works on Chrome 138+; the Prompt page uses
  `expectedOutputs.languages: ['ja']`, which requires Chrome 149+.
  Tests use `channel: 'chrome'` — Playwright's bundled Chromium is NOT
  used because it does not ship the Gemini Nano model.
- Disk for the on-device model (~3 GB) under
  `.cache/playwright-chrome-ai-profile/`.

The first run downloads the Optimization Guide On Device Model component
(~2–3 min on a fast link). Subsequent runs reuse the cached profile.

### Why we override Chrome launch flags

Playwright/Puppeteer add several automation defaults that silently break
Built-in AI provisioning:

| Flag | Effect on Built-in AI |
| --- | --- |
| `--disable-background-networking` | Component Updater never downloads the model |
| `--disable-component-extensions-with-background-pages` / `--disable-sync` / `--disable-default-apps` | Further starve the updater |
| `--disable-features=...,OptimizationHints,...` (default list) | Optimization Guide service does not start (`Unable to create a text session because the service is not running`) |

`e2e/ai-chrome-options.ts` removes these via `ignoreDefaultArgs` and adds
`--enable-features=OptimizationGuideOnDeviceModel,...,PromptAPIForGeminiNano,
SummarizationAPIForGeminiNano,...` plus
`--component-updater=fast-update-check=1`. Edit that file if a future
Playwright release changes its default disable list.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
