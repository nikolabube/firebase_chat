import { UserData } from './../models/user';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PreferenceService {

  lat = 0;
  lng = 0;

  my_uid = '';
  fcm_token = '';
  defaultLang = "en";
  currentUser: UserData;
  userData: UserData;
  vcUser: UserData;

  my_friends = [];
  pendings = [];

  share_uid = '';
  share_convKey = '';

  onesignal_token = "";


  constructor() { }

  removeHtmlEntites(value: string) {
    if (!value || value == '') return '';
    var multiple = {
      '&nbsp;': ' ',
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&apos;': '\'',
      '&cent;': '¢',
      '&pound;': '£',
      '&yen;': '¥',
      '&euro;': '€',
      '&copy;': '©',
      '&reg;': '®',
      '&#160;': ' ',
      '&#60;': '<',
      '&#62;': '>',
      '&#38;': '&',
      '&#34;': '"',
      '&#39;': '\'',
      '&#162;': '¢',
      '&#163;': '£',
      '&#165;': '¥',
      '&#8364;': '€',
      '&#169;': '©',
      '&#174;': '®',

    };
    for (var char in multiple) {
      var before = char;
      var after = multiple[char];
      var pattern = new RegExp(before, 'g');
      value = value.replace(pattern, after);
    }
    return value;
  }

  calcTime(time = 0): string {
    var string_time = '';
    if (time == 0) {
      string_time = '00:00';
    } else {
      var min = Math.trunc(time / 60);
      var rest_sec = time - min * 60;
      string_time = ((min > 9) ? '' + min : '0' + min) + ':' + ((rest_sec > 9) ? rest_sec : '0' + rest_sec);
    }
    return string_time;
  }

  returnArounMinutes(time = 0): number {
    return (time % 60 == 0) ? Math.trunc(time / 60) : Math.trunc(time / 60) + 1;
  }

  calcOfflineTime(time = 0): boolean {
    var diff = Date.now() - time;
    if (diff / (1000 * 60 * 60) > 1) return true;
    else return false;
  }
}
