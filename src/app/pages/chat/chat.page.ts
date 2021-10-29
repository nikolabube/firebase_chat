import { UserService } from './../../services/user.service';
import { MediaUploadServices } from './../../services/media-upload.service';
import { UserData, Message } from './../../models/user';
import { GlobalEventService } from './../../services/events.service';
import { ApplicationRef, Component, OnInit, ViewChild } from '@angular/core';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { ActionSheetController, AlertController, IonContent, IonInfiniteScroll, ModalController, NavController, Platform, PopoverController } from '@ionic/angular';
import moment from 'moment';
import { ApiService } from 'src/app/services/api.service';
import { CommonService } from 'src/app/services/common.services';
import { PreferenceService } from 'src/app/services/preference.service';
import { Media, MediaObject } from '@ionic-native/media/ngx';
import { File, FileEntry } from '@ionic-native/File/ngx';
import { CategoryBlockComponent } from 'src/app/components/category-block/category-block.component';
import { Clipboard } from '@ionic-native/clipboard/ngx';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {

  @ViewChild(IonInfiniteScroll, { static: false }) initial: IonInfiniteScroll
  @ViewChild(IonContent, { static: false }) content: IonContent;

  moment: any;
  userData: UserData;
  convKey: any;

  chats: Message[] = []
  last_id = 0;
  maxId = 0;
  new_mess: any;
  showSpinner = false;
  canLoadMore = true;

  typing = false;

  uploadImg: any;

  audioPath
  audio: MediaObject
  isAudioRecording = false;

  scrolledTop = false;
  infoSubscribe: any;

  constructor(
    private apiService: ApiService,
    private comService: CommonService,
    private applicationRef: ApplicationRef,
    public preference: PreferenceService,
    private actionSheetCtrl: ActionSheetController,
    private popCtrl: PopoverController,
    private navCtrl: NavController,
    private camera: Camera,
    public platform: Platform,
    private file: File,
    private media: Media,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private eventService: GlobalEventService,
    private mediaService: MediaUploadServices,
    private userService: UserService,
    private clipboard: Clipboard
  ) {
    this.moment = moment;
  }

  ionViewWillEnter() {
    this.canLoadMore = true;
    this.getData();
  }

  ionViewDidEnter() {
    this.getUserInfo();
    localStorage.removeItem('new_mess');
    this.infoSubscribe = setInterval(() => {
      this.getUserInfo();
    }, 3000)
  }

  ionViewWillLeave() {
    this.apiService.stopGetMesssageFromKey(this.convKey);
    clearInterval(this.infoSubscribe);
  }

  ngOnInit() {
    this.userData = this.preference.userData;
    this.convKey = this.preference.share_convKey;

    this.apiService.trackMessages(this.convKey).subscribe(key => {
      if (key) {
        var indd = this.chats.findIndex(item => item.key == key);
        if (indd != -1) {
          this.chats.splice(indd, 1);
        }
      }
    })
  }

  getUserInfo() {
    this.userService.getUserById(this.preference.share_uid).then(snap => {
      var userData: UserData = snap.val();
      if (userData) {
        userData.uid = snap.key;
        this.userData = this.preference.userData = userData;
        this.applicationRef.tick();
      }
    });
  }

  getData() {
    this.initData()
    this.getMessagesLast20();
  }

  initData() {
    this.last_id = 0;
    this.maxId = 0;
    this.chats = []
  }

  getMessagesLast20() {
    this.apiService.getMessages(this.convKey).subscribe((msg: Message) => {
      console.log('message == ', msg);
      if (msg) {
        if (this.maxId == 0) this.last_id = msg.created_at;
        msg.loaded = false;
        var indd = this.chats.findIndex(item => item.key == msg.key);
        if (indd == -1) this.chats.push(msg);
        this.maxId++;
        this.scrolledTop = false;
      }
      this.scrollToBottom();
    })
  }

  getMoreMessage() {
    this.apiService.getMoreMessage(this.convKey, this.last_id).then((data: Message[]) => {
      this.showSpinner = false;
      data.sort((a, b) => {
        if (a.created_at > b.created_at) return -1;
        else if (a.created_at < b.created_at) return 1;
        else return 0;
      });
      data.forEach(msg => {
        msg.loaded = false;
        this.chats.unshift(msg);
      });
      if (data.length > 0) this.last_id = data[data.length - 1].created_at;
    })
  }

  async selectMessage(message: Message) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: "Method",
      buttons: [{
        text: 'Copy',
        handler: async () => {
          if (message.msg_type == 'text') this.clipboard.copy(message.msg);
          else this.clipboard.copy(message.media_url);
        }
      },
      {
        text: 'Delete',
        handler: async () => {
          this.deleteMessage(message);
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

  deleteMessage(message: Message) {
    if (message.sender == this.preference.my_uid) this.apiService.deleteMessage(this.convKey, message.key);
  }

  async sendMess(text = '') {
    var data: Message = {
      sender: this.preference.my_uid,
      receiver: this.userData.uid,
      msg: text,
      msg_type: 'text',
      media_url: '',
      created_at: Date.now(),
      seen: '0'
    }

    this.apiService.saveMessage(this.convKey, data).then(() => {
      this.new_mess = null;
      this.typing = false;

      this.apiService.sendNotification({
        message: text,
        page: 'chat',
        fcm_token: this.userData.fcm_token,
        type: 'new_message',
        uid: this.preference.my_uid,
        convKey: this.convKey,
        vcall_id: ''
      })
    });
  }

  async sendMedia(img_url = '') {
    var data: Message = {
      sender: this.preference.my_uid,
      receiver: this.userData.uid,
      msg: '',
      msg_type: 'picture',
      media_url: img_url,
      created_at: Date.now(),
      seen: '0'
    }

    this.apiService.saveMessage(this.convKey, data).then(() => {
      this.new_mess = null;
      this.typing = false;

      this.apiService.sendNotification({
        message: 'sent image',
        page: 'chat',
        fcm_token: this.userData.fcm_token,
        type: 'new_message',
        uid: this.preference.my_uid,
        convKey: this.convKey,
        vcall_id: ''
      })
    });
  }


  // picture select part
  async changeImageListener($event) {
    this.uploadImg = null;
    this.uploadImg = $event.target.files[0];
    // this.uploadMedia1('image', this.uploadImg);
  }

  async choosePhotoType() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: "Select Image source",
      buttons: [{
        text: 'Library',
        handler: async () => {
          await this.comService.showLoader('');
          this.mediaService.pickImage('images').then(async (res: any) => {
            if (res != undefined) {
              var imgUrl = res;
              this.sendMedia(imgUrl)
            }
            this.comService.hideLoader();
            this.applicationRef.tick();
          }, err => {
            console.log(err);
            this.comService.hideLoader();
            this.applicationRef.tick();
          });
        }
      },
      {
        text: 'Use Camera',
        handler: async () => {
          await this.comService.showLoader('');
          this.mediaService.captureImage('images').then(async (res: any) => {
            if (res != undefined) {
              var imgUrl = res;
              this.sendMedia(imgUrl)
            }
            this.comService.hideLoader();
            this.applicationRef.tick();
          }, err => {
            this.comService.hideLoader();
            console.log(err);
            this.applicationRef.tick();
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


  takePicture(sourceType: PictureSourceType) {
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
      // this.uploadMedia('image', this.uploadImg);
    }).catch(error => {
    });
  }

  async captureAudio() {
    try {
      let fileName = 'record_' + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);

      if (this.platform.is('ios')) {
        fileName = fileName + '.m4a';
        this.audioPath = this.file.documentsDirectory + fileName;
        this.audio = this.media.create(this.audioPath.replace(/file:\/\//g, ''));
      } else {
        fileName = fileName + '.mp3';
        this.audioPath = this.file.externalDataDirectory + fileName;
        this.audio = this.media.create(this.audioPath.replace(/file:\/\//g, ''));
      }
      console.log('audioPath == ', this.audioPath);

      this.audio.startRecord();
      this.isAudioRecording = true;
      this.applicationRef.tick()
    } catch (error) {
      console.log(error);
    }
  }

  async stopAudio() {
    this.audio.stopRecord();
    this.isAudioRecording = false;

    var sure_send = await this.comService.getTranslationWord('sure_send');
    var send = await this.comService.getTranslationWord('send');
    var no_txt = await this.comService.getTranslationWord('no');
    var alert = await this.alertCtrl.create({
      message: sure_send,
      buttons: [
        {
          text: send,
          handler: async () => {
            var audio_file = await this.convertAudioToBase64(this.audioPath);
            console.log('base 64 == ', audio_file)
            // this.uploadMedia("audio", audio_file);
          }
        },
        {
          text: no_txt,
          role: 'cancel'
        }
      ]
    });
    alert.present();
    this.applicationRef.tick()
  }

  playAudio() {
    try {
      this.audio = this.media.create(this.audioPath);
      this.audio.play();
      this.audio.setVolume(0.8);
    } catch (error) {
      console.log(error);
    }
  }

  private async convertAudioToBase64(audioFile) {
    return new Promise(async (resolve) => {
      let res: any = await this.file.resolveLocalFilesystemUrl(audioFile);
      res.file((resFile) => {
        let reader = new FileReader();
        reader.readAsDataURL(resFile);
        reader.onloadend = async (evt: any) => {
          let encodingType = "data:audio/mp3;base64,";
          let OriginalBase64 = evt.target.result.split(',')[1]; // Remove the "data:video..." string.
          let decodedBase64 = atob(OriginalBase64); // Decode the incorrectly encoded base64 string.
          let encodedBase64 = btoa(decodedBase64); // re-encode the base64 string (correctly).
          let newBase64 = encodingType + encodedBase64; // Add the encodingType to the string.
          resolve(newBase64);
        }
      });
    });
  }

  scrollToBottom() {
    if (this.scrolledTop) return;
    setTimeout(() => {
      this.content.scrollToBottom(700);
    }, 300);
  }

  // async moreAction($event) {
  //   var pop = await this.popCtrl.create({
  //     component: CategoryBlockComponent,
  //     event: $event
  //   });
  //   pop.onDidDismiss().then(async (data) => {
  //     if (data.role == 'add_fav') {
  //       var sendData = {
  //         user_id: this.userData.id,
  //         my_user_id: this.preference.currentUser.id
  //       }
  //       await this.comService.showLoader('')
  //       this.apiService.apiPostFunction('addfavorite', sendData).then(result => {
  //         this.comService.hideLoader()
  //         if (result.status == 200) {
  //           this.comService.showToast(result.message)
  //         }
  //       }).catch(error => {
  //         console.error(error);
  //         this.comService.hideLoader()
  //       })
  //     }
  //   });
  //   pop.present();
  // }

  async privateChat() {
    this.userService.getUserById(this.userData.uid).then(snap => {
      var user: UserData = snap.val();
      user.uid = this.userData.uid;
      if (!user.oncall || user.oncall == 'no') {
        var call_id = this.apiService.saveVCall(this.userData.uid)
        console.log('call_id == ', call_id);
        this.preference.vcUser = user;
        this.navCtrl.navigateForward('videoroom', { queryParams: { user_id: this.userData.uid, call_id: call_id, income: false, call_kind: 'private' } });
        this.eventService.publishSomeData({ event: "vcall_started" });

        this.apiService.sendNotification({
          message: 'want to have video call with you',
          page: 'videoroom',
          fcm_token: this.userData.fcm_token,
          type: 'new_vcall',
          uid: this.preference.my_uid,
          convKey: this.convKey,
          vcall_id: call_id
        })
      } else {
        this.comService.showToast('This user is on call now');
      }
    });
  }

  lossFocus() {
    this.typing = false;
  }

  onScroll($event) {
    if ($event.detail.scrollTop < 1) {
      this.scrolledTop = true;
      if (this.canLoadMore) {
        this.showSpinner = true;
        this.getMoreMessage();
      }
    }
  }

  sendChat(keyCode) {
    if (keyCode == 13) {
      if (this.new_mess && this.new_mess.trim() != '') this.sendMess(this.new_mess);
    } else {
      this.typing = true;
    }
  }

}
