import { UserDetailPage } from './../modals/user-detail/user-detail.page';
import { UserData } from './../models/user';
import { ApplicationRef, Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AlertController, IonInfiniteScroll, ModalController, NavController, Platform, PopoverController, MenuController } from '@ionic/angular';
import { CategoryItemComponent } from '../components/category-item/category-item.component';
import { ApiService } from '../services/api.service';
import { CommonService } from '../services/common.services';
import { GlobalEventService } from '../services/events.service';
import { PreferenceService } from '../services/preference.service';
import { Geolocation, Geoposition } from '@ionic-native/geolocation/ngx';

declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  @ViewChild('map', { static: true }) mapElement: ElementRef;
  directionsService = new google.maps.DirectionsService;
  directionsDisplay = new google.maps.DirectionsRenderer;

  map: any;
  marker: any;
  source: any;
  destination: any;
  markers = [];

  users: UserData[] = []
  allUsers: UserData[] = []
  subscription: any;

  api_done = false;

  searchTxt: any;
  new_noti = false;
  new_request = false;

  subscriptIndex = 0;

  constructor(
    private navCtrl: NavController,
    private apiService: ApiService,
    public preference: PreferenceService,
    private platform: Platform,
    private alertController: AlertController,
    private applicationRef: ApplicationRef,
    private eventService: GlobalEventService,
    private menuCtrl: MenuController,
    private modalCtrl: ModalController,
    private geolocation: Geolocation
  ) {
    this.eventService.getObservable().subscribe(data => {
      if (data.event == 'new_request') {
        this.new_request = localStorage.getItem('new_request') ? true : false;
      } else if (data.event == 'new_message') {
        this.new_noti = localStorage.getItem('new_mess') ? true : false;
      }
    });

    this.geolocation.getCurrentPosition().then((geo: Geoposition) => {
      this.preference.lat = geo.coords.latitude
      this.preference.lng = geo.coords.longitude
      console.log('%s, %s', this.preference.lat, this.preference.lng);
    }).catch(error => {
      console.error('error === ', error);
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.loadMap();
    }, 500);

    console.log('c_user == ', this.preference.currentUser);

    setTimeout(() => {

      this.apiService.trackingUsers.subscribe((data) => {
        if (this.subscriptIndex == 0) {
          setTimeout(() => {
            this.apiService.getMyFriendsOnHome(this.preference.my_uid).then((friends: UserData[]) => {
              this.users = friends;
              this.allUsers = friends;
              console.log('trackingUsers == ', this.users);
              var customers = document.getElementsByClassName('customMarker');
              console.log('customers.length == ', customers.length);
              var count = customers.length;
              for (let i = 0; i < count; i++) {
                customers[0].remove();
              }
              this.trackUsersOnMap();
              setTimeout(() => {
                this.subscriptIndex = 0;
              }, 1500);
            });
          }, 1500);
        }
        this.subscriptIndex++;
      });
      this.apiService.trackingUser();

    }, 5500);
  }

  showMenu() {
    this.menuCtrl.toggle();
  }

  getUsers() {
    this.apiService.getMyFriendsOnHome(this.preference.my_uid).then((friends: UserData[]) => {
      console.log('friends == ', friends);
      this.users = friends;
      this.allUsers = friends;
      this.makeCustomMarker();
    });
  }

  searchUser($event) {
    this.searchTxt;
    var val = $event.target.value;
    if (val && val.trim() != '') {
      this.users = this.allUsers.filter(item => item.name.toLowerCase().includes(val.toLowerCase()));
    } else {
      this.users = this.allUsers;
    }
    this.makeCustomMarker();
  }

  async showDetail(uid) {
    var convKey = await this.apiService.getConvKey(uid);
    console.log('%s, %s', uid, convKey);

    var modal = await this.modalCtrl.create({
      component: UserDetailPage,
      componentProps: {
        uid
      },
      cssClass: 'user_detail',
      mode: 'md'
    });
    modal.onDidDismiss().then(data => {
      if (data.role == 'chat') {
        this.preference.share_uid = uid;
        this.preference.share_convKey = convKey;
        this.preference.userData = data.data;
        this.navCtrl.navigateForward('chat');
      }
    });
    modal.present();
  }

  ionViewDidEnter() {
    this.new_noti = localStorage.getItem('new_mess') ? true : false;
    this.new_request = localStorage.getItem('new_request') ? true : false;

    this.getUsers();
    this.apiService.getPendingUsers();

    this.subscription = this.platform.backButton.subscribe(() => {
      this.presentAlertConfirm();
    });
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

  loadMap() {
    let self = this;
    let latLng = new google.maps.LatLng(this.preference.lat, this.preference.lng);

    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      zoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
      center: latLng
    });

    this.directionsDisplay.setMap(this.map);
    this.directionsDisplay.addListener('directions_changed', function () {
      self.directionsDisplay.getDirections();
    });

    // this.marker = new google.maps.Marker({
    //   map: this.map,
    //   position: latLng,
    //   draggable: false,
    //   zIndex: 10
    // });
    // this.marker.setZIndex(10);
  }

  makeCustomMarker() {
    // var map = new google.maps.Map(document.getElementById("map")
    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      zoom: this.map.getZoom(),
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
      center: this.map.getCenter(),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    let _this = this;
    function CustomMarker(latlng, map, imageSrc, online, uid) {
      this.latlng_ = latlng;
      this.imageSrc = imageSrc;
      this.online_ = online;
      this.uid_ = uid;

      this.setMap(map);
    }

    CustomMarker.prototype = new google.maps.OverlayView();

    CustomMarker.prototype.draw = function () {
      // Check if the div has been created.
      var div = this.div_;
      if (!div) {
        // Create a overlay text DIV
        div = this.div_ = document.createElement('div');
        // Create the DIV representing our CustomMarker
        div.className = "customMarker";

        if (this.online_ == '1') {
          div.classList.add('online');
        } else {
          div.classList.add('offline');
        }

        var img = document.createElement("img");
        img.src = this.imageSrc;
        div.appendChild(img);

        var me = this;
        img.addEventListener("click", function (event) {
          // google.maps.event.trigger(me, "click");
          console.log('========================================================');
          _this.showDetail(me.uid_);
        });

        // Then add the overlay to the DOM
        var panes = this.getPanes();
        panes.overlayImage.appendChild(div);
      }

      // Position the overlay
      var point = this.getProjection().fromLatLngToDivPixel(this.latlng_);
      if (point) {
        div.style.left = point.x + 'px';
        div.style.top = point.y + 'px';
      }
    };

    CustomMarker.prototype.remove = function () {
      // Check if the overlay was on the map and needs to be removed.
      if (this.div_) {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
      }
    };

    CustomMarker.prototype.getPosition = function () {
      return this.latlng_;
    };

    google.maps.Map.prototype.clearOverlays = function () {
      for (var i = 0; i < _this.markers.length; i++) {
        _this.markers[i].setMap(null);
      }
      _this.markers = [];
    }

    this.users.forEach((user: UserData) => {
      new CustomMarker(new google.maps.LatLng(user.lat, user.lng), this.map, user.avatar, user.online, user.uid)
    });

    this.addMarker();
  }

  addMarker() {
    // let marker2 = new google.maps.Marker({
    //   icon: 'assets/imgs/marker.png',
    //   map: this.map,
    //   position: { lat: this.preference.lat, lng: this.preference.lng }
    // });
    // marker2.setZIndex(1);

    let _this = this;
    function MyMarker(latlng, map, imageSrc) {
      this.latlng_ = latlng;
      this.imageSrc = imageSrc;
      this.setMap(map);
    }

    MyMarker.prototype = new google.maps.OverlayView();
    MyMarker.prototype.draw = function () {
      var div = this.div_;
      if (!div) {
        div = this.div_ = document.createElement('div');
        div.className = "myMarker";

        var img = document.createElement("img");
        img.src = this.imageSrc;
        div.appendChild(img);
        var panes = this.getPanes();
        panes.overlayImage.appendChild(div);
      }

      var point = this.getProjection().fromLatLngToDivPixel(this.latlng_);
      if (point) {
        div.style.left = point.x + 'px';
        div.style.top = point.y + 'px';
      }
    };
    MyMarker.prototype.remove = function () {
      if (this.div_) {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
      }
    };
    MyMarker.prototype.getPosition = function () {
      return this.latlng_;
    };

    new MyMarker(new google.maps.LatLng(this.preference.lat, this.preference.lng), this.map, 'assets/imgs/marker.png')
  }

  /**
   * tracking users on map
   */
  trackUsersOnMap() {
    let _this = this;
    function CustomMarker(latlng, map, imageSrc, online, uid) {
      this.latlng_ = latlng;
      this.imageSrc = imageSrc;
      this.online_ = online;
      this.uid_ = uid;

      this.setMap(map);
    }

    CustomMarker.prototype = new google.maps.OverlayView();
    CustomMarker.prototype.draw = function () {
      var div = this.div_;
      if (!div) {
        div = this.div_ = document.createElement('div');
        div.className = "customMarker";

        if (this.online_ == '1') {
          div.classList.add('online');
        } else {
          div.classList.add('offline');
        }

        var img = document.createElement("img");
        img.src = this.imageSrc;
        div.appendChild(img);

        var me = this;
        img.addEventListener("click", function (event) {
          _this.showDetail(me.uid_);
        });

        var panes = this.getPanes();
        panes.overlayImage.appendChild(div);
      }

      var point = this.getProjection().fromLatLngToDivPixel(this.latlng_);
      if (point) {
        div.style.left = point.x + 'px';
        div.style.top = point.y + 'px';
      }
    };
    CustomMarker.prototype.remove = function () {
      if (this.div_) {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
      }
    };
    CustomMarker.prototype.getPosition = function () {
      return this.latlng_;
    };

    this.users.forEach((user: UserData) => {
      new CustomMarker(new google.maps.LatLng(user.lat, user.lng), this.map, user.avatar, user.online, user.uid)
    });
  }

}
