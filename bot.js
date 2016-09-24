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
      console.log(JSON.stringify(messagingEvent)); 
      sendTextMessage(messagingEvent.sender.id, `You said ${messagingEvent.message.text}`);
    });
  })
  cb();
};

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
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error('error:', response);
    }
  });
}
