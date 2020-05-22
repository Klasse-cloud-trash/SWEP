import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { KatexModule } from 'ng-katex';

import { AppComponent } from './app.component';
import { LatexComponent } from './latex/latex.component';

@NgModule({
  declarations: [
    AppComponent,
    LatexComponent
  ],
  imports: [
    BrowserModule,
    KatexModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
