import { Injectable } from '@angular/core';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  loader: any;

  constructor(
    private toastCtrl: ToastController,
    private loadCtrl: LoadingController,
    private alertCtrl: AlertController,
    private translate: TranslateService
  ) { }

  showToast(message) {
    this.toastCtrl.create({ message: message, duration: 3000 }).then(res => res.present());
  }

  showAlert(message) {
    this.alertCtrl.create({
      message: message,
      buttons: ['ok']
    }).then(res => res.present());
  }

  async showLoader(message) {
    const check = await this.loadCtrl.getTop();
    if (check) {
      this.loadCtrl.dismiss();
    }
    this.loadCtrl.create({ message: message, duration: 5000 }).then(res => {
      this.loader = res.present();
    });
  }

  async hideLoader() {
    const check = await this.loadCtrl.getTop();
    if (check) {
      this.loadCtrl.dismiss();
    } else {
      this.loadCtrl.dismiss();
    }
  }

  async showLoader3() {
    const check = await this.loadCtrl.getTop();
    if (check) {
      this.loadCtrl.dismiss();
    }
    this.loadCtrl.create({ message: "Please wait...", duration: 1000 }).then(res => {
      this.loader = res.present();
    });
  }

  calculate_age(dob: string) {
    var days = dob.split('-');
    var birth = new Date(+days[0], +days[1], +days[2])
    var diff_ms = Date.now() - birth.getTime();
    var age_dt = new Date(diff_ms);  
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  }

  getTranslationWord(word) {
    return new Promise<string>((resolve, reject) => {
      this.translate.get(word).subscribe(res => {
        resolve(res);
      }, error => {
        reject(error);
      });
    });
  }
}