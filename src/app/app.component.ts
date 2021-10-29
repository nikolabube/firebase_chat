import { BackgroundGeolocation, BackgroundGeolocationConfig, BackgroundGeolocationEvents, BackgroundGeolocationLocationProvider, BackgroundGeolocationResponse } from '@ionic-native/background-geolocation/ngx';
import { UserData } from './models/user';
import { UserService } from './services/user.service';
import { Component, ApplicationRef } from '@angular/core';
import { ApiService } from './services/api.service';
import { PreferenceService } from './services/preference.service';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { MenuController, NavController, Platform, ToastController } from '@ionic/angular';
import { OneSignal } from '@ionic-native/onesignal/ngx';
import { GlobalEventService } from './services/events.service';
import { TranslateService } from '@ngx-translate/core';
import { MyEvent } from './services/myevent.services';
import { Geolocation, GeolocationOptions, Geoposition } from '@ionic-native/geolocation/ngx';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {

  pageLoaded = false;
  notificationSubscription: any;
  forgroundSubscription: any;
  backgroundSubscription: any;
  updateTimeline = 0;
  locationTracking: any;

  constructor(
    private apiService: ApiService,
    public preference: PreferenceService,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private platform: Platform,
    private navCtrl: NavController,
    private oneSignal: OneSignal,
    private eventService: GlobalEventService,
    private translate: TranslateService,
    private myEvent: MyEvent,
    private geolocation: Geolocation,
    private firebaseX: FirebaseX,
    private userService: UserService,
    private menuCtrl: MenuController,
    private toastCtrl: ToastController,
    private applicationRef: ApplicationRef,
    private backgroundGeolocation: BackgroundGeolocation
  ) {

    this.initialize();

    this.eventService.getObservable().subscribe(data => {
      if (data.event == 'loggedin') {
        this.enableNotification();
        this.enablePauseResume();
        this.forgroundTrack();
        this.backgroundTrack();
      } else if (data.event == 'logedout') {
        this.platform.pause.unsubscribe();
        this.platform.resume.unsubscribe();
        this.forgroundSubscription.unsubscribe();
        this.notificationSubscription.unsubscribe();
        this.backgroundGeolocation.stop();
      } else if (data.event == 'vcall_ended') {

      } else if (data.event == 'vcall_started') {

      }
    });

    // this.myEvent.getLanguageObservable().subscribe(value => {
    //   this.globalize(value);
    // });
  }

  getAllCountries() {
    // this.apiService.getCoutries().subscribe((result: any) => {
    //   this.preference.countries = result;
    // })
  }

  initialize() {
    this.platform.ready().then(() => {

      let defaultLang = localStorage.getItem('lang') ? localStorage.getItem('lang') : 'en';
      this.globalize(defaultLang);

      ///////////////////////   onesignal //////////////
      // this.oneSignal.startInit('e2e0c840-1878-42eb-94eb-0692c9972191', '125009516310');

      // this.oneSignal.getTags().then((value) => {
      //   console.log('Tags Received: ' + JSON.stringify(value));
      // });

      // this.oneSignal.getIds().then(data => {
      //   console.log("Onesignal Playerid:= " + data.userId);//  device id
      //   this.preference.onesignal_token = data.userId;
      // });

      // this.oneSignal.inFocusDisplaying(this.oneSignal.OSInFocusDisplayOption.InAppAlert);

      // this.oneSignal.handleNotificationReceived().subscribe((res) => {
      //   console.log("noti received == ", res.payload.body);
      //   localStorage.get_noti = true;
      // });

      // this.oneSignal.handleNotificationOpened().subscribe((res) => {
      //   this.navCtrl.navigateForward("messages");
      //   console.log("noti opended == ", res.notification.payload.body);
      // });

      // this.oneSignal.endInit();
      // this.oneSignal.setSubscription(true);
      ////////////////////////////////////////////////////

      this.firebaseX.getToken().then(token => {
        console.log(`The token is ${token}`);
        this.preference.fcm_token = token;
        localStorage.setItem('fcm_token', token)
      });

      this.preference.lat = localStorage.getItem('lat') ? Number(localStorage.getItem('lat')) : 0;
      this.preference.lng = localStorage.getItem('lng') ? Number(localStorage.getItem('lng')) : 0;

      this.geolocation.getCurrentPosition().then((geo: Geoposition) => {
        this.preference.lat = geo.coords.latitude
        this.preference.lng = geo.coords.longitude
        console.log('%s, %s', this.preference.lat, this.preference.lng);
        localStorage.setItem('lat', '' + geo.coords.latitude);
        localStorage.setItem('lng', '' + geo.coords.longitude)
      }).catch(error => {
        console.error('error === ', error);
      });

      if (localStorage.getItem('c_user')) {
        this.preference.currentUser = JSON.parse(localStorage.getItem('c_user'));
        this.preference.my_uid = this.preference.currentUser.uid;

        this.userService.updateUserData(this.preference.my_uid, {
          lat: this.preference.lat,
          lng: this.preference.lng,
          last_seen: Date.now(),
          online: '1'
        });

        this.navCtrl.navigateRoot('home', { animated: true, animationDirection: 'forward' }).then(() => {
          this.pageLoaded = true;
          this.splashScreen.hide();
        });

        this.enableNotification();
        this.enablePauseResume();
        this.forgroundTrack();
        this.backgroundTrack();

      } else {
        this.navCtrl.navigateRoot('login').then(() => {
          this.pageLoaded = true;
          this.splashScreen.hide();
        });;
      }

      this.statusBar.styleDefault();
      this.statusBar.overlaysWebView(false);
      this.statusBar.styleLightContent();
    });
  }

  enableNotification() {
    this.notificationSubscription = this.firebaseX.onMessageReceived().subscribe(data => {
      console.log(`FCM message: ${JSON.stringify(data)}`);
      if (data.tap && data.tap == 'background') {
        if (data.landing_page != 'home') {
          this.preference.share_uid = data.uid;
          this.preference.share_convKey = data.convKey;
          this.userService.getUserById(this.preference.share_uid).then(snap => {
            var userData: UserData = snap.val();
            if (userData) {
              userData.uid = snap.key;
              this.preference.userData = userData;
              if (data.noti_type == 'new_vcall') {
                this.preference.vcUser = userData;
                this.navCtrl.navigateForward('videoroom', { queryParams: { user_id: data.uid, call_id: data.vcall_id, income: true, call_kind: 'private' } });
                this.eventService.publishSomeData({ event: "vcall_started" });
              } else {
                this.navCtrl.navigateForward(data.landing_page);
              }
            }
          });
        }
      } else if (data.noti_type == 'new_vcall') {
        this.userService.getUserById(data.uid).then(snap => {
          var userData: UserData = snap.val();
          if (userData) {
            userData.uid = snap.key;
            this.preference.vcUser = userData;
            this.navCtrl.navigateForward('videoroom', { queryParams: { user_id: data.uid, call_id: data.vcall_id, income: true, call_kind: 'private' } });
            this.eventService.publishSomeData({ event: "vcall_started" });
          }
        });
      } else {
        this.toastCtrl.create({
          message: data.data,
          position: 'top',
          duration: 2000
        }).then(toast => toast.present());
      }

      if (data.noti_type == 'new_message') {
        this.eventService.publishSomeData({ event: 'new_message' });
        localStorage.setItem('new_mess', 'yes');
      }
      if (data.noti_type == 'new_request') {
        localStorage.setItem('new_request', 'yes');
        this.eventService.publishSomeData({ event: 'new_request' });
      }
    });
  }

  enablePauseResume() {

    this.platform.pause.subscribe(() => {
      this.updateTimeline = 0;
      // this.backgroundGeolocation.start();
      this.userService.updateUserData(this.preference.my_uid, {
        online: '0',
        last_seen: Date.now(),
      });
    });

    this.platform.resume.subscribe(() => {
      this.updateTimeline = 0;
      // this.backgroundGeolocation.stop();
      this.userService.updateUserData(this.preference.my_uid, {
        online: '1',
        last_seen: Date.now(),
      });
    });
  }

  globalize(languagePriority = '') {
    this.translate.setDefaultLang("en");
    let defaultLangCode = "en";
    this.preference.defaultLang = languagePriority;
    this.translate.use(languagePriority != '' ? languagePriority : defaultLangCode);
  }

  gotoPage(page) {
    if (page == 'edit-profile') {
      this.navCtrl.navigateForward(page);
      this.menuCtrl.close()
    } else {
      this.navCtrl.navigateForward(page);
    }
  }

  logout() {
    this.userService.logOut().subscribe(() => {
      this.navCtrl.navigateRoot('login', { animated: true, animationDirection: 'back' });
    });
  }

  turnOnOff() {
    if (!this.preference.currentUser.showonmap || this.preference.currentUser.showonmap == 'yes') {
      this.preference.currentUser.showonmap = 'no';
      localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
      this.userService.updateUserData(this.preference.my_uid, {
        showonmap: 'no'
      }).then(() => {
        this.applicationRef.tick();
      });
    } else {
      this.preference.currentUser.showonmap = 'yes';
      localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
      this.userService.updateUserData(this.preference.my_uid, {
        showonmap: 'yes'
      }).then(() => {
        this.applicationRef.tick();
      });
    }
  }

  forgroundTrack() {
    var options: GeolocationOptions = {
      enableHighAccuracy: true
    }
    this.forgroundSubscription = this.geolocation.watchPosition(options).subscribe((geo: Geoposition) => {
      this.updateTimeline++;

      if (geo.coords && this.preference.my_uid) {
        this.preference.lat = geo.coords.latitude
        this.preference.lng = geo.coords.longitude;

        if (this.updateTimeline > 5) {
          this.userService.updateUserData(this.preference.my_uid, {
            lat: this.preference.lat,
            lng: this.preference.lng
          });

          this.updateTimeline = 0;
        }
      }
    });
  }

  backgroundTrack() {
    const config: BackgroundGeolocationConfig = {
      locationProvider: BackgroundGeolocationLocationProvider.DISTANCE_FILTER_PROVIDER,
      desiredAccuracy: 0,
      stationaryRadius: 20,
      distanceFilter: 30,
      interval: 10000,
      fastestInterval: 5000,
      activitiesInterval: 10000,
      // startForeground: true,
      url: 'https://us-central1-wherez-ac670.cloudfunctions.net/trackLocation',//'https://ondetemtiroteio.com/public/api/tracking',
      // customize post properties
      postTemplate: {
        lat: '@latitude',
        lon: '@longitude',
        uid: this.preference.my_uid, // you can also add your own properties
        // username: this.preference.currentUser.name
      },
      debug: false, //  enable this hear sounds for background-geolocation life-cycle.
      stopOnTerminate: false, // enable this to clear background location settings when the app terminates
    };

    this.backgroundGeolocation.configure(config).then((data) => {
      console.log('back data == ', data);

      this.backgroundGeolocation.on(BackgroundGeolocationEvents.location).subscribe((location: BackgroundGeolocationResponse) => {
        console.log('location location == ', location);
        if (this.platform.is('ios')) {
          this.backgroundGeolocation.startTask().then((key) => {
            this.preference.lat = location.latitude
            this.preference.lng = location.longitude;
            // this.updateUserLocation(location.latitude, location.longitude, true);
            this.backgroundGeolocation.endTask(key);
            this.backgroundGeolocation.finish(); // FOR IOS ONLY
          });
        } else {
          this.preference.lat = location.latitude
          this.preference.lng = location.longitude;
          // this.updateUserLocation(location.latitude, location.longitude, true);
        }

        this.backgroundGeolocation.deleteLocation(location.id);
      });

      this.backgroundGeolocation.on(BackgroundGeolocationEvents.stationary).subscribe((location: BackgroundGeolocationResponse) => {
        console.log('stationary location == ', location);
        if (this.platform.is('ios')) {
          this.backgroundGeolocation.startTask().then((key) => {
            this.preference.lat = location.latitude
            this.preference.lng = location.longitude;
            // this.updateUserLocation(location.latitude, location.longitude, true);
            this.backgroundGeolocation.endTask(key);
            this.backgroundGeolocation.finish(); // FOR IOS ONLY
          });
        } else {
          this.preference.lat = location.latitude
          this.preference.lng = location.longitude;
          // this.updateUserLocation(location.latitude, location.longitude, true);
        }
        this.backgroundGeolocation.deleteLocation(location.id);
      });

      this.backgroundGeolocation.on(BackgroundGeolocationEvents.start).subscribe((location: BackgroundGeolocationResponse) => {
        console.log('[INFO] BackgroundGeolocation service has been started == ', location);
      });

      this.backgroundGeolocation.on(BackgroundGeolocationEvents.stop).subscribe((location: BackgroundGeolocationResponse) => {
        console.log('[INFO] BackgroundGeolocation service has been stopped == ', location);
      });

      this.backgroundGeolocation.on(BackgroundGeolocationEvents.authorization).subscribe((status: BackgroundGeolocationResponse) => {
        console.log('[INFO] BackgroundGeolocation authorization status: ', status);
        this.backgroundGeolocation.showAppSettings();
      });

      this.backgroundGeolocation.on(BackgroundGeolocationEvents.background).subscribe((location: BackgroundGeolocationResponse) => {
        console.log('[INFO] App is in background == ', location);
      });

      this.backgroundGeolocation.on(BackgroundGeolocationEvents.foreground).subscribe((location: BackgroundGeolocationResponse) => {
        console.log('[INFO] App is in foreground == ', location);
      });
    });

    this.backgroundGeolocation.start();
  }

  updateUserLocation(lat, lng, sendNoti = false) {
    this.apiService.sendNotification({
      message: this.preference.currentUser.name + ' moved in background',
      page: 'home',
      fcm_token: 'd3mhOiHBQQKxRWtGmR-V54:APA91bEBrlFeDnUlrWVWAZqHUiHB_Q19VqaNmcmQ8bza0M3NDCFDnAdlCoKc_PgiAXcfTl_Hhy9enxMiilU1GUAwtlI_DGK1QYEvdMbXY9S8mORuijoYDfep1ugihLwGOs3oeopg07UW',
      type: 'update_location',
      uid: this.preference.my_uid,
      convKey: '',
      vcall_id: ''
    });
    return;

    // if (!this.preference.my_uid) return;
    // this.userService.updateUserData(this.preference.my_uid, {
    //   lat: lat,
    //   lng: lng
    // }).then(() => {
    //   if (sendNoti) {
    //     this.apiService.sendNotification({
    //       message: this.preference.currentUser.name + ' moved in background',
    //       page: 'home',
    //       fcm_token: 'd3mhOiHBQQKxRWtGmR-V54:APA91bEBrlFeDnUlrWVWAZqHUiHB_Q19VqaNmcmQ8bza0M3NDCFDnAdlCoKc_PgiAXcfTl_Hhy9enxMiilU1GUAwtlI_DGK1QYEvdMbXY9S8mORuijoYDfep1ugihLwGOs3oeopg07UW',
    //       type: 'update_location',
    //       uid: this.preference.my_uid,
    //       convKey: '',
    //       vcall_id: ''
    //     })
    //   }
    // });
  }
}
