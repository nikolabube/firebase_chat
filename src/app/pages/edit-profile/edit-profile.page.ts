import { UserService } from './../../services/user.service';
import { CropperImagePage } from './../../modals/cropper-image/cropper-image.page';
import { MediaUploadServices } from './../../services/media-upload.service';
import { UserData } from './../../models/user';
import { ApplicationRef, Component, OnInit } from '@angular/core';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { ActionSheetController, Platform, ModalController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';
import { CommonService } from 'src/app/services/common.services';
import { PreferenceService } from 'src/app/services/preference.service';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
})
export class EditProfilePage implements OnInit {

  userData: UserData;

  name
  phone
  address
  gender

  uploadImg: any;
  uploading = false;

  constructor(
    public preference: PreferenceService,
    private apiService: ApiService,
    private comServcie: CommonService,
    private applicationRef: ApplicationRef,
    public platform: Platform,
    private actionSheetController: ActionSheetController,
    private camera: Camera,
    public mediaService: MediaUploadServices,
    private modalCtrl: ModalController,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.userData = this.preference.currentUser
    this.name = this.userData.name
    this.phone = this.userData.phone
    this.address = this.userData.address
    this.gender = this.userData.gender
  }

  // picture select part
  changeImageListener($event, type = 'profile') {
    let self = this
    self.uploadImg = null;
    self.uploadImg = $event.target.files[0];
  }

  async choosePhotoType(type = 'profile') {
    const actionSheet = await this.actionSheetController.create({
      header: 'Select Option',
      buttons: [{
        text: 'Camera',
        icon: 'camera',
        handler: () => {
          this.uploading = true;
          this.mediaService.captureImage('profiles').then(async (res: any) => {
            if (res != undefined) {
              console.log('profile image from camera =-= ', res)
              this.showCropperModal(res)
            } else {
              this.uploading = false;
            }
          }, err => {
            this.uploading = false;
            console.log(err);
          });
        }
      },
      {
        text: 'Upload Image',
        icon: 'image',
        handler: () => {
          this.uploading = true;
          this.mediaService.pickImage('profiles').then(async (res: any) => {
            if (res != undefined) {
              console.log('profile image =-= ', res)
              this.showCropperModal(res)
            } else {
              this.uploading = false;
            }
          }, err => {
            this.uploading = false;
            console.log(err);
          });
        }
      },
      {
        text: 'Cancel',
        role: 'cancel'
      }
      ]
    });
    await actionSheet.present();
  }

  async showCropperModal(imageData) {
    var modal = await this.modalCtrl.create({
      component: CropperImagePage,
      cssClass: 'crop_image',
      componentProps: { image: imageData }
    });
    modal.onDidDismiss().then(resp => {
      if (resp.role && resp.role == 'cropped') {
        this.uploadImg = resp.data
        this.mediaService.base64toBlob(this.uploadImg, 'profiles').then(async (res: any) => {
          if (res != undefined) {
            var imgUrl = res;
            this.userData.avatar = imgUrl;
            this.uploading = false;
          } else {
            this.uploading = false;
          }
        }, err => {
          this.uploading = false;
          console.log(err);
        });
      } else {
        this.uploading = false;
      }
    });
    modal.present();
  }

  async update() {
    await this.comServcie.showLoader('');

    this.userData.name = this.name;
    this.userData.address = this.address;
    this.userData.phone = this.phone;
    this.userData.gender = this.gender;

    const {uid, ...others} = this.userData

    this.userService.updateMyProfile(others).then(() => {
      this.comServcie.hideLoader();
      this.preference.currentUser = this.userData;
      localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
    }).catch(error => {
      console.error(error);
      this.comServcie.hideLoader();
    })
  }



  takePicture(sourceType: PictureSourceType, type) {
    let options: CameraOptions = {
      quality: 50,
      destinationType: this.camera.DestinationType.DATA_URL,
      mediaType: 0,
      sourceType: sourceType,
      encodingType: this.camera.EncodingType.JPEG,
      correctOrientation: true
    };

    this.camera.getPicture(options).then(async (filepath) => {
      var img_data = "data:image/jpeg;base64," + filepath;
      this.uploadImg = img_data;
    }).catch(error => {
    });
  }





}
