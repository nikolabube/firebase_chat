import { Component, Input, OnInit } from '@angular/core';
import { NavController, PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-category-block',
  templateUrl: './category-block.component.html',
  styleUrls: ['./category-block.component.scss'],
})
export class CategoryBlockComponent implements OnInit {

  constructor(
    private navCtrl: NavController,
    private popCtrl: PopoverController
  ) { }

  ngOnInit() {}

  addFavorite() {
    this.popCtrl.dismiss('', 'add_fav');
  }

  dismiss() {
    this.popCtrl.dismiss();
  }

}
