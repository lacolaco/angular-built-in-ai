import { Component, signal } from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';
import { SAMPLE_TEXT_A, SAMPLE_TEXT_B, SAMPLE_TEXT_C } from './sample-text';
import { summaryResource } from './summarized.resource';

@Component({
  selector: 'app-root',
  imports: [FormField],
  template: `
    <div class="mx-auto max-w-3xl space-y-6 p-6">
      <h1 class="text-2xl font-bold">Built-in AI Summarizer</h1>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <label for="input-text" class="text-sm font-medium text-gray-700">入力テキスト</label>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">サンプル:</span>
            <button
              type="button"
              class="rounded border border-gray-400 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              (click)="loadSample('A')"
            >
              A
            </button>
            <button
              type="button"
              class="rounded border border-gray-400 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              (click)="loadSample('B')"
            >
              B
            </button>
            <button
              type="button"
              class="rounded border border-gray-400 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              (click)="loadSample('C')"
            >
              C
            </button>
          </div>
        </div>
        <textarea
          id="input-text"
          class="w-full rounded border border-gray-300 p-3 font-mono text-sm disabled:bg-gray-100"
          rows="10"
          [formField]="inputForm"
          placeholder="要約したい長文をここに貼り付け"
        ></textarea>
      </div>

      <section class="rounded border border-gray-300 bg-gray-50 p-4">
        @switch (summary.summarizerAvailability()) {
          @case ('unavailable') {
            <p class="text-sm text-gray-500">要約機能は利用できません。</p>
          }
          @case ('downloadable') {
            <button
              type="button"
              class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              (click)="summary.initialize()"
            >
              要約機能を初期化
            </button>
          }
          @case ('downloading') {
            <p class="text-sm text-gray-500">要約機能をダウンロード中…</p>
          }
          @case ('available') {
            @switch (summary.status()) {
              @case ('idle') {
                <p class="text-sm text-gray-500">テキストを入力すると要約が表示されます。</p>
              }
              @case ('loading') {
                <p class="text-sm text-gray-500">要約しています…</p>
              }
              @case ('error') {
                <p class="text-sm text-red-600">{{ summary.error()?.message }}</p>
              }
              @case ('resolved') {
                <p class="whitespace-pre-wrap text-sm text-gray-800">{{ summary.value() }}</p>
              }
            }
          }
        }
      </section>
    </div>
  `,
})
export class App {
  protected readonly input = signal('');
  readonly inputForm = form(this.input, (control) => {
    debounce(control, 500);
  });

  protected readonly summary = summaryResource(this.input, {
    summarizerOptions: {
      outputLanguage: 'ja',
    },
  });

  protected loadSample(key: 'A' | 'B' | 'C'): void {
    const text = { A: SAMPLE_TEXT_A, B: SAMPLE_TEXT_B, C: SAMPLE_TEXT_C }[key];
    this.input.set(text);
  }
}
