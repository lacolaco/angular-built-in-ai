import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <h1 class="text-lg font-bold">Built-in AI Playground</h1>
        <nav class="flex gap-2 text-sm">
          <a
            routerLink="/summarizer"
            routerLinkActive="bg-blue-600 text-white hover:bg-blue-700"
            class="rounded border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 hover:bg-gray-100"
          >
            Summarizer
          </a>
        </nav>
      </div>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class App {}
