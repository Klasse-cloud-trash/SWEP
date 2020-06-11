import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab3Page } from './tab3.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { PdfViewerModule } from 'ng2-pdf-viewer';

import { Tab3PageRoutingModule } from './tab3-routing.module'

import { HttpClientModule }    from '@angular/common/http';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    RouterModule.forChild([{ path: '', component: Tab3Page }]),
    Tab3PageRoutingModule,
    PdfViewerModule,
    HttpClientModule
  ],
  declarations: [Tab3Page]
})
export class Tab3PageModule {}
