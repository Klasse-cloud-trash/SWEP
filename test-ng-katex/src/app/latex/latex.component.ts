import { Component, OnInit } from '@angular/core';

import { KatexOptions } from 'ng-katex';

@Component({
  selector: 'app-latex',
  // templateUrl: './latex.component.html',
  template: `<ng-katex [equation]="equation" [options]="options"></ng-katex>`,
  styleUrls: ['./latex.component.css']
})
export class LatexComponent implements OnInit {

  equation = '\\sum_{i=1}^nx_i';

  options: KatexOptions = {
    displayMode: true,
  };

  constructor() { }

  ngOnInit(): void {
  }

}
