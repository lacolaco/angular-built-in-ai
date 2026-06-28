import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'summarizer' },
  {
    path: 'summarizer',
    loadComponent: () => import('./summarizer/summarizer.page').then((m) => m.SummarizerPage),
    title: 'Built-in AI Summarizer',
  },
  {
    path: 'prompt',
    loadComponent: () => import('./prompt/prompt.page').then((m) => m.PromptPage),
    title: 'Built-in AI Prompt (画像)',
  },
  {
    path: 'translator',
    loadComponent: () => import('./translator/translator.page').then((m) => m.TranslatorPage),
    title: 'Built-in AI Translator',
  },
  {
    path: 'language-detector',
    loadComponent: () =>
      import('./language-detector/language-detector.page').then((m) => m.LanguageDetectorPage),
    title: 'Built-in AI Language Detector',
  },
];
