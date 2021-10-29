import { GlobalEventService } from 'src/app/services/events.service';
import { UserService } from './../../services/user.service';
import { UserData } from './../../models/user';
import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';
import { CommonService } from 'src/app/services/common.services';
import { PreferenceService } from 'src/app/services/preference.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {

  form: FormGroup;

  agree_term = false;

  constructor(
    private apiService: ApiService,
    public preference: PreferenceService,
    private comService: CommonService,
    private navCtrl: NavController,
    private firebaseX: FirebaseX,
    private userService: UserService,
    private eventService: GlobalEventService
  ) {
    this.form = new FormGroup({
      name: new FormControl('', {
        updateOn: 'change',
        validators: [Validators.required]
      }),
      email: new FormControl('', {
        updateOn: 'change',
        validators: [Validators.required, Validators.email, Validators.pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$")]
      }),
      password: new FormControl('', {
        updateOn: 'change',
        validators: [Validators.required, Validators.minLength(6)]
      }),
      c_password: new FormControl('', {
        updateOn: 'change',
        validators: [Validators.required, Validators.minLength(6)]
      })
    });
  }

  ngOnInit() {
    this.firebaseX.getToken().then(token => {
      console.log(`The token is ${token}`);
      this.preference.fcm_token = token;
      localStorage.setItem('fcm_token', token)
    });
  }

  async signup() {
    if (this.form.value.password != this.form.value.c_password) {
      var password_dont_match = await this.comService.getTranslationWord('password_dont_match');
      this.comService.showToast(password_dont_match);
      return;
    }
    await this.comService.showLoader('');
    this.userService.signup(this.form.value).subscribe((data: UserData) => {
      this.comService.hideLoader();
      this.navCtrl.navigateRoot('home', { animated: true, animationDirection: 'forward' });
      this.eventService.publishSomeData({ event: 'loggedin' });
    });
  }

  showContent(link) {
    var url = link
    this.apiService.showLinkUrl(url);
  }

}
