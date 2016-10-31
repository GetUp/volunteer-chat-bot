if (!global._babelPolyfill) require('babel-polyfill');
require('dotenv').config();
const NODE_ENV = process.env.NODE_ENV;

import request from 'request';
const rp = require('request-promise-native');
import { script } from './script';
import { groups } from './groups';
import promisify from 'es6-promisify'
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient(dbConf());

const dynamoGet = promisify(::dynamo.get);
const dynamoPut = promisify(::dynamo.put);
const TableName = `volunteer-chat-bot-${NODE_ENV}-members`;

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

function onlyErrorInTest(promise, cb) {
  promise.then(() => cb(), (err) => {
    console.error('ERROR', err);
    cb(NODE_ENV === 'test' ? err : undefined);
  })
}

export const chat = function(e, ctx, cb) {
  onlyErrorInTest(chatAsync(e), cb);
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
        messages.push(sendMessage(recipientId, 'group_view', postcode));
      }else{
        messages.push(sendMessage(recipientId, 'fallthrough'));
      }
    });
  })
  await Promise.all(messages);
}

export async function sendMessage(recipientId, key, postcode) {
  const recipient = { id: recipientId };
  let reply = script[key] || script['unknown_payload'];

  let completedActions = [];

  switch(key) {
    case 'default':
      completedActions = await getActions(recipientId);
      await setAttribute(recipientId, {ignore_text: false});
      break;
    case 'fallthrough':
      const ignore = await getAttribute(recipientId, 'ignore_text');
      if(ignore) return;
      await setAttribute(recipientId, {ignore_text: true});
      break;
    case 'petition_details':
      reply.text = await getName(recipientId, reply, postcode);
      break;
    case 'group_view':
      const profile = await getProfile(recipientId);
      await storeProfile(recipientId, {...profile, postcode});
      const group = getGroup(postcode);
      reply = fillTemplate(reply, group, postcode);
      break;
    default:
  }

  if (reply.persist) {
    await persistAction(recipientId, reply.persist);
  }

  let message;
  if (reply.text) message = { text: reply.text };
  if (reply.replies) message = quickReply(reply);
  if (reply.buttons) message = buttonTemplate(reply, completedActions);
  if (reply.generic) message = genericTemplate(reply);

  return callSendAPI({recipient, message}).then(() => {
    if (reply.next) {
      const delay = () => {
        let delayForEnviroment = NODE_ENV === 'test' ? 1 : (NODE_ENV === 'dev' ? 1000 : (reply.delay || 4000));
        return delayMessage(recipientId, reply.next, delayForEnviroment);
      }
      return reply.disable_typing ? delay() : callSendAPI({recipient, sender_action: 'typing_on'}).then(delay);
    }
  })
}

export const message = (e, ctx, cb) => {
  if (NODE_ENV !== 'test') console.log("invoking!", e)
  setTimeout(() => {
    onlyErrorInTest(sendMessage(e.recipientId, e.next), cb);
  }, e.delay);
};

export function delayMessage(recipientId, next, delay) {
  const aws = require('aws-sdk');
  const lambda = new aws.Lambda({region: 'us-east-1'});
  const payload = {recipientId: recipientId, next: next, delay: delay};
  if (['dev', 'test'].includes(NODE_ENV)) {
    return promisify(message)(payload, null);
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

async function getAttribute(fbid, attr) {
  const res = await dynamoGet({TableName, Key: {fbid}});
  return res.Item && res.Item[attr];
}

async function setAttribute(fbid, attr) {
  const payload = {TableName, Key: {fbid}};
  const res = await dynamoGet(payload);
  const Item = Object.assign({fbid}, res.Item, attr);
  return dynamoPut({TableName, Item});
}

async function getProfile(recipientId) {
  const payload = {
    uri: `https://graph.facebook.com/v2.8/${recipientId}`,
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'GET',
  };
  const body = await rp(payload);
  return JSON.parse(body);
}

async function storeProfile(fbid, profile) {
  const member = {TableName, Key: {fbid}};
  const res = await dynamoGet(member);
  const actions = res.Item && res.Item.actions || [];
  return dynamoPut({TableName, Item: {fbid, profile, actions}});
}

function getGroup(postcode) {
  const group = groups.find(group => group.postcodes.includes(postcode));
  return group || groups[0];
}

function fillTemplate(reply, group, postcode) {
  reply.text = reply.template
    .replace(/{postcode}/, postcode)
    .replace(/{group_name}/, group.name);
  reply.buttons[0].url = group.url;
  return reply;
}

async function persistAction(fbid, action) {
  const member = {TableName, Key: {fbid}};
  const res = await dynamoGet(member);
  const actions = (res.Item && res.Item.actions || []).concat(action);
  const Item = res.Item ? {...res.Item, actions} : {fbid, actions};
  return dynamoPut({TableName, Item});
}

function getName(recipientId, reply, postcode) {
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
            .replace(/{postcode}/, postcode);
          return resolve(text);
        };

        const cb = (err, res) => {
          if (err) console.log('Unable to update profile', {err});
          returnText();
        };
        const memberData = {first_name, last_name, postcode, ...attrs};
        return storeMember(recipientId, memberData, cb);
      }
      reject(err || body);
    });
  })
}

async function getActions(fbid) {
  const res = await dynamoGet({TableName, Key: {fbid}});
  return res.Item && res.Item.actions || [];
}

function storeMember(fbid, profile, cb) {
  const member = {TableName, Key: {fbid}};
  dynamo.get(member, (err, res) => {
    if (err) return cb(err);
    const actions = res.Item && res.Item.actions || [];
    const payload = { TableName, Item: {fbid, profile, actions} };
    dynamo.put(payload, cb);
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
