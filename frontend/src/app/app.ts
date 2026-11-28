import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root component: just hosts the router. The shop and admin areas each bring their own layout. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {}
