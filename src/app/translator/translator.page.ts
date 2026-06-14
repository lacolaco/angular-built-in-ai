import { Component, computed, signal } from '@angular/core';
import { LANG_CODES, LANG_LABEL, SAMPLE_POSTS, type Lang } from './sample-text';
import { translationResource } from './translation.resource';

@Component({
  selector: 'app-translator-page',
  template: `
    <div class="mx-auto max-w-3xl space-y-6 p-6">
      <h1 class="text-2xl font-bold">Built-in AI Translator</h1>
      <p class="text-sm text-gray-600">
        異なる言語で投稿された短文を、Built-in AI の Translator API
        でユーザーが選んだ表示言語に翻訳します。原文と表示言語が同じ投稿はそのまま、
        違う投稿は初回のみモデルのダウンロードを挟んで翻訳結果が表示されます。
      </p>

      <div
        class="flex flex-wrap items-center gap-2"
        role="radiogroup"
        aria-label="表示言語"
      >
        <span class="text-sm text-gray-700">表示言語:</span>
        @for (code of langCodes; track code) {
          <button
            type="button"
            class="rounded border border-gray-400 bg-white px-3 py-1 text-sm text-gray-700 aria-pressed:border-blue-600 aria-pressed:bg-blue-600 aria-pressed:text-white"
            [attr.aria-pressed]="displayLang() === code"
            (click)="displayLang.set(code)"
          >
            {{ labels[code] }}
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

            @if (displayLang() === post.meta.source) {
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
                    {{ labels[post.meta.source] }} → {{ labels[displayLang()] }} を翻訳
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
  protected readonly langCodes = LANG_CODES;
  protected readonly labels = LANG_LABEL;
  protected readonly displayLang = signal<Lang>('ja');

  protected readonly posts = SAMPLE_POSTS.map((meta) => ({
    meta,
    resource: translationResource(
      computed(() => (this.displayLang() === meta.source ? '' : meta.text)),
      () => ({ sourceLanguage: meta.source, targetLanguage: this.displayLang() }),
    ),
  }));
}
