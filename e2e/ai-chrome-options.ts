import path from 'node:path';
import type { LaunchOptions } from '@playwright/test';

// Persistent user-data-dir holds the downloaded Gemini Nano model.
// First run downloads (~2-3 min); subsequent runs reuse it (~ms).
export const AI_USER_DATA_DIR =
  process.env['PLAYWRIGHT_AI_USER_DATA_DIR'] ??
  path.join(process.cwd(), '.cache', 'playwright-chrome-ai-profile');

// Default Chrome flags Playwright adds that BREAK Built-in AI provisioning.
//
// IMPORTANT: We tried `ignoreDefaultArgs: true` to own the entire flag list,
// but Playwright's launchPersistentContext relies on its defaults to inject
// `--user-data-dir=<positional>` and `--remote-debugging-pipe`. Stripping
// every default makes Chrome fall back to the OS user profile location (a
// data-loss hazard) and breaks Playwright's CDP attachment. So we surgically
// remove only the AI-hostile defaults.
//
// The list is matched by Playwright via EXACT string compare. The
// `--disable-features=...` value is the entire joined string; partial matches
// do not work. After upgrading @playwright/test, regenerate the snapshot by
// launching with this list and inspecting `chrome://version` — if
// `OptimizationHints` reappears in the disable-features line, append the new
// upstream string here and the runtime guard in `global-setup.ts` will catch
// any miss before tests run.
//
// Key offenders captured below:
//   --disable-component-update           stops the Component Updater entirely
//   --disable-background-networking      blocks Component Updater traffic
//   --disable-component-extensions-with-background-pages / --disable-sync /
//   --disable-default-apps               collectively starve the updater
//   --disable-features=...,OptimizationHints,...
//                                        disables the Optimization Guide
//                                        feature whose service hosts the
//                                        on-device model (otherwise: "Unable
//                                        to create a text session because
//                                        the service is not running")
export const AI_IGNORE_DEFAULT_ARGS = [
  '--disable-component-update',
  '--disable-background-networking',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--disable-sync',
  // @playwright/test 1.60 default (Chrome 149 stable, captured 2026-06-12)
  '--disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion',
  // Older Playwright default (kept for resilience across versions)
  '--disable-features=AcceptCHFrame,AutoExpandDetailsElement,AvoidUnnecessaryBeforeUnloadCheckSync,CertificateTransparencyComponentUpdater,DeferRendererTasksAfterInput,DestroyProfileOnBrowserClose,DialMediaRouteProvider,ExtensionManifestV2Disabled,GlobalMediaControls,HttpsUpgrades,ImprovedCookieControls,LazyFrameLoading,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate',
  // Puppeteer-style default (kept for resilience)
  '--disable-features=Translate,AcceptCHFrame,MediaRouter,OptimizationHints,WebUIReloadButton,ProcessPerSiteUpToMainFrameThreshold,IsolateSandboxedIframes',
];

// Features required for Built-in AI on Chrome 138+ stable. The later
// `--enable-features` wins for conflict resolution in current Chrome, so
// re-asserting OptimizationHints here is the runtime backstop against an
// out-of-date AI_IGNORE_DEFAULT_ARGS.
export const AI_ENABLE_FEATURES = [
  'OptimizationGuideOnDeviceModel',
  'OptimizationGuideOnDeviceModelExecution',
  'OptimizationGuideModelDownloading',
  'OptimizationHints',
  'PromptAPI',
  'PromptAPIForGeminiNano',
  'PromptAPIMultimodalInput',
  'SummarizationAPI',
  'SummarizationAPIForGeminiNano',
  'WriterAPIForGeminiNano',
  'RewriterAPIForGeminiNano',
  'LanguageDetectionAPI',
  'TranslationAPI',
  'AIPromptAPI',
  'AIPromptAPIForGeminiNano',
  'AISummarizationAPI',
].join(',');

export const AI_LAUNCH_ARGS: string[] = [
  `--enable-features=${AI_ENABLE_FEATURES}`,
  '--component-updater=fast-update-check=1',
];

export const aiLaunchOptions: LaunchOptions = {
  channel: 'chrome',
  ignoreDefaultArgs: AI_IGNORE_DEFAULT_ARGS,
  args: AI_LAUNCH_ARGS,
};
