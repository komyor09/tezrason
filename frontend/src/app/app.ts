import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { HeaderComponent } from './layout/header';
import { FooterComponent } from './layout/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, HeaderComponent, FooterComponent],
  template: `
    <app-header />
    <main><router-outlet /></main>
    <app-footer />
    <p-toast position="top-right" />
  `,
  styles: `:host { display: flex; flex-direction: column; min-height: 100vh; } main { flex: 1; }`,
})
export class App {}
