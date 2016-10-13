if (!global._babelPolyfill) require('babel-polyfill');
import {validateChallenge, conversation} from './messenger';

const replies = {
  intro: {
    text: "Welcome to the GetUp Volunteer Action Hub. The current campaign is to end Australia's offshore detention regime and bring the remaining refugees to Australia.",
    next: 'default',
  },
  default: {
    text: "Here are some ways you can help close the camps and #BringThemHere:",
    buttons: [
      {type: 'postback', payload: 'petition_sign', title: 'Sign the petition'},
      {type: 'postback', payload: 'group_intro', title: 'Join the Facebook Group'},
      {type: 'postback', payload: 'subscribe_initiate', title: 'Subscribe to receive campaign updates'},
    ]
  },

  group_intro: {
    text: 'The Facebook group is a great way to stay up to date with campaign developments and upcoming actions.',
    next: 'group_join',
  },
  group_join: {
    text: 'Have you joined our #BringThemHere volunteer Facebook group yet?',
    replies: [{k: 'group_view', t: 'Not yet'}, {k: 'group_joined', t: 'I have joined'}]
  },
  group_view: {
    text: "Ok, here's the link. Please visit the group page and request to join. Come back and type 'Done' when you're finished",
    buttons: [{t: 'Join vollie group', url: 'https://www.facebook.com/groups/517488501775144/' }],
    next: 'default',
  },
  group_joined: {
    text: "Excellent! Keep your eye out for notifications from the group.",
    persist: 'group_joined',
    next: 'default',
  },

  subscribe_initiate: {},

  petition_sign: {},

  ask_for_phone: {
    text: "Great! Keep your eye out for notifications from the group on upcoming actions. Could we please also get your phone number for someone to contact you about volunteer opportunities?",
    replies: [{k: 'join_local_group_ask', t: 'No thanks'}, {k: 'prompt_for_phone', t: 'Yes'}]
  },
  prompt_for_phone: {
    text: "Please enter your Australian mobile or phone number. E.g. 0468519266"
  },
  detected_phone_number: {
    text: "Can I please confirm that PHONE is your number?",
    replies: [{k: 'join_local_group_ask', t: 'Yes'}, {k: 'prompt_for_phone', t: "That's not right"}, {k: 'join_local_group_ask', t: 'Skip'}]
  },
  join_local_group_ask: {
    text: "We're also helping people to connect with other people in their area. Would you be interested in meeting members in a local group?",
    replies: [{k: 'share_ask', t: 'No thanks'}, {k: 'ask_for_postcode', t: 'Yes'}]
  },
  ask_for_postcode: {
    text: "Please enter your four digit postcode E.g. 2000"
  },
  detected_postcode: {
    text: "Can I please confirm that POSTCODE is your postcode?",
    replies: [{k: 'ask_for_notification', t: 'Yes'}, {k: 'ask_for_postcode', t: "That's not right"}, {k: 'share_ask', t: 'Skip'}]
  },
  ask_for_notification: {
    text: "There aren't any groups near you yet. Do you want us to notify you if one starts?",
    replies: [{k: 'ask_to_start', t: 'Yes'}, {k: 'ask_to_start', t: 'No'}]
  },
  ask_to_start: {
    text: "Would you be interested in helping to start a local group in your area? We'll provide guidelines and advice on running your group.",
    replies: [{k: 'be_in_touch', t: 'Yes'}, {k: 'share_ask', t: 'No'}]
  },
  be_in_touch: {
    text: "Fantastic! We'll be in touch with further instructions. Thanks for your time!"
  },
  share_ask: {
    text: "Thanks for being part the #BringThemHere organising on Facebook. We'll be posting more details about next steps in the campaign soon. In the meantime, please share this campaign so that we can grow the movement",
  }
}

export const chat = conversation(replies);
export const challenge = validateChallenge;
