import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <span class="text-lg font-bold">Built-in AI Playground</span>
        <nav aria-label="Built-in AI のページ" class="flex gap-2 text-sm">
          <a
            routerLink="/summarizer"
            routerLinkActive
            ariaCurrentWhenActive="page"
            class="nav-link"
          >
            Summarizer
          </a>
          <a
            routerLink="/prompt"
            routerLinkActive
            ariaCurrentWhenActive="page"
            class="nav-link"
          >
            Prompt (画像)
          </a>
        </nav>
      </div>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    .nav-link {
      display: inline-block;
      border-radius: 0.25rem;
      border: 1px solid var(--color-gray-300);
      background-color: var(--color-white);
      color: var(--color-gray-700);
      padding: 0.25rem 0.75rem;
      font-weight: 500;
    }
    .nav-link:hover {
      background-color: var(--color-gray-100);
    }
    .nav-link[aria-current='page'] {
      background-color: var(--color-blue-600);
      color: var(--color-white);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .nav-link[aria-current='page']:hover {
      background-color: var(--color-blue-700);
    }
    .nav-link:focus-visible {
      outline: 2px solid var(--color-blue-600);
      outline-offset: 2px;
    }
  `,
})
export class App {}
