import { UserData } from './../../models/user';
import { UserService } from './../../services/user.service';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavController, Platform, AlertController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';
import { CommonService } from 'src/app/services/common.services';
import { GlobalEventService } from 'src/app/services/events.service';
import { PreferenceService } from 'src/app/services/preference.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  form: FormGroup;
  subscription: any;

  constructor(
    private navCtrl: NavController,
    private comService: CommonService,
    public preference: PreferenceService,
    private apiService: ApiService,
    private eventService: GlobalEventService,
    private firebaseX: FirebaseX,
    private userService: UserService,
    public platform: Platform,
    private alertController: AlertController
  ) {
    this.form = new FormGroup({
      email: new FormControl('', {
        updateOn: 'change',
        validators: [Validators.required, Validators.email, Validators.pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$")]
      }),
      password: new FormControl('', {
        updateOn: 'change',
        validators: [Validators.required, Validators.minLength(6)]
      })
    });
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.firebaseX.getToken().then(token => {
      console.log(`The token is ${token}`);
      this.preference.fcm_token = token;
      localStorage.setItem('fcm_token', token)
    });

    this.subscription = this.platform.backButton.subscribe(() => {
      this.presentAlertConfirm();
    });
  }

  async login() {
    await this.comService.showLoader('');
    this.userService.login(this.form.value).then((result) => {
      this.comService.hideLoader();
      this.preference.my_uid = result.user.uid;
      this.userService.getUserById(this.preference.my_uid).then((snap) => {
        var myData: UserData = snap.val();
        myData.uid = snap.key;
        myData.lat = this.preference.lat;
        myData.lng = this.preference.lng;
        myData.last_seen = Date.now();
        myData.fcm_token = localStorage.getItem('fcm_token')
        this.preference.currentUser = myData;

        this.userService.updateUserData(this.preference.my_uid, {
          lat: this.preference.lat,
          lng: this.preference.lng,
          last_seen: Date.now(),
          online: '1',
          fcm_token: localStorage.getItem('fcm_token')
        });

        localStorage.setItem('c_user', JSON.stringify(this.preference.currentUser));
        this.navCtrl.navigateRoot('home', { animated: true, animationDirection: 'forward' });
        this.eventService.publishSomeData({event: 'loggedin'});

      }).catch(err => {
        console.error('=====', err);
        this.comService.showToast(err);
      })
    }).catch(error => {
      console.error(error);
      this.comService.hideLoader();
      this.comService.showToast(error);
    });
  }

  fbLogin() {
    this.userService.facebookLogin();
  }

  glLogin() {
    this.userService.googlePlusLogin();
  }

  aplLogin() {
    this.userService.appleSignin();
  }

  ionViewWillLeave() {
    this.subscription.unsubscribe();
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      header: 'Exit App',
      message: 'Are you sure to close?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Confirm Cancel: blah');
          }
        }, {
          text: 'Yes',
          handler: () => {
            navigator['app'].exitApp();
          }
        }
      ]
    });
    await alert.present();
  }

}
