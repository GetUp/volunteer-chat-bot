import {conversation} from './messenger';

const replies = {
  default: {
    text: 'Have you joined our #BringThemHere volunteer group yet?',
    replies: [{k: 'vollie_no', a: 'Not yet'}, {k: 'vollie_yes', a: 'I have joined'}]
  },
  vollie_no: {
    text: "Ok, here's the link. Please join the group now and then come back and type 'Done' when you're finished"
  },
  vollie_yes: {
    text: "Great! Keep your eye out for notifications from the group on upcoming actions!"
  }
}

export const chat = conversation(replies);
