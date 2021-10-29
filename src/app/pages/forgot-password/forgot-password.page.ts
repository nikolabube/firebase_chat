import { UserService } from './../../services/user.service';
import { PreferenceService } from 'src/app/services/preference.service';
import { CommonService } from './../../services/common.services';
import { NavController } from '@ionic/angular';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage implements OnInit {

  form: FormGroup;

  constructor(
    private navCtrl: NavController,
    private comService: CommonService,
    public preference: PreferenceService,
    private userService: UserService,
  ) {
    this.form = new FormGroup({
      email: new FormControl('', {
        updateOn: 'change',
        validators: [Validators.required, Validators.email, Validators.pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$")]
      })
    });
  }

  ngOnInit() {
  }

  async submit() {
    await this.comService.showLoader('');
    this.userService.resetPassword(this.form.value.email).then(() => {
      this.comService.hideLoader();
      this.comService.showToast("Check your email to reset password");
      this.navCtrl.pop();
    }).catch(error => {
      console.error(error);
      this.comService.showToast(error);
      this.comService.hideLoader();
    })
  }

}
