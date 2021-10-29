import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateModule } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { VideoRoomPage } from './video-room.page';
// import { StreamComponent } from '../../../app/shared/components/stream/stream.component';
// import { OpenViduVideoComponent } from '../../../app/shared/components/stream/ov-video.component';
// import { ChatComponent } from '../../../app/shared/components/chat/chat.component';
import { SettingUpModalComponent } from '../../../app/shared/components/setting-up-modal/setting-up-modal.component';


const routes: Routes = [
  {
    path: '',
    component: VideoRoomPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    TranslateModule,
    ComponentsModule
  ],
  declarations: [VideoRoomPage, SettingUpModalComponent],
  exports: [],
  entryComponents: [ SettingUpModalComponent]
})

export class VideoRoomPageModule {}
