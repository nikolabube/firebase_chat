import { UserService } from './../../services/user.service';
import { PreferenceService } from 'src/app/services/preference.service';
import { ApiService } from 'src/app/services/api.service';
import { ModalController } from '@ionic/angular';
import { UserData } from './../../models/user';
import { Component, Input, OnInit } from '@angular/core';
import moment from 'moment';
import format from 'date-fns/format';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.page.html',
  styleUrls: ['./user-detail.page.scss'],
})
export class UserDetailPage implements OnInit {

  @Input() uid: string;

  moment: any;
  userData: UserData
  joined: any;

  constructor(
    private apiService: ApiService,
    public preference: PreferenceService,
    private modalCtrl: ModalController,
    private userService: UserService
  ) {
    this.moment = moment;
   }

  ngOnInit() {
    this.getUserData();
  }

  getUserData() {
    console.log('uid == ', this.uid);
    this.userService.getUserById(this.uid).then(snap => {
      var user: UserData = snap.val();
      user.uid = this.uid;
      this.userData = user;
      this.joined = format(new Date(this.userData.create_at), 'dd MMM, y');
    })
  }

  close() {
    this.modalCtrl.dismiss();
  }

  startChat() {
    this.modalCtrl.dismiss(this.userData, 'chat');
  }

}
