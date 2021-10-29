import { Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { PreferenceService } from 'src/app/services/preference.service';

@Component({
  selector: 'app-category-item',
  templateUrl: './category-item.component.html',
  styleUrls: ['./category-item.component.scss'],
})
export class CategoryItemComponent implements OnInit {

  gender = "Both"

  constructor(
    private popCtrl: PopoverController,
    public preference: PreferenceService
  ) { }

  ngOnInit() {
    this.gender = localStorage.getItem('filter_gender') ? localStorage.getItem('filter_gender') : "Both"
  }

  changeGender($event) {

  }

}
