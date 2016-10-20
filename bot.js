if (!global._babelPolyfill) require('babel-polyfill');
require('dotenv').config();
const NODE_ENV = process.env.NODE_ENV;

import request from 'request';
import { script } from './script';
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient(dbConf());
export const loadedScript = script;

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
export const VALIDATION_TOKEN = process.env.VALIDATION_TOKEN;

export const challenge = (e, ctx, cb) => {
  if (e.query['hub.mode'] === 'subscribe' && e.query['hub.verify_token'] === VALIDATION_TOKEN) {
    cb(null, parseInt(e.query['hub.challenge'], 10));
  } else {
    cb('Validation failed');
  }
};

export const chat = (e, ctx, cb) => {
  const data = e.body;
  if (data.object !== 'page') return cb();
  data.entry.forEach(pageEntry => {
    pageEntry.messaging.forEach(messagingEvent => {
      if (NODE_ENV !== 'test') console.log('messagingEvent:', JSON.stringify(messagingEvent));

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

export async function sendMessage(recipientId, key, answer) {
  const recipient = { id: recipientId };
  const reply = script[key] || script['unknown_payload'];
  let completedActions = [];
  if (reply.template) {
    try {
      reply.text = await getName(recipientId, reply, answer);
    } catch(error) {
      console.error(error);
    }
  }

  if (reply.persist) {
    try {
      await persistAction(recipientId, reply.persist);
    } catch(error) {
      console.error(error);
    }
  }

  if (key === 'default') {
    try {
      completedActions = await getActions(recipientId);
    } catch(error) {
      console.error(error);
    }
  }

  let message;
  if (reply.text) message = { text: reply.text };
  if (reply.replies) message = quickReply(reply);
  if (reply.buttons) message = buttonTemplate(reply, completedActions);
  if (reply.generic) message = genericTemplate(reply);

  callSendAPI({recipient, message}).then(() => {
    if (reply.next) {
      let delayedCall = () => {
        const delay = reply.delay || 5000;
        delayMessage(recipientId, reply.next, delay);
      }
      if (reply.disable_typing){
        delayedCall();
      }else{
        callSendAPI({recipient, sender_action: 'typing_on'}).then(delayedCall);
      }
    }
  }).catch(::console.error);
}

export const message = (e, ctx, cb) => {
  if (NODE_ENV !== 'test') console.log("invoking!", e)
  setTimeout(() => {
    sendMessage(e.recipientId, e.next);
    cb();
  }, e.delay);
};

export function delayMessage(recipientId, next, delay) {
  const aws = require('aws-sdk');
  const lambda = new aws.Lambda({region: 'us-east-1'});
  const payload = {recipientId: recipientId, next: next, delay: delay};
  if (['dev', 'test'].includes(NODE_ENV)) {
    return message(payload, null, ()=>{});
  }
  lambda.invoke({
    FunctionName: `volunteer-chat-bot-${NODE_ENV}-message`,
    InvocationType: 'Event',
    Payload: JSON.stringify(payload)
  }, function(err) {
    if (err) console.error("Error invoking lambda", err, arguments);
  });
}

function callSendAPI(messageData) {
  return new Promise((resolve, reject) => {
    if (NODE_ENV !== 'test') console.log('messageData:', JSON.stringify(messageData));
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

function persistAction(fbid, action) {
  return new Promise((resolve, reject) => {
    const TableName = `volunteer-chat-bot-${NODE_ENV}-members`;

    dynamo.get({TableName, Key:{fbid}}, (err, res) => {
      if (err) return reject(err);

      const actions = (res.Item && res.Item.actions || []).concat(action);
      const Item = res.Item ? {...res.Item, actions} : {fbid, actions};

      dynamo.put({TableName, Item}, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  });
}

function getName(recipientId, reply, answer) {
  return new Promise((resolve, reject) => {
    const payload = {
      uri: `https://graph.facebook.com/v2.8/${recipientId}`,
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: 'GET',
    };
    request(payload, (err, res, body) => {
      if (!err && res.statusCode === 200) {
        const {first_name, last_name, ...attrs} = JSON.parse(body);

        const returnText = () => {
          const text = reply.template
            .replace(/{first_name}/, first_name)
            .replace(/{last_name}/, last_name)
            .replace(/{postcode}/, answer);
          return resolve(text);
        };

        const cb = (err, res) => {
          if (err) console.log({err});
          returnText();
        };
        const memberData = {first_name, last_name, answer, ...attrs};
        return storeMember(recipientId, memberData, cb);
      }
      reject(err || body);
    });
  })
}

function getActions(fbid) {
  return new Promise((resolve, reject) => {
    const TableName = `volunteer-chat-bot-${NODE_ENV}-members`;
    dynamo.get({TableName, Key: {fbid}}, (err, res) => {
      if (err) return reject(err);
      const actions = res.Item && res.Item.actions;
      resolve(actions || []);
    });
  })
}

function storeMember(fbid, profile, cb) {
  const payload = {
    TableName: `volunteer-chat-bot-${NODE_ENV}-members`,
    Item: {fbid, profile}
  };
  dynamo.put(payload, cb);
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

function buttonTemplate(reply, completedActions) {
  const buttonsToRemove = completedActions.map(action => script.action_menu[action])
  const availableButtons = reply.buttons.filter(button => !buttonsToRemove.includes(button.payload))
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: reply.text,
        buttons: availableButtons
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

function dbConf() {
  if (['dev', 'test'].includes(NODE_ENV)) {
    return {region: 'localhost', endpoint: 'http://localhost:8000'}
  }
  return {region: 'us-east-1'};
}
