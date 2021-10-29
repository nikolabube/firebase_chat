import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

@Component({
  selector: 'app-cropper-image',
  templateUrl: './cropper-image.page.html',
  styleUrls: ['./cropper-image.page.scss'],
})
export class CropperImagePage implements OnInit {

  imageData
  croppedImage

  @ViewChild(ImageCropperComponent, { static: false }) angularCropper: ImageCropperComponent

  constructor(
    private modalCtrl: ModalController,
    private navParams: NavParams
  ) {
    this.imageData = navParams.get('image')
  }

  ngOnInit() {
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64
  }

  save() {
    this.angularCropper.crop();
    this.modalCtrl.dismiss(this.croppedImage, 'cropped')
  }
}
