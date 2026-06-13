import { Component, ElementRef, viewChild } from '@angular/core';
import { imageCaptionResource } from './image-caption.resource';

@Component({
  selector: 'app-prompt-page',
  template: `
    <div class="mx-auto max-w-3xl space-y-6 p-6">
      <h1 class="text-2xl font-bold">Built-in AI Prompt (画像 → 日本語キャプション)</h1>
      <p class="text-sm text-gray-600">
        画像を Prompt API に渡し、<code>responseConstraint</code> による JSON Schema
        出力で説明文・主な被写体・タグを得るサンプルです。Chrome 149
        以降の日本語入出力サポートを前提に
        <code>expectedOutputs.languages: ['ja']</code> を指定しています。
      </p>

      <img
        #image
        src="samples/pexels-cat-35224529.jpg"
        alt="サンプル画像"
        class="mx-auto max-h-72 rounded border border-gray-200"
      />

      <section class="rounded border border-gray-300 bg-gray-50 p-4">
        @switch (caption.languageModelAvailability()) {
          @case ('unavailable') {
            <p class="text-sm text-gray-500">Prompt API はこの環境で利用できません。</p>
          }
          @case ('downloadable') {
            <button
              type="button"
              class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              (click)="caption.initialize()"
            >
              Prompt API を初期化
            </button>
          }
          @case ('downloading') {
            <p class="text-sm text-gray-500">モデルをダウンロード中…</p>
          }
          @case ('available') {
            @switch (caption.status()) {
              @case ('idle') {
                <p class="text-sm text-gray-500">画像を解析する準備中…</p>
              }
              @case ('loading') {
                <p class="text-sm text-gray-500">画像を解析しています…</p>
              }
              @case ('error') {
                <p class="text-sm text-red-600">{{ caption.error()?.message }}</p>
              }
              @case ('resolved') {
                @let result = caption.value();
                @if (result) {
                  <div class="space-y-4 text-sm text-gray-800">
                    <div>
                      <h2 class="mb-1 text-xs font-semibold text-gray-500">caption</h2>
                      <p data-testid="prompt-caption" class="whitespace-pre-wrap">
                        {{ result.caption }}
                      </p>
                    </div>
                    <div>
                      <h2 class="mb-1 text-xs font-semibold text-gray-500">mainSubject</h2>
                      <p data-testid="prompt-main-subject">{{ result.mainSubject }}</p>
                    </div>
                    <div>
                      <h2 class="mb-1 text-xs font-semibold text-gray-500">tags</h2>
                      <ul data-testid="prompt-tags" class="flex flex-wrap gap-1">
                        @for (tag of result.tags; track tag) {
                          <li
                            class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900"
                          >
                            {{ tag }}
                          </li>
                        }
                      </ul>
                    </div>
                  </div>
                }
              }
            }
          }
        }
      </section>
    </div>
  `,
})
export class PromptPage {
  private readonly imageRef = viewChild<ElementRef<HTMLImageElement>>('image');
  protected readonly caption = imageCaptionResource(() => this.imageRef()?.nativeElement ?? null);
}
