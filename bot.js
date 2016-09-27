import {validateChallenge, conversation} from './messenger';

const replies = {
  default: {
    text: 'Have you joined our #BringThemHere volunteer group yet?',
    replies: [{k: 'link_to_vollie_group', t: 'Not yet'}, {k: 'ask_for_phone', t: 'I have joined'}]
  },
  link_to_vollie_group: {
    text: "Ok, here's the link. Please visit group page and request to join. Come back and type 'Done' when you're finished",
    buttons: [{t: 'Visit group', url: 'https://www.facebook.com/groups/1657556811201707/' }]
  },
  ask_for_phone: {
    text: "Great! Keep your eye out for notifications from the group on upcoming actions. Could we please also get your phone number for someone to contact you about volunteer opportunities?",
    replies: [{k: 'join_local_group_ask', t: 'No thanks'}, {k: 'prompt_for_phone', t: 'Yes'}]
  },
  prompt_for_phone: {
    text: "Please enter your Australian mobile or phone number? E.g. 0468519266"
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
    text: "Please enter your four digit postcode? E.g. 2000"
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
    text: "Would you interested in helping to start a local group in your area? We'll provide guidelines and advice on running your group.",
    replies: [{k: 'be_in_touch', t: 'Yes'}, {k: 'share_ask', t: 'No'}]
  },
  be_in_touch: {
    text: "Fantastic! Below is the link to create a new group on Facebook. Be sure to use #BringThemHere in the title. " +
          "Also make sure the group is not a secret group so that other interested people can join.",
    buttons: [{t: 'View instructions', url: 'https://showcase.getup.org.au' }]
  },
  share_ask: {
    text: "Thanks for being part the #BringThemHere organising on Facebook. We'll be posting more details about next steps in the campaign soon. In the meantime, please share this campaign so that we can grow the movement",
  }
}

export const chat = conversation(replies);
export const challenge = validateChallenge;
