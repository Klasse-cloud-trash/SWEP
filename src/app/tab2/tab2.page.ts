import { Component } from '@angular/core';
import { EquationString } from './equationString';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})

export class Tab2Page {
    title: string = 'Addieren';
    subtitle: string = 'Einstieg ohne Zehnerübergang mit Stellentafel: bis 100 bis 1.000';
    content: string = 'Hier lassen sich 2 bis 3 Zahlen im dreistelligen sechsstelligen Bereich schriftlich addieren. Für den Übertrag sind die gestrichelten Kästchen vorgesehen.';
    hideContent = false;

    eqs: EquationString ={
        text: [ "Das hier ist eine Formel", "0 = (x^2 + y^2 -1)^3 - x^2 y^3", "toll oder?"],
        mode: [0, 1, 0],
    };

  constructor() {}

  send(){
    if(!this.hideContent)
        this.hideContent = true;
  }

  switchHide(){
    this.hideContent ? this.hideContent=false : this.hideContent=true;
  }

}
