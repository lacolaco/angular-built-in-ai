# angular-built-in-ai

Angular で [Chrome Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in) を扱う実装パターンのショーケース。Gemini Nano をオンデバイスで動かす各 API を、Angular の `signal` / `resource` / lazy route 構成で組み合わせるサンプル集です。

**Live demo:** https://lacolaco.github.io/angular-built-in-ai/

## Features

| Page | Built-in AI API | Min. Chrome | Description |
| --- | --- | --- | --- |
| [`/summarizer`](https://lacolaco.github.io/angular-built-in-ai/summarizer/) | [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api) | 138+ | 入力テキストを日本語要約。複数のサンプルテキストをワンクリックで切り替え。 |
| [`/prompt`](https://lacolaco.github.io/angular-built-in-ai/prompt/) | [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) (multimodal) | 149+ | 画像を `responseConstraint` (JSON Schema) と組み合わせ、`{ caption, mainSubject, tags }` を生成。3 枚のサンプル画像を切り替え。 |
| [`/translator`](https://lacolaco.github.io/angular-built-in-ai/translator/) | [Translator API](https://developer.chrome.com/docs/ai/translator-api) | 138+ | 4 つの言語 (日本語・English・中文 (简体)・Español) で書かれた投稿を、原文表示 / 日本語表示 / 英語表示の 3 モードで切替表示する Reddit 風 UI。表示モードを切替えると原文と異なる言語の投稿だけ `Translator` が走る。 |

## Architecture

- **Shell + per-feature page** — `App` (`src/app/app.ts`) は `<header>` + `<router-outlet>` だけのシェル。各 API は `loadComponent` lazy route として `src/app/<feature>/<feature>.page.ts` に分離。
- **Factory + Resource per feature** — 各機能ディレクトリに `<feature>-factory.ts`（`providedIn: 'root'`、Built-in AI 実装と Noop を `isXSupported` で切替）と `<feature>.resource.ts`（`resourceFromSnapshots` ベースのページ状態機械）を配置。
- **Static prerender to GitHub Pages** — `@angular/ssr` + `outputMode: "static"` で全ルートをビルド時に prerender し、`actions/upload-pages-artifact` で配信。ランタイム SSR サーバーは持ちません。
- **Global guards for SSR safety** — `src/app/ai/*.ts` の Built-in AI グローバルアクセスは `typeof X !== 'undefined'` で参照。`self` 経由の参照は Node 側 prerender で `ReferenceError` を起こすため避けます。

## Develop locally

```bash
pnpm install
pnpm start         # dev server on http://localhost:4200/
pnpm test          # Vitest (jsdom)
pnpm build         # production build → dist/angular-built-in-ai/browser/
```

## E2E tests with real Built-in AI

`e2e/` 配下の Playwright テストは **実 Chrome stable + 実 Gemini Nano** に対して走ります。Summarizer と Prompt のページを end-to-end で叩き、サンプル切り替え時に prompt が再発火することまで検証します。

```bash
pnpm test:e2e            # headless
pnpm test:e2e:headed     # show the browser
pnpm test:e2e:ui         # Playwright UI mode
```

### Requirements

- Google Chrome **stable** がデフォルトの macOS パスにインストールされていること。Summarizer は Chrome 138+、Prompt の日本語出力 (`expectedOutputs.languages: ['ja']`) は Chrome 149+ が必要。Playwright bundled Chromium は Gemini Nano を持たないため `channel: 'chrome'` で実 Chrome を起動します。
- オンデバイスモデル用ディスク 約 3 GB (`.cache/playwright-chrome-ai-profile/` 配下)。初回は Optimization Guide On Device Model コンポーネントのダウンロードに 2〜3 分かかります。

### Why we override Chrome launch flags

Playwright/Puppeteer の自動化向けデフォルト flag が Built-in AI のプロビジョニングを暗黙に潰すため、`e2e/ai-chrome-options.ts` で個別に剥がしています。

| Flag | Effect on Built-in AI |
| --- | --- |
| `--disable-background-networking` | Component Updater がモデルをダウンロードしない |
| `--disable-component-extensions-with-background-pages` / `--disable-sync` / `--disable-default-apps` | Updater をさらに飢えさせる |
| `--disable-features=...,OptimizationHints,...` (Playwright デフォルト一式) | Optimization Guide サービスが起動せず `Unable to create a text session because the service is not running` で落ちる |

ファイル冒頭の ignore list は **特定の文字列を除去** する形式 (`ignoreDefaultArgs: true` ではない) です。`true` を渡すと `--user-data-dir=<positional>` や `--remote-debugging-pipe` の自動付与も落ちて `launchPersistentContext` が動かなくなります。Playwright を上げた後にデフォルト disable リストが変わったら `chrome://version` を撮って ignore list を追補してください。

## Credits

`public/samples/` に置かれているサンプル画像は [Pexels](https://www.pexels.com/) からの引用 ([Pexels License](https://www.pexels.com/license/))。クレジット一覧は [`public/samples/CREDITS.md`](public/samples/CREDITS.md) を参照。
