import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'summarizer' },
  {
    path: 'summarizer',
    loadComponent: () => import('./summarizer/summarizer.page').then((m) => m.SummarizerPage),
    title: 'Built-in AI Summarizer',
  },
];
