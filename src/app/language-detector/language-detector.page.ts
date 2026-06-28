import { Component, computed, signal } from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';
import { languageDetectionResource } from './language-detection.resource';
import { SAMPLE_TEXTS, type SampleText } from './sample-text';

@Component({
  selector: 'app-language-detector-page',
  imports: [FormField],
  template: `
    <div class="mx-auto max-w-3xl space-y-6 p-6">
      <h1 class="text-2xl font-bold">Built-in AI Language Detector</h1>
      <p class="text-sm text-gray-600">
        入力テキストの言語を Built-in AI Language Detector で判定します。
        判定結果は信頼度の高い順にランク表示します。
      </p>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <label for="input-text" class="text-sm font-medium text-gray-700">入力テキスト</label>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">サンプル:</span>
            @for (sample of samples; track sample.key) {
              <button
                type="button"
                class="rounded border border-gray-400 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                (click)="loadSample(sample)"
              >
                {{ sample.key }} ({{ sample.label }})
              </button>
            }
          </div>
        </div>
        <textarea
          id="input-text"
          data-testid="language-detector-input"
          class="w-full rounded border border-gray-300 p-3 font-mono text-sm disabled:bg-gray-100"
          rows="6"
          [formField]="inputForm"
          placeholder="判定したいテキストを入力"
        ></textarea>
      </div>

      <section class="rounded border border-gray-300 bg-gray-50 p-4">
        @switch (detection.detectorAvailability()) {
          @case ('unavailable') {
            <p class="text-sm text-gray-500">Language Detector は利用できません。</p>
          }
          @case ('downloadable') {
            @if (detection.error(); as err) {
              <p class="mb-2 text-xs text-red-600">初期化に失敗しました: {{ err.message }}</p>
            }
            <button
              type="button"
              class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              (click)="detection.initialize()"
            >
              Language Detector を初期化
            </button>
          }
          @case ('downloading') {
            <p class="text-sm text-gray-500">Language Detector をダウンロード中…</p>
          }
          @case ('available') {
            @switch (detection.status()) {
              @case ('idle') {
                <p class="text-sm text-gray-500">テキストを入力すると判定結果が表示されます。</p>
              }
              @case ('loading') {
                <p class="text-sm text-gray-500">判定中…</p>
              }
              @case ('error') {
                <p class="text-sm text-red-600">{{ detection.error()?.message }}</p>
              }
              @case ('resolved') {
                @if (topResult(); as top) {
                  <p data-testid="language-detection-top" class="mb-3 text-sm">
                    最有力:
                    <strong class="text-base">{{ formatLanguage(top.detectedLanguage) }}</strong>
                    ({{ formatConfidence(top.confidence) }})
                  </p>
                  <ul data-testid="language-detection-results" class="space-y-1 text-xs">
                    @for (r of detection.value(); track $index) {
                      <li class="flex items-center gap-2">
                        <span class="w-32 shrink-0 text-gray-700">
                          {{ formatLanguage(r.detectedLanguage) }}
                        </span>
                        <span
                          class="inline-block h-2 rounded bg-blue-500"
                          [style.width.%]="confidencePercent(r.confidence)"
                        ></span>
                        <span class="ml-1 text-gray-500">
                          {{ formatConfidence(r.confidence) }}
                        </span>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="text-sm text-gray-500">判定できる言語が見つかりませんでした。</p>
                }
              }
            }
          }
        }
      </section>
    </div>
  `,
})
export class LanguageDetectorPage {
  protected readonly samples = SAMPLE_TEXTS;
  protected readonly input = signal('');
  readonly inputForm = form(this.input, (control) => {
    debounce(control, 500);
  });

  protected readonly detection = languageDetectionResource(this.input);

  protected readonly topResult = computed<LanguageDetectionResult | null>(() => {
    const results = this.detection.value();
    return results && results.length > 0 ? results[0] : null;
  });

  protected loadSample(sample: SampleText): void {
    this.input.set(sample.text);
  }

  private readonly languageDisplay = new Intl.DisplayNames(['ja'], { type: 'language' });

  protected formatLanguage(code: string | undefined): string {
    if (!code) return '不明';
    try {
      const name = this.languageDisplay.of(code);
      return name ? `${name} (${code})` : code;
    } catch {
      return code;
    }
  }

  protected formatConfidence(confidence: number | undefined): string {
    if (confidence === undefined) return '-';
    return `${(confidence * 100).toFixed(1)}%`;
  }

  protected confidencePercent(confidence: number | undefined): number {
    if (confidence === undefined) return 0;
    return Math.max(0, Math.min(100, confidence * 100));
  }
}
