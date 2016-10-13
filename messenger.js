const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'EAAEwFhGmiGwBAIZCfGZBeM3yraIzQ91KZCgLUdISvP0WYgRr0ttTVXbjPSd13qmjiAgoZB4pYNV3pBhxXT7Ie5ZCu1ZBZBnMBxoIscoZC8xveFZChgNeyiUyDKks98n9dFmcxmPZBqexaAm7bQcswkgnZAEo3FBkozbLsZCSAOVIwzqujwZDZD';
import request from 'request';

export const VALIDATION_TOKEN = 'l5pKlkZMIeSOf2PX9M45';
export const validateChallenge = (e, ctx, cb) => {
  if (e.query['hub.mode'] === 'subscribe' && e.query['hub.verify_token'] === VALIDATION_TOKEN) {
    cb(null, '' + parseInt(e.query['hub.challenge'], 10));
  } else {
    cb('Validation failed');
  }
};

let script;
export const conversation = (replies) => {
  script = replies;
  return (e, ctx, cb) => {
    const data = e.body;
    if (data.object !== 'page') return cb();
    data.entry.forEach(pageEntry => {
      pageEntry.messaging.forEach(messagingEvent => {
        console.log('messagingEvent:', JSON.stringify(messagingEvent));

        const recipientId = messagingEvent.sender.id;
        if (messagingEvent.postback) {
          return sendMessage(recipientId, messagingEvent.postback.payload);
        }

        const message = messagingEvent.message;
        if (message.quick_reply) {
          return sendMessage(recipientId, message.quick_reply.payload);
        }

        let matchNumber;
        if (matchNumber = message.text.match(/^\s*(\d{4})/)) {
          const postcode = matchNumber[1].replace(/[^\d]/g, '');
          return sendMessage(recipientId, 'petition_details', postcode);
        }

        sendMessage(recipientId, 'fallthrough');
      });
    })
    cb();
  }
}

export const sendMessage = (recipientId, key) => {
  const recipient = { id: recipientId };
  const reply = script[key] || script['unknown_payload'];

  let message;
  if (reply.text) message = { text: reply.text };
  if (reply.replies) message = quickReply(reply);
  if (reply.buttons) message = buttonTemplate(reply);
  if (reply.generic) message = genericTemplate(reply);

  callSendAPI({recipient, message}).then(() => {
    if (reply.next) {
      callSendAPI({recipient, sender_action: 'typing_on'}).then(() => {
        setTimeout(() => {
          sendMessage(recipientId, reply.next);
        }, reply.delay || 5000);
      }).catch(::console.error);
    }
  }).catch(::console.error);
}

function callSendAPI(messageData) {
  return new Promise((resolve, reject) => {
    console.log('messageData:', JSON.stringify(messageData));
    const payload = {
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: messageData,
    };

    request(payload, function(error, response, body) {
      if (!error && response.statusCode === 200) return resolve(body);
      reject(error || body);
    });
  })
}

function quickReply(reply) {
  return {
    text: reply.text,
    quick_replies: reply.replies.map(option => ({
      content_type: 'text',
      title: option.t,
      payload: option.k,
    })),
  };
}

function buttonTemplate(reply) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: reply.text,
        buttons: reply.buttons,
      }
    }
  };
}

function genericTemplate(reply) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: reply.generic,
      }
    }
  };
}
