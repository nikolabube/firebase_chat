export class UserData {
  uid?: string;
  name?: string;
  email?: string;
  fcm_token?: string;
  lat?: any;
  lng?: any;
  phone?: any;
  address?: string;
  last_seen?: any;
  online?: any;
  create_at?: any;
  avatar?: string;
  gender?: string;
  messages?: Message;
  convKey?: any;
  oncall?: string;
  showonmap?: any;
}

export class Message {
  key?: string;
  sender?: string;
  receiver?: string;
  msg?: any;
  msg_type?: any;
  media_url?: any;
  created_at?: any;
  seen?: any;
  loaded?: boolean;
}
