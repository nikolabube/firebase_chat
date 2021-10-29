import { UserService } from './../../services/user.service';
import { CommonService } from 'src/app/services/common.services';
import { GlobalEventService } from 'src/app/services/events.service';
import { ApiService } from 'src/app/services/api.service';
import { PreferenceService } from 'src/app/services/preference.service';
import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, QueryList, ViewChildren, ApplicationRef } from '@angular/core';
import { Platform, ModalController, AlertController, NavController } from '@ionic/angular';

import { Router, ActivatedRoute, Params } from '@angular/router';

import { UserModel } from '../../../app/shared/models/user-model';
import { OpenViduLayout, OpenViduLayoutOptions } from '../../../app/shared/layout/openvidu-layout';
import { OpenVidu, Session, Stream, StreamEvent, Publisher, SignalOptions, StreamManagerEvent } from 'openvidu-browser';
import { OpenViduService } from '../../../app/shared/services/openvidu.service';

import { trigger, keyframes, state, style, transition, animate } from '@angular/animations';
import { ChatComponent } from '../../../app/shared/components/chat/chat.component';

import { StreamComponent } from '../../../app/shared/components/stream/stream.component';
import { SettingUpModalComponent } from '../../../app/shared/components/setting-up-modal/setting-up-modal.component';
import { NativeAudio } from '@ionic-native/native-audio/ngx';

declare var cordova;

@Component({
  selector: 'app-video-room',
  templateUrl: './video-room.page.html',
  styleUrls: ['./video-room.page.scss'],
  animations: [
    trigger('slideLeftRight', [
      state(
        'in',
        style({
          transform: 'translateX(0px)',
        }),
      ),
      state(
        'out',
        style({
          transform: 'translateX(100px)',
        }),
      ),
      transition('in => out', animate('200ms', keyframes([style({ transform: 'translateX(100px)', display: 'none' })]))),
      transition('out => in', animate('200ms', keyframes([style({ transform: 'translateX(0px)' })]))),
    ]),
    trigger('slideLeftRightChat', [
      state(
        'in',
        style({
          transform: 'translateX(0px)',
        }),
      ),
      state(
        'out',
        style({
          transform: 'translateX(100px)',
        }),
      ),
      transition('in => out', animate('200ms', keyframes([style({ transform: 'translateX(100px)', display: 'none' })]))),
      transition('out => in', animate('200ms', keyframes([style({ transform: 'translateX(0px)' })]))),
    ]),
    trigger('slideTopBottom', [
      state(
        'in',
        style({
          transform: 'translateY(0px)',
        }),
      ),
      state(
        'out',
        style({
          transform: 'translateY(150px)',
        }),
      ),
      transition('in => out', animate('200ms', keyframes([style({ transform: 'translateY(150px)', display: 'none' })]))),
      transition('out => in', animate('200ms', keyframes([style({ transform: 'translateY(0px)' })]))),
    ]),
  ],
})
export class VideoRoomPage implements OnInit, OnDestroy {
  // Constants
  ANDROID_PERMISSIONS = [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS'
  ];
  BIG_ELEMENT_CLASS = 'OV_big';

  buttonsVisibility = 'in';
  chatNotification = 'in';
  cameraBtnColor = 'light';
  camBtnColor = 'light';
  camBtnIcon = 'videocam';
  micBtnColor = 'light';
  micBtnIcon = 'mic';
  chatBtnColor = 'light';
  bigElement: HTMLElement;
  messageReceived = false;
  messageList: { connectionId: string; message: string; userAvatar: string }[] = [];
  modalIsPresented = false;
  setUpModalIsPresented = true;
  videoDevices: any[] = [];

  OV: OpenVidu;
  @ViewChild('mainStream', { static: false }) mainStream: ElementRef;
  session: Session;
  openviduLayout: OpenViduLayout;
  openviduLayoutOptions: OpenViduLayoutOptions;
  mySessionId: string;
  myUserName: string;
  localUser: UserModel;
  remoteUsers: UserModel[] = [];
  resizeTimeout;

