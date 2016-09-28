const PAGE_ACCESS_TOKEN = 'EAAEwFhGmiGwBABghZAehC2p5Bk28g43GT0pornGJVx5QLZAs2fm1W5tRxyYmDNvimMh73tKSoROZCw3Aw6sxZCJJ2mem66hFoVnp02U6Jd0fNXqdgbLZAJdbMhUWGugdbZCeIbop9KZCgCRO2CEmJlZAgniconmU1BR8fHxsaPA1IwZDZD'
import request from 'request';

export const VALIDATION_TOKEN = 'l5pKlkZMIeSOf2PX9M45';
export const validateChallenge = (e, ctx, cb) => {
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
        const message = messagingEvent.message;
        if (!message) return console.error('Unknown message event');
        const recipientId = messagingEvent.sender.id;
        const key = message.quick_reply ? message.quick_reply.payload : 'default';

        let matchNumber;
        if (key === 'default' && message.text) {
          if (matchNumber = message.text.match(/^\s*([\d\(\)\-\s]{7,})/)){
            const phone = matchNumber[1].replace(/[^\d]/g, '');
            const reply = replies.detected_phone_number;
            return sendQuickReply(recipientId, reply.text.replace(/PHONE/, phone), reply.replies);
          }else if (matchNumber = message.text.match(/^\s*(\d{4})/)){
            const postcode = matchNumber[1].replace(/[^\d]/g, '');
            const reply = replies.detected_postcode;
            return sendQuickReply(recipientId, reply.text.replace(/POSTCODE/, postcode), reply.replies);
          }
        }

        const reply = replies[key];
        if (!reply) return console.error('Unknown reply');
        if (reply.replies){
          sendQuickReply(recipientId, reply.text, reply.replies)
        } else if (reply.buttons) {
          sendButtonMessage(recipientId, reply.text, reply.buttons)
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
      quick_replies: options.map(option => Object.assign({"title": option.t, "payload": option.k }, reply))
    }
  }
  callSendAPI(messageData)
}

function sendButtonMessage(recipientId, text, buttons) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: text,
          buttons: buttons.map(button => {
            return {
              type: "web_url",
              url: button.url,
              title: button.t
            }
          })
        }
      }
    }
  };
  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  //console.error(JSON.stringify(messageData))
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
