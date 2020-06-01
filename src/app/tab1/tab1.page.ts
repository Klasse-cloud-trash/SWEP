import { Component } from '@angular/core';
import {ButtonLabels} from './buttonlabels';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})

export class Tab1Page {
  title: string = "Some Equations:";
  eqinput: string = '0 = (x^2 + y^2 -1)^3 - x^2 y^3';

  buttonLbls: ButtonLabels;

  inputEl: HTMLInputElement;
  isHovering = false;

  ngOnInit() {
    this.inputEl = document.getElementById("eqIn") as HTMLInputElement;
    this.buttonLbls = new ButtonLabels;
  }

  equationBtn(button: HTMLButtonElement): void {
    var curserPos = this.inputEl.selectionStart as number;
    var curserPosEnd = this.inputEl.selectionEnd as number;

    var nameArr = button.name.split("#",2);
    var offset = +nameArr[1];

    if(curserPos==curserPosEnd){

       this.eqinput = this.eqinput.slice(0, curserPos)
       + nameArr[0] + this.eqinput.slice(curserPos, this.eqinput.length);

    }else{

      var tmp = nameArr[0].slice(0,offset)
        + this.eqinput.slice(curserPos, curserPosEnd)
        + nameArr[0].slice(offset, nameArr[0].length);

      this.eqinput = this.eqinput.slice(0,curserPos)
        + tmp
        + this.eqinput.slice(curserPosEnd, this.eqinput.length);
    }

    setTimeout(()=>{
      this.inputEl.focus();
      this.inputEl.setSelectionRange(curserPos + offset,
                                     curserPos + offset);
    },0);

  }

  copyInput(input: HTMLInputElement){
    var curserPos = input.selectionStart as number;
    input.select();
    document.execCommand('copy');
    input.setSelectionRange(curserPos, curserPos);
  }

  openLink(){
    var tmp = "";
    for(var i=0; i<this.eqinput.length; i++){
      if(this.eqinput[i]=='+'){
        tmp += '%2B';
      }else{
        tmp += this.eqinput[i];
      }
    }
    window.open("https://www.wolframalpha.com/input/?i="+tmp, "_blank"); //solve+
  }

  mouseHovering(){
    this.isHovering = true;
  }

  mouseLeft(){
    this.isHovering = false;
  }

}
