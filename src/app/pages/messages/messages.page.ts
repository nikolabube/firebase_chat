import { GlobalEventService } from 'src/app/services/events.service';
import { UserData } from './../../models/user';
import { ApplicationRef, Component, OnInit, ViewChild } from '@angular/core';
import { IonSlides, NavController, MenuController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';
import { CommonService } from 'src/app/services/common.services';
import { PreferenceService } from 'src/app/services/preference.service';

import moment from 'moment';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
})
export class MessagesPage implements OnInit {

  moment: any;

  users: UserData[] = [];
  new_request = false;

  constructor(
    private apiService: ApiService,
    public preference: PreferenceService,
    private comService: CommonService,
    private applicationRef: ApplicationRef,
    private navCtrl: NavController,
    private menuCtrl: MenuController,
    private eventService: GlobalEventService
  ) {
    this.moment = moment;
    this.eventService.getObservable().subscribe(data => {
      if (data.event == 'new_message') {
        this.getUsers();
      } else if (data.event == 'new_request') {
        this.new_request = localStorage.getItem('new_request') ? true : false;
      }
    });
  }

  ngOnInit() {
    this.apiService.trackingUsers.subscribe((data) => {
      this.apiService.getChatters().subscribe((friends: UserData) => {
        if (friends) {
          var e_user = this.users.filter(ite => ite.uid == friends.uid);
          if (e_user.length > 0) {
            e_user[0].online = friends.online;
            e_user[0].last_seen = friends.last_seen;
          }
        }
      });
    });
  }

  showMenu() {
    this.menuCtrl.toggle();
  }

  ionViewDidEnter() {
    this.getUsers();
    localStorage.removeItem('new_mess');
    this.new_request = localStorage.getItem('new_request') ? true : false;
  }

  getUsers() {
    this.apiService.getChatters().subscribe((friends: UserData) => {
      if (friends) {
        var e_user = this.users.filter(ite => ite.uid == friends.uid);
        if (e_user.length == 0) {
          this.users.push(friends);
        } else {
          e_user[0].messages = friends.messages;
          e_user[0].online = friends.online;
          e_user[0].last_seen = friends.last_seen;
        }
        // this.users = friends;
        setTimeout(() => {
          this.users.sort((a, b) => {
            if (a.messages?.created_at > b.messages?.created_at) return -1;
            else if (a.messages?.created_at < b.messages?.created_at) return 1;
            else return 0;
          });
        }, 500);
      }
      console.log('conv users == ', this.users);
    });
  }

  ionViewWillLeave() {

  }

  showMessage(user: UserData) {
    this.preference.userData = user;
    this.preference.share_convKey = user.convKey;
    this.preference.share_uid = user.uid;
    this.navCtrl.navigateForward('chat');
  }
}
