import {validateChallenge, conversation} from './messenger';

const replies = {
  default: {
    text: 'Have you joined our #BringThemHere volunteer group yet?',
    replies: [{k: 'vollie_no', t: 'Not yet'}, {k: 'vollie_yes', t: 'I have joined'}]
  },
  vollie_no: {
    text: "Ok, here's the link. Please visit group page and request to join. Come back and type 'Done' when you're finished",
    buttons: [{t: 'Visit group', url: 'https://www.facebook.com/groups/1657556811201707/' }]
  },
  vollie_yes: {
    text: "Great! Keep your eye out for notifications from the group on upcoming actions. Could we please also get your phone number for someone to contact you about volunteer opportunities?",
    replies: [{k: 'phone_no', t: 'No thanks'}, {k: 'phone_yes', t: 'Yes'}]
  },
  phone_yes: {
    text: "Excellent. Please enter your Australian mobile or phone number? E.g. 0468519266"
  },
  phone_no: {
    text: "We're also helping people to connect with other people in their area. Would you be interested in meeting members nearby?",
    replies: [{k: 'share_ask', t: 'No thanks'}, {k: 'local_group_yes', t: 'Yes'}]
  },
  local_group_yes: {
    text: "Please enter your four digit postcode? E.g. 2000"
  },
  share_ask: {
    text: "Thanks for being part the #BringThemHere organising on Facebook. We'll be posting more details about next steps in the campaign soon. In the meantime, please share this campaign so that we can grow the movement",
  }
}

export const chat = conversation(replies);
export const challenge = validateChallenge;
