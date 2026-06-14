import { Component, computed, signal } from '@angular/core';
import {
  LANG_LABEL,
  SAMPLE_POSTS,
  VIEW_MODES,
  type Lang,
  type ViewMode,
} from './sample-text';
import { translationResource } from './translation.resource';

@Component({
  selector: 'app-translator-page',
  template: `
    <div class="mx-auto max-w-3xl space-y-6 p-6">
      <h1 class="text-2xl font-bold">Built-in AI Translator</h1>
      <p class="text-sm text-gray-600">
        4 つの言語 (日本語・English・中文 (简体)・Español) で投稿された短文を、Built-in AI の
        Translator API でユーザーが選んだ表示モードに統一表示します。原文モードでは翻訳を行わず、
        日本語表示 / 英語表示 では原文の言語が表示先と異なる投稿だけ翻訳が走ります。
      </p>

      <div
        class="flex flex-wrap items-center gap-2"
        role="radiogroup"
        aria-label="表示モード"
      >
        <span class="text-sm text-gray-700">表示モード:</span>
        @for (mode of viewModes; track mode.value) {
          <button
            type="button"
            class="rounded border border-gray-400 bg-white px-3 py-1 text-sm text-gray-700 aria-pressed:border-blue-600 aria-pressed:bg-blue-600 aria-pressed:text-white"
            [attr.aria-pressed]="viewMode() === mode.value"
            (click)="viewMode.set(mode.value)"
          >
            {{ mode.label }}
          </button>
        }
      </div>

      <div class="space-y-4">
        @for (post of posts; track post.meta.id) {
          <article
            class="space-y-2 rounded border border-gray-300 bg-white p-4"
            [attr.data-testid]="'post-' + post.meta.id"
          >
            <header class="flex items-center justify-between text-xs text-gray-500">
              <span>posted by <strong class="text-gray-700">{{ post.meta.author }}</strong></span>
              <span>原文: {{ labels[post.meta.source] }}</span>
            </header>

            @if (showsOriginal(post.meta.source)) {
              <p class="whitespace-pre-wrap text-sm text-gray-800">{{ post.meta.text }}</p>
            } @else {
              @switch (post.resource.translatorAvailability()) {
                @case ('unavailable') {
                  <p class="text-sm text-gray-500">この言語ペアは利用できません。原文を表示します。</p>
                  <p class="whitespace-pre-wrap text-sm text-gray-800">{{ post.meta.text }}</p>
                }
                @case ('downloadable') {
                  <p class="whitespace-pre-wrap text-sm text-gray-500">{{ post.meta.text }}</p>
                  @if (post.resource.error(); as err) {
                    <p class="text-xs text-red-600">初期化に失敗しました: {{ err.message }}</p>
                  }
                  <button
                    type="button"
                    class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    (click)="post.resource.initialize()"
                  >
                    {{ labels[post.meta.source] }} → {{ labels[targetLangFor(viewMode())] }} を翻訳
                  </button>
                }
                @case ('downloading') {
                  <p class="whitespace-pre-wrap text-sm text-gray-500">{{ post.meta.text }}</p>
                  <p class="text-xs text-gray-500">モデルをダウンロード中…</p>
                }
                @case ('available') {
                  @switch (post.resource.status()) {
                    @case ('loading') {
                      <p class="whitespace-pre-wrap text-sm text-gray-500">{{ post.meta.text }}</p>
                      <p class="text-xs text-gray-500">翻訳中…</p>
                    }
                    @case ('error') {
                      <p class="whitespace-pre-wrap text-sm text-gray-500">{{ post.meta.text }}</p>
                      <p class="text-xs text-red-600">{{ post.resource.error()?.message }}</p>
                    }
                    @case ('resolved') {
                      <p
                        class="whitespace-pre-wrap text-sm text-gray-800"
                        [attr.data-testid]="'translation-' + post.meta.id"
                      >
                        {{ post.resource.value() }}
                      </p>
                      <details class="text-xs text-gray-500">
                        <summary class="cursor-pointer">原文を表示</summary>
                        <p class="mt-1 whitespace-pre-wrap">{{ post.meta.text }}</p>
                      </details>
                    }
                  }
                }
              }
            }
          </article>
        }
      </div>
    </div>
  `,
})
export class TranslatorPage {
  protected readonly viewModes = VIEW_MODES;
  protected readonly labels = LANG_LABEL;
  protected readonly viewMode = signal<ViewMode>('original');

  protected readonly posts = SAMPLE_POSTS.map((meta) => ({
    meta,
    resource: translationResource(
      computed(() => (this.showsOriginal(meta.source) ? '' : meta.text)),
      () => ({
        sourceLanguage: meta.source,
        targetLanguage: this.targetLangFor(this.viewMode(), meta.source),
      }),
    ),
  }));

  /**
   * `viewMode` の選択により、この投稿が原文をそのまま表示するべきかを判定する。
   * 原文表示モード、または原文の言語と表示モードが一致する場合に true。
   */
  protected showsOriginal(source: Lang): boolean {
    const mode = this.viewMode();
    return mode === 'original' || mode === source;
  }

  /**
   * Translator に渡す `targetLanguage` を決める。原文モードでは翻訳しないので
   * 同言語ペアを返し、resource 側で no-op 化させる。`fallback` は呼び出し時の
   * `meta.source` をそのまま受け取る (computed 経由でしか呼ばれないので reactive)。
   */
  protected targetLangFor(mode: ViewMode, fallback: Lang = 'ja'): Lang {
    return mode === 'original' ? fallback : mode;
  }
}
