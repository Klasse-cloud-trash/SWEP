import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';


@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {
  title: string = "a PDF file";

  zoom = 1;
  ogSize = false;
  autoresize = true;


  pdfSrc = "https://vadimdez.github.io/ng2-pdf-viewer/assets/pdf-test.pdf";

  constructor(private http: HttpClient) {}

  changeZoom(val) {
    this.zoom += val;
    this.ogSize = false;
    this.autoresize = false;
  }

  ogSizeON() {
    this.ogSize = true;
    this.autoresize = false;
  }

  autoResize() {
    this.ogSize = false;
    this.autoresize = true;
  }

  download2(url: string): Observable<Blob> {
    return this.http.get(url, {
      responseType: 'blob'
    })
  }

  download(): void {
    this.download2(this.pdfSrc)
      .subscribe(blob => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = this.pdfSrc.substring(this.pdfSrc.lastIndexOf('/') + 1);
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
  }

}
