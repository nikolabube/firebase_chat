import { GlobalEventService } from 'src/app/services/events.service';
import { PreferenceService } from 'src/app/services/preference.service';
import { ApiService } from 'src/app/services/api.service';
import { NavController, AlertController } from '@ionic/angular';
import { UserData } from './../../models/user';
import { Component, OnInit, ApplicationRef } from '@angular/core';
import moment from 'moment';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit {

  notis: any[] = [];
  moment: any;

  searchTxt: any;

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
      this.apiService.getReceiveInvitations().subscribe((data) => {
        if (data) {
          var e_user = this.notis.filter(ite => ite.key == data.key);
          if (e_user.length > 0) {
            e_user[0].user_data = data.user_data;
          }
        }
      });
    });
    this.apiService.requestSub.subscribe((data) => {
      this.notis = [];
      this.getUsers();
    });
    this.apiService.trackRequest();
  }

  ionViewDidEnter() {
    localStorage.removeItem('new_request');
  }

  getUsers() {
    this.apiService.getReceiveInvitations().subscribe((data) => {
      if (data) {
        var indd = this.notis.findIndex(item => item.key == data.key)
        if (indd == -1) this.notis.push(data);
      }
    });
  }

  accept(user) {
    this.apiService.updateInvitationStatus(user.key, '1');

    var inde = this.preference.my_friends.findIndex(item => item == user.user_data.uid);
    if (inde == -1) {
      this.preference.my_friends.push(user.user_data.uid);
      this.apiService.updateFriends(this.preference.my_uid, this.preference.my_friends).then(() => {
        var index = this.notis.findIndex(item => item.key == user.key);
        this.notis.splice(index, 1);
        this.applicationRef.tick();
      });
      this.apiService.addConversations(user.user_data.uid);
    }

    this.apiService.getUserFriends(user.user_data.uid).then(snap => {
      var snap_val = snap.val();
      var friends = [];
      if (snap_val) {
        friends = snap_val.friends;
        var inde = friends.findIndex(itt => itt == this.preference.my_uid);
        if (inde == -1) {
          friends.push(this.preference.my_uid);
          this.apiService.updateFriends(user.user_data.uid, friends).then(() => {
            this.apiService.sendNotification({
              message: this.preference.currentUser.name + ' accepted your friend request',
              page: 'home',
              fcm_token: user.user_data.fcm_token,
              type: 'accept_request',
              uid: this.preference.my_uid,
              convKey: '',
              vcall_id: ''
            });
          });
        }
      } else {
        friends.push(this.preference.my_uid);
        this.apiService.updateFriends(user.user_data.uid, friends).then(() => {
          this.apiService.sendNotification({
            message: this.preference.currentUser.name + ' accepted your friend request',
            page: 'home',
            fcm_token: user.user_data.fcm_token,
            type: 'accept_request',
            uid: this.preference.my_uid,
            convKey: '',
            vcall_id: ''
          });
        });
      }
    });
  }

  decline(user) {
    this.alertController.create({
      header: "Warning!",
      message: "Are you sure to decline the request?",
      buttons: [
        {
          text: "Yes",
          handler: () => {
            this.apiService.updateInvitationStatus(user.key, '0');
            var index = this.notis.findIndex(item => item.key == user.key);
            this.notis.splice(index, 1);
            this.applicationRef.tick();

            this.apiService.sendNotification({
              message: this.preference.currentUser.name + ' declined your friend request',
              page: 'home',
              fcm_token: user.user_data.fcm_token,
              type: 'declined_request',
              uid: this.preference.my_uid,
              convKey: '',
              vcall_id: ''
            });
          }
        },
        {
          text: "No",
          role: 'cancel'
        }
      ]
    }).then(alert => {
      alert.present()
    });
  }

}
