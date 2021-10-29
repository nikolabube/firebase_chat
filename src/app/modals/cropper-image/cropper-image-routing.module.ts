import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CropperImagePage } from './cropper-image.page';

const routes: Routes = [
  {
    path: '',
    component: CropperImagePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CropperImagePageRoutingModule {}
