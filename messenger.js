//const PAGE_ACCESS_TOKEN = 'EAAEu0WOT5qUBAIKZArUgdHblMGxy6ZAZAlmPDUwjgd0QJ0ZAsAipXCARQCCBOHipZAM2z7xDRH1GFlERLNXMvEXEoDads1BIsm51qdg1VUIIoZBWZAis8sPzOhpuJTwhalhJKpXAIikE1coNTTnyS8pcjHJTY51icHhSC6TpIU2GQZDZD'
const PAGE_ACCESS_TOKEN = 'EAAEvIPkKEaABAE6PZCZA1f9p9WpydZBPcQkUVW6ZA9LHwn66nY3nkrxbmrjYeo7ZBr4IgxTFRiaMyQleZBjGrha2cFl1xe2mya1ajXjTS60Oj3KV6S2c2HlqUaIiovmwUbPXBw13MvARaHCK7ExlbisWQqGnralkmLcU02EavYGQZDZD'
import request from 'request';

const VALIDATION_TOKEN = 'validate me';
export const challenge = (e, ctx, cb) => {
  if (e.query['hub.mode'] === 'subscribe' && e.query['hub.verify_token'] === VALIDATION_TOKEN) {
    cb(null, parseInt(e.query['hub.challenge'], 10));
  } else {
    cb('Validation failed');
  }
};

export const conversation = (replies) => {
  return (e, ctx, cb) => {
    const data = e.body;
    if (data.object !== 'page') return cb();
    data.entry.forEach(pageEntry => {
      pageEntry.messaging.forEach(messagingEvent => {
        console.error('message event: ', JSON.stringify(messagingEvent)); 
        const message = messagingEvent.message;
        if (!message) return console.error('Unknown message event');
        const recipientId = messagingEvent.sender.id;
        const key = message.quick_reply ? message.quick_reply.payload : 'default';
        const reply = replies[key];
        if (!reply) return console.error('Unknown reply');
        if (reply.replies){
          sendQuickReply(recipientId, reply.text, reply.replies)
        }else{
          sendTextMessage(recipientId, reply.text)
        }
      });
    })
    cb();
  }
}


export const sendTextMessage = (recipientId, messageText) => {
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

export const sendQuickReply = (recipientId, question, options) => {
  let reply = { "content_type":"text" };
  let messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: question,
      metadata: "DEVELOPER_DEFINED_METADATA",
      quick_replies: options.map(option => Object.assign({"title": option.a, "payload": option.k }, reply))
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
