import { AppleSignInErrorResponse, AppleSignInResponse, ASAuthorizationAppleIDRequest, SignInWithApple } from '@ionic-native/sign-in-with-apple/ngx';
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { AngularFireDatabase } from '@angular/fire/database';
import { PreferenceService } from 'src/app/services/preference.service';
import { Platform, NavController } from '@ionic/angular';
import { Injectable } from '@angular/core';
import { UserData } from '../models/user';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, of, combineLatest } from 'rxjs';
import { flatMap, map, switchMap } from 'rxjs/operators';
// import * as firebase from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireStorage } from '@angular/fire/storage';
import { uniq } from 'lodash';
import { InAppBrowser, InAppBrowserOptions } from '@ionic-native/in-app-browser/ngx';
// import { SpinnerDialog } from '@ionic-native/spinner-dialog/ngx';
import { GlobalEventService } from './events.service';
// import { LaunchNavigator, LaunchNavigatorOptions } from '@ionic-native/launch-navigator/ngx';
import firebase from 'firebase/app';
import { CommonService } from './common.services';
import { Geolocation } from '@ionic-native/geolocation/ngx';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  user: Observable<firebase.User>;

  currentUser: UserData;
  fcm_token = '';
  onesignal_token = '';

  constructor(
    private fireAuth: AngularFireAuth,
    private fireStorage: AngularFireStorage,
    private firedb: AngularFireDatabase,
    private iab: InAppBrowser,
    private eventService: GlobalEventService,
    private comService: CommonService,
    private navCtrl: NavController,
    private platform: Platform,
    public preference: PreferenceService,
    private facebook: Facebook,
    private google: GooglePlus,
    private signInWithApple: SignInWithApple
  ) {
    eventService.getObservable().subscribe(data => {

    });
  }

  // showNavigation(address: any) {
  //   let options: LaunchNavigatorOptions = {
  //     destinationName: "Appointment Place",
  //     startName: 'My Location'
  //   }
  //   this.launchNavigator.navigate([
  //     address.lat,
  //     address.lng
  //   ], options).then(data => {
  //   });
  // }

  // showPolicyUrl() {
  //   const url = 'https://barbmo.blogspot.com/2020/11/privacy-policy-terms-and-conditions.html';

  //   const options: InAppBrowserOptions = {
  //     clearcache: "yes",
  //     footer: "no",
  //     fullscreen: "yes",
  //     hardwareback: "yes",
  //     hidespinner: "no",
  //     presentationstyle: "pagesheet",
  //     toolbar: "no",
  //     hidden: "yes",
  //     closebuttoncaption: "Close",
  //     hidenavigationbuttons: "yes",
  //     hideurlbar: "yes",
  //     beforeload: "yes",
  //     location: "yes"
  //   }

  //   const browser = this.iab.create(url, '_system', options);

  //   browser.on('loadstart').subscribe(event => {
  //     this.spinner.show("", "Loading...", false, { textColorBlue: 1, textColorGreen: 1, textColorRed: 1, overlayOpacity: 0.5 });
  //   });
  //   browser.on('loadstop').subscribe(event => {
  //     browser.show();
  //     this.spinner.hide();
  //   });
  //   browser.on('exit').subscribe(event => {
  //     browser.close();
  //   })
  // }

  getUserData() {
    return this.fireAuth.currentUser;
  }

  getUser(id) {
    return this.firedb.object('users/' + id);
  }

  isLogin() {
    return this.fireAuth.authState
  }

  signup(formData) {
    return Observable.create(observer => {
      this.fireAuth.createUserWithEmailAndPassword(formData.email, formData.password).then(registion => {
        this.preference.my_uid = registion.user.uid;
        const saveData: UserData = {
          uid: this.preference.my_uid,
          name: formData.name,
          email: formData.email,
          fcm_token: this.preference.fcm_token,
          lat: this.preference.lat,
          lng: this.preference.lng,
          phone: '',
          address: '',
          last_seen: Date.now(),
          online: '1',
          create_at: Date.now(),
          avatar: 'assets/imgs/default_man.jpg',
          gender: 'male',
          showonmap: 'yes'
        }
        const { uid, ...others } = saveData;
        console.log(saveData);
        this.preference.currentUser = saveData;
        localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
        this.saveUserData(uid, others);
        observer.next(saveData);
      });
    });
  }

  saveUserData(uid, user: UserData) {
    console.log(user);
    this.firedb.object('users/' + uid).set(user)
  }

  login(formData) {
    return this.fireAuth.signInWithEmailAndPassword(formData.email, formData.password);
  }

  resetPassword(email) {
    return this.fireAuth.sendPasswordResetEmail(email)
  }

  logOut() {
    // this.loader.presentLoading();
    return Observable.create(observer => {
      this.fireAuth.signOut().then(() => {
        this.updateUserData(this.preference.my_uid, {
          online: '0',
          last_seen: Date.now(),
        });
        localStorage.removeItem('c_user');
        this.preference.my_uid = null;
        this.preference.currentUser = null;
        this.preference.my_friends = [];
        this.preference.pendings = [];
        this.preference.userData = null;
        this.preference.vcUser = null;
        this.preference.share_uid = '';
        this.preference.share_convKey = '';
        this.eventService.publishSomeData({ event: 'logedout' });
        observer.next();
      })
    });
  }

  updateMyProfile(data: UserData) {
    return firebase.database().ref('users/' + this.preference.my_uid).update(data);
  }

  getUserById(id) {
    return firebase.database().ref('users').child(id).once('value');
  }

  async updateUserData(uid, data) {
    if (data.fcm_token) await firebase.database().ref('users/' + uid + '/fcm_token').set(data.fcm_token);
    if (data.lat) await firebase.database().ref('users/' + uid + '/lat').set(data.lat);
    if (data.lng) await firebase.database().ref('users/' + uid + '/lng').set(data.lng);
    if (data.online) await firebase.database().ref('users/' + uid + '/online').set(data.online);
    if (data.last_seen) await firebase.database().ref('users/' + uid).child('last_seen').set(data.last_seen);
    if (data.oncall) await firebase.database().ref('users/' + uid + '/oncall').set(data.oncall);
    if (data.showonmap) await firebase.database().ref('users/' + uid + '/showonmap').set(data.showonmap);
  }

  trackUserData(id) {
    return Observable.create(observer => {
      this.firedb.database.ref(`users/${id}`).child('currentlocation').on('child_changed', (snap) => {
        var userData = snap.val();
        console.log('user data == ', userData);
        userData.uid = id;//snap.key;
        observer.next(userData);
      });
    });
  }

  deleteStorageFile(downloadUrl) {
    return this.fireStorage.storage.refFromURL(downloadUrl).delete();
  }

  setUserData(user: firebase.User) {
    console.log('social auth == ', user);
    this.preference.my_uid = user.uid;
    const saveData: UserData = {
      uid: this.preference.my_uid,
      name: user.displayName,
      email: user.email,
      fcm_token: this.preference.fcm_token,
      lat: this.preference.lat,
      lng: this.preference.lng,
      phone: user.phoneNumber,
      address: '',
      last_seen: Date.now(),
      online: '1',
      create_at: Date.now(),
      avatar: user['additionalUserInfo'] ? user['additionalUserInfo'].profile['picture'].data.url : user.photoURL ? user.photoURL : 'assets/imgs/default_man.jpg',
      gender: 'male',
      showonmap: 'yes'
    }
    const { uid, ...others } = saveData;
    console.log(saveData);
    this.preference.currentUser = saveData;
    this.saveUserData(uid, others);
    localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
    this.eventService.publishSomeData({ event: 'loggedin' });
    this.navCtrl.navigateRoot('home', { animated: true, animationDirection: 'forward' });
  }
  /**
   *
   */
  async googlePlusLogin() {
    let params;
    if (this.platform.is('ios')) {
      params = {};
    } else {
      params = {
        scopes: '',
        webClientId: '749928035355-sgt8kgsivnm9c42c3eb9frinqp6f95c8.apps.googleusercontent.com',
        offline: true
      };
    }
    this.google.login(params).then((response) => {
      const { idToken, accessToken } = response;
      console.log('google login response == ', response);
      this.loginWithGoogle(idToken, accessToken);
    }).catch(async (error) => {
      let msg = error;
      if (error instanceof Object) {
        msg = error.message;
      }
      this.comService.showAlert(msg);
      console.log('google login error == ', error);
    }).finally(async () => {
    });
  }

  private async loginWithGoogle(accessToken, accessSecret) {
    const credential = accessSecret ? firebase.auth.GoogleAuthProvider.credential(accessToken, accessSecret) :
      firebase.auth.GoogleAuthProvider.credential(accessToken);
    await this.comService.showLoader('')

    const googleResponse = await firebase.auth().signInWithCredential(credential);
    console.log('find googleResponse == ', googleResponse);

    this.preference.my_uid = googleResponse.user.uid;
    this.getUserById(this.preference.my_uid).then(snap => {
      if (snap) {
        var myData: UserData = snap.val();
        myData.uid = snap.key;
        myData.lat = this.preference.lat;
        myData.lng = this.preference.lng;
        myData.last_seen = Date.now();
        myData.fcm_token = localStorage.getItem('fcm_token')
        this.preference.currentUser = myData;

        this.updateUserData(this.preference.my_uid, {
          lat: this.preference.lat,
          lng: this.preference.lng,
          last_seen: Date.now(),
          online: '1',
          fcm_token: localStorage.getItem('fcm_token')
        });

        localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
        this.navCtrl.navigateRoot('home', { animated: true, animationDirection: 'forward' });
        this.eventService.publishSomeData({ event: 'loggedin' });

      } else {
        this.setUserData(googleResponse.user);
      }
    }).catch(err => {
      this.setUserData(googleResponse.user);
    });
  }
  /**
   *
   */
  async facebookLogin() {
    this.facebook.login(['email']).then(async (response: FacebookLoginResponse) => {
      await this.loginWithFaceBook(response);
    }).catch(async (error) => {
      console.log('facebook login error == ', error);
      this.comService.showAlert(`${error.message}`);
    }).finally(async () => {
    });
  }

  private async loginWithFaceBook(res: FacebookLoginResponse) {
    const credential = firebase.auth.FacebookAuthProvider.credential(res.authResponse.accessToken);
    await this.comService.showLoader('')

    const fbLogin = await firebase.auth().signInWithCredential(credential);
    console.log('fbLogin == ', fbLogin)

    this.preference.my_uid = fbLogin.user.uid;
    this.getUserById(this.preference.my_uid).then(snap => {
      if (snap) {
        var myData: UserData = snap.val();
        myData.uid = snap.key;
        myData.lat = this.preference.lat;
        myData.lng = this.preference.lng;
        myData.last_seen = Date.now();
        myData.fcm_token = localStorage.getItem('fcm_token')
        this.preference.currentUser = myData;

        this.updateUserData(this.preference.my_uid, {
          lat: this.preference.lat,
          lng: this.preference.lng,
          last_seen: Date.now(),
          online: '1',
          fcm_token: localStorage.getItem('fcm_token')
        });

        localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
        this.navCtrl.navigateRoot('home', { animated: true, animationDirection: 'forward' });
        this.eventService.publishSomeData({ event: 'loggedin' });

      } else {
        this.setUserData(fbLogin.user);
      }
    }).catch(err => {
      this.setUserData(fbLogin.user);
    });
  }

  appleSignin() {
    let self = this;
    this.signInWithApple.signin({
      requestedScopes: [
        ASAuthorizationAppleIDRequest.ASAuthorizationScopeFullName,
        ASAuthorizationAppleIDRequest.ASAuthorizationScopeEmail
      ]
    }).then(async (res: AppleSignInResponse) => {
      console.log('== apple login result == ', JSON.stringify(res));
      const credential = new firebase.auth.OAuthProvider('apple.com').credential(res.identityToken);
      const aplLogin = await firebase.auth().signInWithCredential(credential);
      console.log('aplLogin == ', aplLogin)
      let user = res;
      var username = user.fullName.givenName + user.fullName.familyName;
      await this.comService.showLoader('');
      var sendData = {
        username: username.toLowerCase(),
        email: user.email,
        password: "apple1234",
        first_name: user.fullName.givenName,
        last_name: user.fullName.familyName,
        lat: this.preference.lat,
        lng: this.preference.lng,
      }

    }).catch((error: AppleSignInErrorResponse) => {
      alert(error.code + ' ' + error.localizedDescription);
      console.error(error);
    });
  }

  /**
   *
   * @returns google login
   */
  GoogleAuth() {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    return this.AuthLogin(provider);
  }

  /**
   *
   * @returns facebook login
   */
  FacebookAuth() {
    return this.AuthLogin(new firebase.auth.FacebookAuthProvider());
  }

  AuthLogin(provider) {
    console.log('cheguei no Auth 2');
    firebase.auth().signInWithRedirect(provider).then(() => {
      return firebase.auth().getRedirectResult();
    }).then(async (result) => {
      console.log('result.user == ', result.user);
      this.preference.my_uid = result.user.uid;
      this.getUserById(this.preference.my_uid).then(snap => {
        if (snap) {
          var myData: UserData = snap.val();
          myData.uid = snap.key;
          myData.lat = this.preference.lat;
          myData.lng = this.preference.lng;
          myData.last_seen = Date.now();
          myData.fcm_token = localStorage.getItem('fcm_token')
          this.preference.currentUser = myData;

          this.updateUserData(this.preference.my_uid, {
            lat: this.preference.lat,
            lng: this.preference.lng,
            last_seen: Date.now(),
            online: '1',
            fcm_token: localStorage.getItem('fcm_token')
          });

          localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
          this.navCtrl.navigateRoot('home', { animated: true, animationDirection: 'forward' });
          this.eventService.publishSomeData({ event: 'loggedin' });

        } else {
          this.setUserData(result.user);
        }
      }).catch(err => {
        this.setUserData(result.user);
      });

    }).catch((error) => {
      // Handle Errors here.
      console.log('erro login', error);
      const errorCode = error.code;
      const errorMessage = error.message;
    });
  }

}
