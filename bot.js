const VALIDATION_TOKEN = 'validate me'
const PAGE_ACCESS_TOKEN = 'EAAEu0WOT5qUBAIKZArUgdHblMGxy6ZAZAlmPDUwjgd0QJ0ZAsAipXCARQCCBOHipZAM2z7xDRH1GFlERLNXMvEXEoDads1BIsm51qdg1VUIIoZBWZAis8sPzOhpuJTwhalhJKpXAIikE1coNTTnyS8pcjHJTY51icHhSC6TpIU2GQZDZD'

import request from 'request';

export const challenge = (e, ctx, cb) => {
  if (e.query['hub.mode'] === 'subscribe' && e.query['hub.verify_token'] === VALIDATION_TOKEN) {
    cb(null, e.query['hub.challenge']);
  } else {
    cb('Validation failed');
  }
};

export const chat = (e, ctx, cb) => {
  const data = e.body;
  if (data.object !== 'page') return cb();
  data.entry.forEach(pageEntry => {
    pageEntry.messaging.forEach(messagingEvent => {
      if (!messagingEvent.message) return console.error(`Unknown message ${messagingEvent}`);
      //console.log(JSON.stringify(messagingEvent)); 
      sendIntro(messagingEvent.sender.id);
    });
  })
  cb();
};

function sendIntro(recipientId) {
  const greeting = "Hello! I'm the GetUp Volunteer Chatbot (or “robot”). "
          "I'm a computer program designed to help you connect with the " +
          "GetUp community and take action on the #BringThemHere campaign";
  const question = "What action would you like to take?";
  sendTextMessage(recipientId, greeting)
  sendQuickReply(recipientId, question, ['Sign the petition', 'Meet your local group'])
}

function sendTextMessage(recipientId, messageText) {
  let messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  callSendAPI(messageData);
}

function sendQuickReply(recipientId, question, options) {
  let reply = { "content_type":"text" };
  let messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: question,
      metadata: "DEVELOPER_DEFINED_METADATA",
      quick_replies: options.map(option => Object.assign({"title":option, "payload":`ACTION ${option}` }, reply))
    }
  }
  callSendAPI(messageData)
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        //console.log("Successfully sent message with id %s to recipient %s", 
        //  messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error('error:', response);
    }
  });
}
