import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { HeaderComponent } from './layout/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, HeaderComponent],
  template: `
    <app-header />
    <main><router-outlet /></main>
    <p-toast position="top-right" />
  `,
})
export class App {}
