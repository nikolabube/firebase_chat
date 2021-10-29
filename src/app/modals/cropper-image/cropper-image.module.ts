import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CropperImagePageRoutingModule } from './cropper-image-routing.module';
import { ImageCropperModule } from "ngx-image-cropper";
import { CropperImagePage } from './cropper-image.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CropperImagePageRoutingModule,
    ImageCropperModule
  ],
  declarations: [CropperImagePage],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
})
export class CropperImagePageModule {}
