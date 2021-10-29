import { UserData, Message } from './../models/user';
import { AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HTTP } from '@ionic-native/http/ngx';
import { NavController, Platform } from '@ionic/angular';
import { FileTransfer, FileTransferObject, FileUploadOptions } from '@ionic-native/file-transfer/ngx';
import { InAppBrowser, InAppBrowserOptions } from '@ionic-native/in-app-browser/ngx';
import { PreferenceService } from './preference.service';
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { CommonService } from './common.services';
import * as firebase from 'firebase';
import { GlobalEventService } from './events.service';
import { BehaviorSubject, observable, Observable } from 'rxjs';

const headers = new HttpHeaders();
headers.append('Content-Type', 'multipart/form-data');

const httpOptions = {
  headers: headers
};

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  allUserData = new BehaviorSubject(null);
  trackingUsers = new BehaviorSubject(null);
  requestSub = new BehaviorSubject(null);

  constructor(
    private http: HttpClient,
    private nativeHttp: HTTP,
    private platform: Platform,
    private transfer: FileTransfer,
    private iab: InAppBrowser,
    public preference: PreferenceService,
    private firedb: AngularFireDatabase
  ) { }

  getCoutries() {
    return this.http.get('https://restcountries.eu/rest/v2/all')
  }

  showLinkUrl(url) {
    const options: InAppBrowserOptions = {
      clearcache: "yes",
      footer: "no",
      fullscreen: "yes",
      hardwareback: "yes",
      hidespinner: "no",
      presentationstyle: "pagesheet",
      toolbar: "no",
      hidden: "yes",
      closebuttoncaption: "Close",
      hidenavigationbuttons: "yes",
      hideurlbar: "yes",
      beforeload: "yes",
      location: "yes"
    }

    const browser = this.iab.create('https://wherez.chat/privacy-policy.html', '_system', options);

    browser.on('loadstart').subscribe(event => {
    });
    browser.on('loadstop').subscribe(event => {
      browser.show();
    });
    browser.on('exit').subscribe(event => {
      browser.close();
    })
  }

  sendNotification(data) {
    const body = {
      'notification': {
        'title': this.preference.currentUser.name,
        'body': data.message,
        'sound': 'default',
        'icon': 'ic_launcher'
      },
      'data': {
        'landing_page': data.page,
        'data': data.message,
        'noti_type': data.type,
        'uid': data.uid ? data.uid : '',
        'convKey': data.convKey ? data.convKey : '',
        'vcall_id': data.vcall_id ? data.vcall_id : ''
      },
      'to': data.fcm_token,
      'priority': 'high',
      'restricted_package_name': 'com.wherez.app'
    }

    if (this.platform.is('hybrid')) {
      this.nativeHttp.setDataSerializer("json");
      this.nativeHttp.post('https://fcm.googleapis.com/fcm/send', body, {
        'Content-Type': 'application/json',
        'Authorization': 'key=AAAArpsxtBs:APA91bFLFx4_JLl9BKUNRZIvv7pJdYsbtThFRVstSjgzDkMXomL91y3BHFLS_taUQWdJY_M0JN5ixfmyakhoQHZXgHKdZT9ys1tCwA7vPUS-YyvvWvbYoDSW7PRnDrzW6DO8YbX9voWo'
      }).then(result => {
        console.log('result == ', result);
      }).catch(error => {
        console.error('error hybrid == ', error);
      });
    } else {
      let options = new HttpHeaders().set('Content-Type', 'application/json');
      this.http.post('https://fcm.googleapis.com/fcm/send', JSON.stringify(body), {
        headers: options.set('Authorization', 'key=AAAArpsxtBs:APA91bFLFx4_JLl9BKUNRZIvv7pJdYsbtThFRVstSjgzDkMXomL91y3BHFLS_taUQWdJY_M0JN5ixfmyakhoQHZXgHKdZT9ys1tCwA7vPUS-YyvvWvbYoDSW7PRnDrzW6DO8YbX9voWo'),
      }).subscribe(resp => {
        console.log('resp == ', resp);
      }, error => {
        console.error('error == ', error);
      });
    }
  }

  /**
   *
   */
  getPendingUsers() {
    this.firedb.database.ref(`invite_friends`).orderByChild('sender').equalTo(this.preference.my_uid).once('value').then((snaps) => {
      this.preference.pendings = [];
      snaps.forEach(snap => {
        var data = snap.val();
        var index = this.preference.pendings.findIndex(item => item == data.receiver);
        if (data.status == '2' && index == -1) this.preference.pendings.push(data.receiver);
      });
    });
  }

  getAllUsers() {
    this.getPendingUsers();

    this.firedb.database.ref('users').on('child_added', (snap) => {
      if (snap) {
        var user: UserData = snap.val();
        user.uid = snap.key;
        if (user.uid != this.preference.my_uid) this.allUserData.next(user);
      }
    });
  }

  trackingUser() {
    this.firedb.database.ref('users').on('child_changed', (snap) => {
      var data = snap.val();
      this.trackingUsers.next(data);
    });
  }

  getMyFriendsOnHome(uid) {
    return new Promise<UserData[]>((resolve, reject) => {
      var friends: UserData[] = [];
      this.firedb.database.ref(`friends/${uid}`).once('value').then(snaps => {
        var friends_snap = snaps.val();
        if (friends_snap) {
          this.preference.my_friends = friends_snap.friends;
          if (this.preference.my_friends.length == 0) {
            resolve(friends);
          } else {
            var ind = 0;
            this.preference.my_friends.forEach((user_key) => {
              this.firedb.database.ref(`users/${user_key}`).once('value').then((user_snap) => {
                ind++;
                var user: UserData = user_snap.val();
                user.uid = user_snap.key;

                if (user.showonmap == 'yes') {
                  friends.push(user);
                  // if (user.online == '0') {
                  //   if (!this.preference.calcOfflineTime(user.last_seen)) friends.push(user);
                  // } else friends.push(user);
                }

                if (ind == this.preference.my_friends.length) resolve(friends);
              })
            })
          }
        } else {
          resolve(friends);
        }
      }).catch(error => {
        reject(error);
      });
    });
  }

  updateFriends(uid, users = []) {
    return this.firedb.database.ref(`friends/${uid}/friends`).set(users);
  }

  getUserFriends(uid) {
    return this.firedb.database.ref(`friends/${uid}`).once('value');
  }

  getAllMyFriends() {
    return new Promise<UserData[]>((resolve, reject) => {
      this.firedb.database.ref(`friends/${this.preference.my_uid}`).on('value', snaps => {
        var friends: UserData[] = [];
        var friends_snap = snaps.val();
        if (friends_snap) {
          this.preference.my_friends = friends_snap.friends;
          if (this.preference.my_friends.length == 0) {
            resolve(friends);
          } else {
            var ind = 0;
            this.preference.my_friends.forEach((user_key) => {
              this.firedb.database.ref(`users/${user_key}`).once('value').then((user_snap) => {
                ind++;
                var user: UserData = user_snap.val();
                user.uid = user_snap.key;
                friends.push(user);
                if (ind == this.preference.my_friends.length) resolve(friends);
              })
            })
          }
        } else {
          resolve(friends);
        }
      })
    });
  }

  sendFriendRequest(uid) {
    let key = this.firedb.database.ref(`invite_friends/`).push();
    return key.set({
      sender: this.preference.my_uid,
      receiver: uid,
      status: '2',
      created_at: Date.now()
    });
  }

  cancelRequest(key) {
    return this.firedb.object(`invite_friends/${key}`).remove();
  }

  getReceiveInvitations(): Observable<any> {
    return Observable.create(observer => {
      this.firedb.database.ref(`invite_friends`).orderByChild('receiver').equalTo(this.preference.my_uid).on('child_added', (snaps) => {
        var friends_snap = snaps.val();
        if (friends_snap) {
          friends_snap.key = snaps.key;
          if (friends_snap.status == '2') {
            this.firedb.database.ref(`users/${friends_snap.sender}`).once('value').then(async (user_snap) => {
              var user: UserData = user_snap.val();
              user.uid = user_snap.key;
              friends_snap.user_data = user;
              observer.next(friends_snap);
            })
          }
        } else {
          observer.next(null);
        }
      })
    });
  }

  updateInvitationStatus(key, status) {
    return this.firedb.database.ref(`invite_friends/${key}`).update({
      status: status
    });
  }

  getSentInvitations(): Observable<any> {
    return Observable.create(observer => {
      this.firedb.database.ref(`invite_friends`).orderByChild('sender').equalTo(this.preference.my_uid).on('child_added', (snaps) => {
        var friends_snap = snaps.val();
        if (friends_snap) {
          friends_snap.key = snaps.key;
          if (friends_snap.status == '2') {
            this.firedb.database.ref(`users/${friends_snap.receiver}`).once('value').then(async (user_snap) => {
              var user: UserData = user_snap.val();
              user.uid = user_snap.key;
              friends_snap.user_data = user;
              observer.next(friends_snap);
            })
          }
        } else {
          observer.next(null);
        }
      })
    });
  }

  trackRequest() {
    this.firedb.database.ref(`invite_friends`).on('child_changed', (snap) => {
      this.requestSub.next(snap.val())
    });
    this.firedb.database.ref(`invite_friends`).on('child_removed', (snap) => {
      this.requestSub.next('')
    });
  }

  getChatters(): Observable<UserData> {
    return Observable.create(observer => {
      this.firedb.database.ref(`friends/${this.preference.my_uid}`).once('value').then(snaps => {
        var friends_snap = snaps.val();
        if (friends_snap) {
          this.preference.my_friends = friends_snap.friends;
          if (this.preference.my_friends.length == 0) {
            observer.next(null);
          } else {
            this.preference.my_friends.forEach((user_key) => {
              this.firedb.database.ref(`users/${user_key}`).once('value').then(async (user_snap) => {
                var user: UserData = user_snap.val();
                user.uid = user_snap.key;
                user.convKey = await this.getConvKey(user.uid);
                this.getLastMessage(user.convKey).then(msg => {
                  if (msg) {
                    user.messages = msg
                    observer.next(user);
                  }
                }).catch(error => {
                  console.error(error);
                });
              })
            })
          }
        } else {
          observer.next(null);
        }
      })
    });
  }

  getConvKey(uid) {
    return new Promise<any>((resolve, reject) => {
      var ref = this.firedb.database.ref("conversations");
      ref.orderByChild("user1").equalTo(this.preference.my_uid).once("value").then(snapshot1 => {
        var find = false;
        snapshot1.forEach(snap => {
          let data = snap.val();
          if (data.user2 == uid) {
            find = true;
            resolve(snap.key)
          }
        });
        if (!find) {
          ref.orderByChild("user2").equalTo(this.preference.my_uid).once("value").then(snapshot2 => {
            snapshot2.forEach(snaps => {
              let data2 = snaps.val();
              if (data2.user1 == uid) {
                find = true;
                resolve(snaps.key)
              }
            });
            if (!find) {
              resolve(null);
            }
          });
        }
      });
    })
  }

  addConversations(uid) {
    var ref = this.firedb.database.ref("conversations");
    ref.orderByChild("user1").equalTo(this.preference.my_uid).once("value").then(snapshot1 => {
      var find = false;
      snapshot1.forEach(snap => {
        let data = snap.val();
        if (data.user2 == uid) find = true
      });
      if (!find) {
        ref.orderByChild("user2").equalTo(this.preference.my_uid).once("value").then(snapshot2 => {
          snapshot2.forEach(snaps => {
            let data2 = snaps.val();
            if (data2.user1 == uid) find = true
          });
          if (!find) {
            let con_key = this.firedb.database.ref('conversations/').push();
            con_key.set({
              user1: this.preference.my_uid,
              user2: uid
            });
          }
        });
      }
    });
  }

  getLastMessage(key) {
    return new Promise<any>((resolve, reject) => {
      var ref = this.firedb.database.ref(`messages/${key}`);
      ref.orderByChild("created_at").limitToLast(1).on("child_added", (snapshot) => {
        if (snapshot) {
          let data = snapshot.val();
          if (data) {
            resolve(data);
          } else {
            resolve(null);
          }
        } else resolve(null);
      }, error => {
        reject(error);
      });
    });
  }

  saveMessage(convkey, data) {
    let msg_key = this.firedb.database.ref(`messages/${convkey}/`).push();
    return msg_key.set(data);
  }

  stopGetMesssageFromKey(key) {
    this.firedb.database.ref(`messages/${key}`).off();
  }

  trackMessages(key): Observable<any> {
    return Observable.create(observer => {
      this.firedb.database.ref(`messages/${key}`).on('child_removed', (snap) => {
        observer.next(snap.key);
      })
    });
  }

  getMessages(key): Observable<Message> {
    var ref = this.firedb.database.ref(`messages/${key}`);
    ref.orderByChild("receiver").equalTo(this.preference.my_uid).once("value").then(snaps => {
      snaps.forEach(snap => {
        let data: Message = snap.val();
        if (data) {
          if (data.seen == '0') this.firedb.database.ref(`messages/${key}/${snap.key}`).update({
            seen: '1'
          });
        }
      });
    });

    return Observable.create(observer => {
      this.firedb.database.ref(`messages/${key}`).orderByChild('created_at').limitToLast(20).on('child_added', (snap) => {
        console.log('message snap == ', snap);
        if (snap) {
          var msg: Message = snap.val();
          if (msg) {
            msg.key = snap.key;
            if (msg.receiver == this.preference.my_uid && msg.seen == '0') this.firedb.database.ref(`messages/${key}/${snap.key}`).update({
              seen: '1'
            });;
            observer.next(msg);
          }
        }
      });
    });
  }

  getMoreMessage(key, last_msg) {
    return new Promise<Message[]>((resolve, reject) => {
      var messages: Message[] = []
      this.firedb.database.ref(`messages/${key}`).orderByChild('created_at').endBefore(last_msg).limitToLast(20).once('value').then((snaps) => {
        if (snaps) {
          snaps.forEach(snap => {
            var msg: Message = snap.val();
            msg.key = snap.key;
            messages.push(msg);
          });
          resolve(messages);
        } else {
          resolve(messages);
        }
      }).catch(error => {
        reject(error);
      });
    });
  }

  deleteMessage(convKey, key) {
    return this.firedb.object(`messages/${convKey}/${key}`).remove();
  }

  saveVCall(uid) {
    let vcall_id = this.firedb.database.ref('calls/').push();
    vcall_id.set({
      sender: this.preference.my_uid,
      receiver: uid,
      status: '2'
    });
    this.firedb.database.ref(`users/${this.preference.my_uid}`).update({
      oncall: 'yes'
    });
    this.firedb.database.ref(`users/${uid}`).update({
      oncall: 'yes'
    });
    return vcall_id.key
  }

  updateVCallStatus(key, status) {
    return this.firedb.database.ref(`calls/${key}`).update({
      status: status
    });
  }

  checkCallStatus(key): Observable<any> {
    return Observable.create(observe => {
      this.firedb.database.ref(`calls/${key}`).on('child_changed', (data) => {
        let call = data.val()
        observe.next(call);
      });
    });
  }
}
