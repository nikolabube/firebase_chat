import { ApplicationRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { GlobalEventService } from 'src/app/services/events.service';
import { PreferenceService } from 'src/app/services/preference.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit {

  url = 'home';

  new_mess = false;
  new_count = 0;

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private eventService: GlobalEventService,
    private applicationRef: ApplicationRef,
    public preference: PreferenceService
  ) {
    this.eventService.getObservable().subscribe(data => {
      if (data.event == 'new_msg') {
        localStorage.setItem('new_mess', 'yes');
        localStorage.setItem('new_count', '' + data.count);
        this.new_mess = true;
        this.new_count = data.count
        this.applicationRef.tick();
      }
    })
  }

  ngOnInit() {
    if (localStorage.getItem('new_mess')) this.new_mess = true;
    if (localStorage.getItem('new_count')) this.new_count = Number(localStorage.getItem('new_count'));

    this.url = (this.router.url as string).substring(1, (this.router.url as string).length)
    if (this.url == 'messages') {
      localStorage.removeItem('new_mess');
      localStorage.removeItem('new_count');
      this.new_mess = false;
      this.new_count = 0
    }
    setTimeout(() => {
      this.applicationRef.tick();
    }, 300);
  }

  goPage(page = 'home') {
    this.navCtrl.navigateRoot(page, { animated: true, animationDirection: 'forward' });
  }

}