  @ViewChildren('streamComponentRemotes') streamComponentRemotes: QueryList<StreamComponent>;
  @ViewChild('streamComponentLocal', { static: false }) streamComponentLocal: StreamComponent;

  audioDevice: any;
  audioDevices: any[] = [];
  speakerphone = false;
  call_id: any;
  incomeCall = false;

  updateInterval: any;
  checkInterval: any;

  /////////////////////////
  durationInterval: any;
  callTimeout: any;
  startTimeout: any;

  callDuration = 0;
  view_call_time = '';

  partner_type = 'normal';
  durationCoins = 0;
  call_type = 'random';
  call_started = false;

  pauseSubscription: any;
  user_coins = 0;

  constructor(
    public platform: Platform,
    private router: Router,
    private route: ActivatedRoute,
    private openViduSrv: OpenViduService,
    public modalController: ModalController,
    public alertController: AlertController,
    private navCtrl: NavController,
    public preference: PreferenceService,
    private api: ApiService,
    private applicationRef: ApplicationRef,
    private nativeAudio: NativeAudio,
    private eventService: GlobalEventService,
    private comService: CommonService,
    private userService: UserService
  ) { }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    this.exitSession();
  }

  @HostListener('window:resize', ['$event'])
  sizeChange(event) {
    clearTimeout(this.resizeTimeout);
    this.updateLayout();
  }

  async ngOnInit() {
    // Open modal to setting up the session
    // const modal = await this.modalController.create({
    //   component: SettingUpModalComponent,
    //   showBackdrop: false,
    //   componentProps: {}
    // });

    // modal.onWillDismiss().then((data: any) => {
    //   if (data.data && data.data.user) {
    //     this.localUser = data.data.user;
    //     this.videoDevices = data.data.videoDevices;
    //     this.setUpModalIsPresented = false;
    //     this.initApp();
    //   } else {
    //     // Go back
    //     this.navCtrl.pop();
    //   }
    // });
    // return await modal.present().then(() => {
    //   this.refreshVideos();
    // });

    this.platform.ready().then(() => {
      this.OV = new OpenVidu();
      this.localUser = new UserModel();
      if (this.platform.is('cordova') && this.platform.is('android')) {
        this.openViduSrv.checkAndroidPermissions().then(() => {
          navigator.mediaDevices.ondevicechange = (ev) => { this.initDevices(); };
          // this.initPublisher().then(() => this.initDevices()).catch((error) => console.log(error));
          this.initDevices().then(() => this.initPublisher()).catch((error) => console.log(error));
        }).catch((err) => {
          console.log(err);
          this.navCtrl.pop();
        });
      } else {
        // this.initPublisher().then(() => {this.initDevices()}).catch((error) => console.log(error));
        this.initDevices().then(() => this.initPublisher()).catch((error) => console.log(error));
      }
    });
  }

  private initPublisher(): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('initialize publisher');
      const device = this.videoDevices.filter((video) =>
        video.deviceId === this.localUser.getVideoSource()
      );

      let isBackCamera = false;
      if (this.platform.is('cordova')) {
        isBackCamera = !!device[0] && device[0].label.includes('Back');
      }
      this.localUser.setIsBackCamera(isBackCamera);

      this.OV.initPublisherAsync(undefined, {
        audioSource: this.localUser.getAudioSource(),
        videoSource: this.localUser.getVideoSource(),
        publishAudio: this.localUser.isAudioActive(),
        publishVideo: this.localUser.isVideoActive(),
        mirror: !this.localUser.isBackCamera()
      })
        .then((publisher: Publisher) => {
          this.localUser.setStreamManager(publisher);
          this.initApp();
          resolve(publisher);
        })
        .catch((error) => reject(error));
    });
  }

  initDevices(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.OV.getDevices().then((devices: any) => {
        this.audioDevices = devices.filter((device) => device.kind === 'audioinput');
        this.videoDevices = devices.filter((device) => device.kind === 'videoinput');
        if (this.platform.is('cordova')) {
          if (this.platform.is('ios')) {
            console.log('iOS platform');
            setTimeout(() => {
              this.refreshVideos();
            }, 1100);
          } else if (this.platform.is('android')) {
            console.log('Android platform');
          }
          this.localUser.setVideoSource(this.videoDevices.filter((device: any) => device.label.includes('Front'))[0].deviceId);
          this.audioDevice = this.audioDevices.length > 0 ? this.audioDevices[0] : { deviceId: "None" };
          const audioSource = this.audioDevice.deviceId === 'None' ? undefined : this.audioDevice.deviceId;
          this.localUser.setAudioActive(!!audioSource);
          this.localUser.setAudioSource(audioSource);
          if (!!audioSource) {
          }
          resolve(true);
          // this.initApp();
        }
      }).catch(err => {
        reject(err);
      });
    })
  }

  private destroyPublisher() {
    console.log('Destroying publisher...');
    if (this.localUser.getStreamManager() && this.localUser.getStreamManager().stream) {
      this.localUser.getStreamManager().stream.disposeWebRtcPeer();
      this.localUser.getStreamManager().stream.disposeMediaStream();
      this.localUser.setStreamManager(null);
    }
  }



  initApp() {
    this.localUser.setType('local');
    this.checkAudioButton();
    this.checkVideoButton();
    this.remoteUsers = [];
    this.generateParticipantInfo();
    this.openviduLayout = new OpenViduLayout();
    this.openviduLayoutOptions = {
      maxRatio: 3 / 2, // The narrowest ratio that will be used (default 2x3)
      minRatio: 9 / 16, // The widest ratio that will be used (default 16x9)
      fixedRatio: false /* If this is true then the aspect ratio of the video is maintained
      and minRatio and maxRatio are ignored (default false)*/,
      bigClass: 'OV_big', // The class to add to elements that should be sized bigger
      bigPercentage: 0.82, // The maximum percentage of space the big ones should take up
      bigFixedRatio: false, // fixedRatio for the big ones
      bigMaxRatio: 3 / 2, // The narrowest ratio to use for the big elements (default 2x3)
      bigMinRatio: 9 / 16, // The widest ratio to use for the big elements (default 16x9)
      bigFirst: false, // Whether to place the big one in the top left (true) or bottom right
      animate: false, // Whether you want to animate the transitions
    };
    this.openviduLayout.initLayoutContainer(document.getElementById('layout'), this.openviduLayoutOptions);
    if (this.platform.is('cordova') && this.platform.is('ios')) {
      this.updateInterval = setInterval(() => {
        this.updateLayout();
      }, 1000);
    }

    this.callTimeout = setTimeout(() => {
      if (!this.incomeCall && !this.call_started) {
        this.exitSession();
        this.userService.updateUserData(this.preference.vcUser.uid, {
          oncall: 'no'
        });
      }
    }, 30 * 1000);

    if (!this.incomeCall) this.joinToSession();
  }

  ngOnDestroy() {
    this.exitSession(false);
  }

  ionViewWillLeave() {
    this.exitSession(false);
    this.pauseSubscription.unsubscribe();
  }

  ionViewDidEnter() {
    this.pauseSubscription = this.platform.pause.subscribe(() => {
      this.exitSession(true);
    })
  }

  joinToSession() {
    // this.OV = new OpenVidu();

    this.session = this.OV.initSession();
    this.subscribeToUserChanged();
    this.subscribeToStreamCreated();
    this.subscribedToStreamDestroyed();
    this.subscribedToChat();
    this.connectToSession();
  }

  exitSession(canBack = true) {
    if (this.session) {
      this.session.disconnect();
    }

    clearInterval(this.checkInterval);
    clearInterval(this.updateInterval);

    clearInterval(this.durationInterval);
    clearTimeout(this.callTimeout);
    clearTimeout(this.startTimeout);

    if (this.call_started) {
      if (!this.incomeCall) {
        // this.saveCallToChatHistory(this.preference.currentUser.id, this.preference.vcUser.id, `had a call for ${this.callDuration} seconds`, 'yes');
        // this.saveCallHistory(this.preference.currentUser.id, this.preference.vcUser.id, this.callDuration);
      }
    }

    this.callDuration = 0;
    this.durationCoins = 0;
    this.call_started = false;

    this.remoteUsers = [];
    this.session = null;
    this.localUser = null;
    this.OV = null;
    this.openviduLayout = null;
    this.incomeCall = false;
    this.view_call_time = '';
    if (this.call_id) this.endCall();
    this.stopAudios();
    this.eventService.publishSomeData({ event: "vcall_ended" })
    if (canBack) this.navCtrl.pop();
  }

  resetVideoSize() {
    const element = document.querySelector('.' + this.BIG_ELEMENT_CLASS);
    if (element) {
      element.classList.remove(this.BIG_ELEMENT_CLASS);
      this.bigElement = undefined;
      this.updateLayout();
    }
  }

  checkVideoButton() {
    if (this.localUser.isVideoActive()) {
      this.camBtnIcon = 'videocam';
      this.camBtnColor = 'light';
    } else {
      this.camBtnIcon = 'eye-off';
      this.camBtnColor = 'primary';
    }
  }

  checkAudioButton() {
    if (this.localUser.isAudioActive()) {
      this.micBtnIcon = 'mic';
      this.micBtnColor = 'light';
    } else {
      this.micBtnIcon = 'mic-off';
      this.micBtnColor = 'primary';
    }
  }

  micStatusChanged(): void {
    this.localUser.setAudioActive(!this.localUser.getStreamManager().stream.audioActive);
    (<Publisher>this.localUser.getStreamManager()).publishAudio(this.localUser.isAudioActive());
    this.checkAudioButton();
  }

  camStatusChanged(): void {
    this.localUser.setVideoActive(!this.localUser.getStreamManager().stream.videoActive);
    (<Publisher>this.localUser.getStreamManager()).publishVideo(this.localUser.isVideoActive());
    this.checkVideoButton();
  }

  toggleCamera() {
    if (this.platform.is('cordova')) {
      if (this.videoDevices && this.videoDevices.length > 0) {
        let videoSource: any;
        // Select the first different device
        videoSource = this.videoDevices.filter((device) => device.deviceId !== this.localUser.getVideoSource())[0];
        console.log('SETTING DEVICE: ', videoSource);
        this.localUser.setVideoSource(videoSource.deviceId);

        this.localUser.setIsBackCamera(!this.localUser.isBackCamera());
        this.session.unpublish(<Publisher>this.localUser.getStreamManager());

        const publisher = this.OV.initPublisher(undefined, {
          videoSource: this.localUser.getVideoSource(),
          publishAudio: this.localUser.isVideoActive(),
          publishVideo: this.localUser.isVideoActive(),
          mirror: !this.localUser.isBackCamera()
        });

        this.cameraBtnColor = this.cameraBtnColor === 'light' ? 'primary' : 'light';
        this.localUser.setStreamManager(null);
        setTimeout(() => {
          this.localUser.setStreamManager(publisher);
          this.updateLayout();
          this.session.publish(publisher);
        });
      }
    }
  }

  async toggleChat() {
    this.buttonsVisibility = 'out';
    this.chatNotification = 'out';
    const modal = await this.modalController.create({
      component: ChatComponent,
      componentProps: { user: this.localUser, messageList: this.messageList },
    });

    modal.onWillDismiss().then(() => {
      this.modalIsPresented = false;
      this.toggleButtons();
      this.updateLayout();
    });

    return await modal.present().then(() => {
      this.modalIsPresented = true;
      this.chatBtnColor = 'light';
      this.messageReceived = false;
    });
  }

  public toggleButtons() {
    this.buttonsVisibility = this.buttonsVisibility === 'in' ? 'out' : 'in';
    this.chatNotification = this.buttonsVisibility;
  }

  public toggleButtonsOrEnlargeStream(event) {
    event.preventDefault();
    event.stopPropagation();
    const path = event.path || event.composedPath();
    const element: HTMLElement = path.filter((e: HTMLElement) => e.className && e.className.includes('OT_root'))[0];
    if (this.bigElement && element === this.bigElement) {
      this.toggleButtons();
    } else if (this.bigElement !== element) {
      if (this.bigElement) {
        this.bigElement.classList.remove(this.BIG_ELEMENT_CLASS);
      } else {
        this.toggleButtons();
      }
      element.classList.add(this.BIG_ELEMENT_CLASS);
      this.bigElement = element;
    }
    this.updateLayout();
  }

  private generateParticipantInfo() {
    this.route.queryParams.subscribe(async (params: Params) => {
      const { user_id, call_id, income, call_kind } = params;
      this.mySessionId = call_id;
      this.call_id = call_id;
      this.incomeCall = income;
      if (call_kind) this.call_type = call_kind;

      this.myUserName = this.preference.currentUser.name;

      if (this.incomeCall) {
        this.nativeAudio.preloadComplex('#incomecall', 'assets/incoming.mp3', 1, 1, 0).then(() => {
          this.nativeAudio.loop('#incomecall').then(() => { });
        });
      } else {
        this.nativeAudio.preloadComplex('#mycall', 'assets/calling.mp3', 1, 1, 0).then(() => {
          this.nativeAudio.loop('#mycall').then(() => { });
        });
        this.setUpModalIsPresented = false;
      }

      this.checkCallStatus();
      this.applicationRef.tick();
    });
  }

  private deleteRemoteStream(stream: Stream): void {
    const userStream = this.remoteUsers.filter((user: UserModel) => user.getStreamManager().stream === stream)[0];
    const index = this.remoteUsers.indexOf(userStream, 0);
    if (index > -1) {
      this.remoteUsers.splice(index, 1);
    }
    // if (this.remoteUsers.length == 0) this.exitSession();
  }


  private subscribeToUserChanged() {
    this.session.on('signal:userChanged', (event: any) => {
      const data = JSON.parse(event.data);
      this.remoteUsers.forEach((user: UserModel) => {
        if (user.getConnectionId() === event.from.connectionId) {
          if (data.avatar !== undefined) {
            user.setUserAvatar(this.preference.vcUser.avatar);
          }
        }
      });
    });
  }

  private subscribeToStreamCreated() {
    let self = this;
    this.session.on('streamCreated', (event: StreamEvent) => {
      console.log('remote stream added == ', event);

      if (this.remoteUsers.length == 0) {
        const subscriber = this.session.subscribe(event.stream, undefined);
        subscriber.on('streamPlaying', (e: StreamManagerEvent) => {
          this.updateLayout();
          (<HTMLElement>subscriber.videos[0].video).parentElement.classList.remove('custom-class');
        });
        const newUser = new UserModel();
        newUser.setStreamManager(subscriber);
        newUser.setConnectionId(event.stream.connection.connectionId);
        const nickname = event.stream.connection.data.split('%')[0];
        try {
          newUser.setNickname(JSON.parse(nickname).clientData);
        } catch (err) {
          newUser.setNickname(nickname);
        }
        newUser.setType('remote');
        newUser.setUserAvatar(this.preference.vcUser.avatar);
        this.remoteUsers.push(newUser);
        this.sendSignalUserAvatar(this.localUser);
        this.buttonsVisibility = 'out';
        this.chatNotification = 'out';

        this.view_call_time = '00:00';

        this.startTimeout = setTimeout(() => {
          this.durationInterval = setInterval(async () => {
            this.callDuration++;
            this.view_call_time = this.preference.calcTime(this.callDuration);
          }, 1000);
        }, 5000);
      }

      this.stopAudios();
      this.call_started = true;
    });
  }

  private subscribedToStreamDestroyed() {
    this.session.on('streamDestroyed', (event: StreamEvent) => {
      this.deleteRemoteStream(event.stream);
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.updateLayout();
      }, 20);
      event.preventDefault();
    });
  }

  private subscribedToChat() {
    this.session.on('signal:chat', (event: any) => {
      const data = JSON.parse(event.data);
      const messageOwner =
        this.localUser.getConnectionId() === data.connectionId
          ? this.localUser
          : this.remoteUsers.filter((user) => user.getConnectionId() === data.connectionId)[0];

      this.messageList.push({
        connectionId: data.connectionId,
        message: data.message,
        userAvatar: messageOwner.getAvatar(),
      });
      ChatComponent.prototype.scrollToBottom();

      if (!this.modalIsPresented) {
        this.chatBtnColor = 'secondary';
        this.messageReceived = true;
        this.chatNotification = 'in';
      }
    });
  }

  private sendSignalUserAvatar(user: UserModel): void {
    const data = {
      avatar: user.getAvatar(),
    };
    const signalOptions: SignalOptions = {
      data: JSON.stringify(data),
      type: 'userChanged',
    };
    this.session.signal(signalOptions);
  }

  private connectToSession(): void {
    this.openViduSrv
      .getToken(this.mySessionId)
      .then((token) => {
        this.connect(token);
      })
      .catch((error) => {
        console.error('There was an error getting the token:', error.code, error.message);
        // this.openAlertError(error.message);
      });
  }

  private connect(token: string): void {
    this.session
      .connect(
        token,
        { clientData: this.myUserName },
      )
      .then(() => {
        this.connectWebCam();
      })
      .catch((error) => {
        console.error('There was an error connecting to the session:', error.code, error.message);
        // this.openAlertError(error.message);
      });
  }

  private connectWebCam(): void {
    this.localUser.setNickname(this.myUserName);
    this.localUser.setConnectionId(this.session.connection.connectionId);
    this.session.publish(<Publisher>this.localUser.getStreamManager());
    this.localUser.getStreamManager().on('streamPlaying', () => {
      (<HTMLElement>this.localUser.getStreamManager().videos[0].video).parentElement.classList.remove('custom-class');
      this.updateLayout();
    });
    var my_avatar = this.preference.currentUser.avatar;
    this.localUser.setUserAvatar(my_avatar);
    this.sendSignalUserAvatar(this.localUser);
    this.updateLayout();
  }

  private updateLayout() {
    this.resizeTimeout = setTimeout(() => {
      if (this.openviduLayout) {
        this.openviduLayout.updateLayout();
        if (this.platform.is('cordova') && this.platform.is('ios')) {
          setTimeout(() => {
            if (this.streamComponentLocal) {
              this.streamComponentLocal.videoComponent.applyIosIonicVideoAttributes();
            }
            if (this.streamComponentRemotes.length > 0) {
              this.streamComponentRemotes.forEach((stream: StreamComponent) => {
                stream.videoComponent.applyIosIonicVideoAttributes();
              });
            }
          }, 250);
        }
      }
    }, 20);
  }

  private refreshVideos() {
    if (this.platform.is('ios') && this.platform.is('cordova')) {
      cordova.plugins.iosrtc.refreshVideos();
    }
  }

  private async openAlertError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error occurred!',
      subHeader: 'There was an error connecting to the session:',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  endCall() {
    this.api.updateVCallStatus(this.call_id, '0').then(() => {
      this.call_id = undefined;
    });
    this.userService.updateUserData(this.preference.vcUser.uid, {
      oncall: 'no'
    });
  }

  async answerCall() {
    this.stopAudios();
    this.joinToSession();

    this.api.updateVCallStatus(this.call_id, '1');
    this.setUpModalIsPresented = false;
  }

  declineCall() {
    this.api.updateVCallStatus(this.call_id, '0').then(() => {
      this.call_id = undefined;
    });
  }

  checkCallStatus() {
    this.api.checkCallStatus(this.call_id).subscribe(status => {
      console.log('status == ', status);
      if (status == '0') {
        this.exitSession();
        this.userService.updateUserData(this.preference.my_uid, {
          oncall: 'no'
        });
      }
    });
  }

  stopAudios() {
    this.nativeAudio.stop('#incomecall');
    this.nativeAudio.stop('#mycall');

    this.nativeAudio.unload('#incomecall').then(() => { });
    this.nativeAudio.unload('#mycall').then(() => { });
  }
}
