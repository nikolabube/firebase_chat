import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatPageRoutingModule } from './chat-routing.module';
import { NgxIonicImageViewerModule } from 'ngx-ionic-image-viewer';
import { ChatPage } from './chat.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatPageRoutingModule,
    NgxIonicImageViewerModule,
    ComponentsModule,
    TranslateModule
  ],
  declarations: [ChatPage]
})
export class ChatPageModule {}
