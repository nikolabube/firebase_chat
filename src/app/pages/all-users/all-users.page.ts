import { UserData } from './../../models/user';
import { GlobalEventService } from 'src/app/services/events.service';
import { PreferenceService } from 'src/app/services/preference.service';
import { ApiService } from 'src/app/services/api.service';
import { NavController, AlertController } from '@ionic/angular';
import { Component, OnInit, ApplicationRef } from '@angular/core';
import moment from 'moment';

@Component({
  selector: 'app-all-users',
  templateUrl: './all-users.page.html',
  styleUrls: ['./all-users.page.scss'],
})
export class AllUsersPage implements OnInit {

  users: UserData[] = [];
  allUsers: UserData[] = [];
  moment: any;

  searchTxt: any;
  api_done = false;

  constructor(
    private navCtrl: NavController,
    private apiService: ApiService,
    public preference: PreferenceService,
    private alertController: AlertController,
    private applicationRef: ApplicationRef,
    private eventService: GlobalEventService
  ) {
    this.moment = moment;
  }

  ngOnInit() {
    this.getUsers();

    this.apiService.trackingUsers.subscribe((data) => {
      this.apiService.allUserData.subscribe((user: UserData) => {
        if (user) {
          var e_user = this.allUsers.filter(ite => ite.uid == user.uid);
          if (e_user.length > 0) {
            e_user[0].online = user.online;
            e_user[0].last_seen = user.last_seen;
          }
        }
      });
    });
  }

  getUsers() {
    this.apiService.allUserData.subscribe((user: UserData) => {
      if (user) {
        var index = this.preference.my_friends.findIndex(item => item == user.uid);
        var p_index = this.preference.pendings.findIndex(ite => ite == user.uid);
        var a_index = this.allUsers.findIndex(itet => itet.uid == user.uid);
        if (index == -1 && p_index == -1 && a_index == -1) {
          this.users.push(user);
          this.allUsers.push(user);
        }
      }
    });
    this.apiService.getAllUsers();
  }

  searchUser($event) {
    this.searchTxt;
    var val = $event.target.value;
    if (val && val.trim() != '') {
      this.users = this.allUsers.filter(item => item.name.toLowerCase().includes(val.toLowerCase()));
    } else {
      this.users = this.allUsers;
    }
  }

  addFriend(user: UserData) {
    this.apiService.sendFriendRequest(user.uid).then(() => {
      this.apiService.sendNotification({
        message: this.preference.currentUser.name + ' sent you a friend request',
        page: 'notifications',
        fcm_token: user.fcm_token,
        type: 'new_request',
        uid: this.preference.my_uid,
        convKey: '',
        vcall_id: ''
      });
      var index = this.users.findIndex(item => item.uid == user.uid);
      this.users.splice(index, 1);
      this.applicationRef.tick();
    });
  }

}
