import { Injectable } from '@angular/core';
import { MediaCapture, CaptureVideoOptions } from '@ionic-native/media-capture/ngx';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { File } from '@ionic-native/file/ngx';
import { AngularFireStorage } from '@angular/fire/storage';
import * as uuid from 'uuid';
import { Subject } from 'rxjs';
import { Media, MediaObject } from '@ionic-native/media/ngx';
import { CommonService } from './common.services';

@Injectable({
  providedIn: 'root'
})
export class MediaUploadServices {

  percentChange;
  captureVideoUrl;
  videoGreater = false;
  cancelUpload = false;
  fileRef;
  uploadTask;
  blob;
  progress = 10;
  videoUrl;
  imgUrl;

  constructor(
    private mediaCapture: MediaCapture,
    private camera: Camera,
    private file: File,
    private fireStorage: AngularFireStorage,
    private comService: CommonService,
    private media: Media
  ) {
  }

  upload(blob: Blob, resolve: any, reject: any, type = 'images') {
    console.log(this.cancelUpload);
    this.fileRef = this.fireStorage.storage.ref(`${type}/${uuid.v4()}`);
    this.uploadTask = this.fileRef.put(blob);
    this.uploadTask.on('state_changed', (snapshot: any) => {
      this.progress = ((snapshot.bytesTransferred / snapshot.totalBytes) * 100) < 10 ? 10 : ((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      console.log('snapshot progress' + this.progress);
      console.log(snapshot.state);
      console.log(this.cancelUpload);
      if (this.cancelUpload) {
        this.uploadTask.cancel();
      }
    }, async err => {
      console.log(err);
      reject(err);
    }, () => {
      this.uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
        resolve(downloadURL);
      });
    });
  }

  cancelUploadFile() {
    this.cancelUpload = true;
  }

  base64toBlob(b64: string, type = 'images') {
    var url;
    if (type == 'profiles') url = b64;
    else url = `data:image/jpeg;base64,${b64}`;
    return fetch(url).then(res => {
      return new Promise(async (resolve, reject) => {
        return this.upload(await res.blob(), resolve, reject, type);
      });
    });
  }

  async pickImage(type = 'images') {
    try {
      const options: CameraOptions = {
        quality: 50,
        destinationType: this.camera.DestinationType.DATA_URL,
        sourceType: this.camera.PictureSourceType.PHOTOLIBRARY,
        mediaType: this.camera.MediaType.PICTURE,
        correctOrientation: true
      };
      const cameraInfo = await this.camera.getPicture(options);
      if (type == 'profiles') return `data:image/jpeg;base64,${cameraInfo}`
      else return await this.base64toBlob(cameraInfo, type);
    } catch (e) {
      console.log(e.message);
    }
  }

  async captureImage(type = 'images') {
    try {
      const options: CameraOptions = {
        quality: 50,
        destinationType: this.camera.DestinationType.DATA_URL,
        sourceType: this.camera.PictureSourceType.CAMERA,
        mediaType: this.camera.MediaType.PICTURE,
        correctOrientation: true
      };
      const cameraInfo = await this.camera.getPicture(options);
      if (type == 'profiles') return `data:image/jpeg;base64,${cameraInfo}`
      else return await this.base64toBlob(cameraInfo, type);
    } catch (e) {
      console.log(e.message);
    }
  }
}
