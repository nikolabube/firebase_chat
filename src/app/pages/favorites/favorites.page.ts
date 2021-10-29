import { UserData } from './../../models/user';
import { ApplicationRef, Component, OnInit } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';
import { PreferenceService } from 'src/app/services/preference.service';
import moment from 'moment';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
})
export class FavoritesPage implements OnInit {

  api_done = false;
  users: UserData[] = [];
  pendings: any[] = [];
  moment: any;

  constructor(
    public preference: PreferenceService,
    private apiService: ApiService,
    private applicationRef: ApplicationRef,
    private navCtrl: NavController,
    private alertController: AlertController
  ) {
    this.moment = moment;
  }

  ngOnInit() {
    this.apiService.trackingUsers.subscribe((data) => {
      this.apiService.getAllMyFriends().then((friends: UserData[]) => {
        friends.forEach(friend => {
          var e_user = this.users.filter(ite => ite.uid == friend.uid);
          if (e_user.length > 0) {
            e_user[0].online = friend.online;
            e_user[0].last_seen = friend.last_seen;
          }
        })
      });

      this.apiService.getSentInvitations().subscribe((user) => {
        if (user) {
          var e_user = this.pendings.filter(ite => ite.key == user.key);
          if (e_user.length > 0) {
            e_user[0].user_data = user.user_data;
          }
        }
      });
    });

    this.apiService.requestSub.subscribe((data) => {
      this.pendings = [];
      this.getPendings();
      this.getUsers();
    });
    this.apiService.trackRequest();
  }

  ionViewDidEnter() {
    this.getUsers();
    this.getPendings();
  }

  getUsers() {
    this.apiService.getAllMyFriends().then((friends: UserData[]) => {
      console.log('all my friends == ', friends);
      this.users = friends;
      this.api_done = true;
    });
  }

  getPendings() {
    this.apiService.getSentInvitations().subscribe((user) => {
      if (user) {
        var indd = this.pendings.findIndex(item => item.key == user.key)
        if (indd == -1) this.pendings.push(user);
      }
    });
  }

  removeFriend(user: UserData) {
    var inde = this.preference.my_friends.findIndex(item => item == user.uid);
    this.preference.my_friends.splice(inde, 1);
    this.apiService.updateFriends(this.preference.my_uid, this.preference.my_friends).then(() => {
      var index = this.users.findIndex(item => item.uid == user.uid);
      this.users.splice(index, 1);
      this.applicationRef.tick();
    });

    this.apiService.getUserFriends(user.uid).then(snap => {
      var snap_val = snap.val();
      var friends = [];
      if (snap_val) {
        friends = snap_val.friends;
        var ind = friends.findIndex(itt => itt == this.preference.my_uid);
        if (ind != -1) {
          friends.splice(ind, 1);
          this.apiService.updateFriends(user.uid, friends).then(() => {
          });
        }
      }
    });
  }

  cancelRequest(user) {
    this.alertController.create({
      header: "Warning!",
      message: "Are you sure to cancel the request?",
      buttons: [
        {
          text: "Yes",
          handler: () => {
            this.apiService.cancelRequest(user.key).then(() => {
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

  async startChat(user: UserData) {
    var convKey = await this.apiService.getConvKey(user.uid);

    this.preference.share_uid = user.uid;
    this.preference.share_convKey = convKey;
    this.preference.userData = user;
    this.navCtrl.navigateForward('chat');
  }
}
