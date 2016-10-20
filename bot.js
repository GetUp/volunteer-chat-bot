if (!global._babelPolyfill) require('babel-polyfill');
require('dotenv').config();
const NODE_ENV = process.env.NODE_ENV;

import request from 'request';
import { script } from './script';
import promisify from 'es6-promisify'
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient(dbConf());
export const loadedScript = script;

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
export const VALIDATION_TOKEN = process.env.VALIDATION_TOKEN;

export const challenge = (e, ctx, cb) => {
  if (e.query['hub.mode'] === 'subscribe' && e.query['hub.verify_token'] === VALIDATION_TOKEN) {
    // webpack serve requires a string as output otherwise it converts the number to a return code
    cb(null, ['dev'].includes(NODE_ENV) ? e.query['hub.challenge'] : parseInt(e.query['hub.challenge']));
  } else {
    cb('Validation failed');
  }
};

export const chat = function(e, ctx, cb) {
  chatAsync(e).then(cb, cb)
};

async function chatAsync(e) {
  const data = e.body;
  if (data.object !== 'page') return cb();
  let messages = [];
  data.entry.forEach(pageEntry => {
    pageEntry.messaging.forEach(messagingEvent => {
      const recipientId = messagingEvent.sender.id;
      const message = messagingEvent.message;
      let matchNumber;

      if (NODE_ENV !== 'test') console.log('messagingEvent:', JSON.stringify(messagingEvent));

      if (messagingEvent.postback) {
        messages.push(sendMessage(recipientId, messagingEvent.postback.payload));
      }else if (message.quick_reply) {
        messages.push(sendMessage(recipientId, message.quick_reply.payload));
      }else if (matchNumber = message.text.match(/^\s*(\d{4})/)) {
        const postcode = matchNumber[1].replace(/[^\d]/g, '');
        messages.push(sendMessage(recipientId, 'petition_details', postcode));
      }else if (message.text === 'EXAMPLE MESSAGE') {
        messages.push(sendMessage(recipientId, 'subscribe_examples'));
      }else{
        messages.push(sendMessage(recipientId, 'fallthrough'));
      }
    });
  })
  try {
    await Promise.all(messages);
  } catch(error) {
  }
}

export async function sendMessage(recipientId, key, answer) {
  const recipient = { id: recipientId };
  let reply = script[key] || script['unknown_payload'];

  if (reply.length) {
    // example message is the only one that returns an array
    reply = reply[Math.floor(Math.random()*reply.length)]
  };

  let completedActions = [];
  if (reply.template) {
    reply.text = await getName(recipientId, reply, answer);
  }

  if (reply.persist) {
    await persistAction(recipientId, reply.persist);
  }

  if (key === 'default') {
    completedActions = await getActions(recipientId);
  }

  let message;
  if (reply.text) message = { text: reply.text };
  if (reply.replies) message = quickReply(reply);
  if (reply.buttons) message = buttonTemplate(reply, completedActions);
  if (reply.generic) message = genericTemplate(reply);

  return callSendAPI({recipient, message}).then(() => {
    if (reply.next) {
      const delay = () => {
        let delayForEnviroment = NODE_ENV === 'test' ? 1 : (NODE_ENV === 'dev' ? 1000 : (reply.delay || 5000));
        return delayMessage(recipientId, reply.next, delayForEnviroment);
      }
      return reply.disable_typing ? delay() : callSendAPI({recipient, sender_action: 'typing_on'}).then(delay());
    }
  })
}

export const message = (e, ctx, cb) => {
  if (NODE_ENV !== 'test') console.log("invoking!", e)
  setTimeout(() => {
    sendMessage(e.recipientId, e.next).then(cb, cb);
  }, e.delay);
};

export function delayMessage(recipientId, next, delay) {
  const aws = require('aws-sdk');
  const lambda = new aws.Lambda({region: 'us-east-1'});
  const payload = {recipientId: recipientId, next: next, delay: delay};
  if (['dev', 'test'].includes(NODE_ENV)) {
    return promisify(message)(payload, null)
  }
  return promisify(::lambda.invoke)({
    FunctionName: `volunteer-chat-bot-${NODE_ENV}-message`,
    InvocationType: 'Event',
    Payload: JSON.stringify(payload)
  })
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
          if (err) console.log('Unable to update profile', {err});
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
  if (availableButtons.length < 1) { return script.all_done };
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
