import { Component } from '@angular/core';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {

  constructor() {}
  minDate: string = new Date().toISOString();
  maxData: any = (new Date()).getFullYear() + 1;
  endDate: string = new Date().toDateString();
  edit()
  {

  }
}
