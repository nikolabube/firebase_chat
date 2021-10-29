import { TopHeaderComponent } from './top-header/top-header.component';
import { OpenViduVideoComponent } from './../shared/components/stream/ov-video.component';
import { StreamComponent } from './../shared/components/stream/stream.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CategoryItemComponent } from './category-item/category-item.component';
import { CategoryBlockComponent } from './category-block/category-block.component';
import { FooterComponent } from './footer/footer.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule.forRoot(),
    TranslateModule
  ],
  declarations: [
    CategoryItemComponent,
    CategoryBlockComponent,
    FooterComponent,
    StreamComponent,
    OpenViduVideoComponent,
    TopHeaderComponent
  ],
  exports: [
    CategoryItemComponent,
    CategoryBlockComponent,
    FooterComponent,
    StreamComponent,
    OpenViduVideoComponent,
    TopHeaderComponent
  ],
  entryComponents: [],
})
export class ComponentsModule {}
