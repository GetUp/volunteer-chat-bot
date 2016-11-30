if (!global._babelPolyfill) require('babel-polyfill');
require('dotenv').config();
const NODE_ENV = process.env.NODE_ENV;
const HOSTNAME = process.env.HOSTNAME;

// const moment = require('moment-timezone');
// moment.tz.setDefault('Australia/Sydney');
// import request from 'request';
// const rp = require('request-promise-native');
import { script } from './script';
import { allGroups } from './groups';
import promisify from 'es6-promisify'
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient(dbConf());

const dynamoGet = promisify(::dynamo.get);
const dynamoPut = promisify(::dynamo.put);
const dynamoUpdate = promisify(::dynamo.update);
const TableName = `chatfuel-json-api-${NODE_ENV}-members`;

export const chat = (e, ctx, cb) => {
  if (NODE_ENV !== 'test') console.log({
    query: JSON.stringify(e.queryStringParameters),
    body: JSON.stringify(e.body),
  });

  const response = {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
  };

  handleParams(e.queryStringParameters)
    .then((body) => {
      cb(null, { ...response, body })
    }, (err) => {
      console.error('ERROR', err);
      cb(err);
    })
};

async function handleParams(params) {
  let message;

  if (params.postcode) {
    message = postcodeMessage(params.postcode, params.fbid);
    await storeProfile(params);
  } else if (params.key && params.key.match(/^electorate_/)) {
    message = electorateMessage(params.key);
    await storeElectorate(params.key, params.fbid);
  }

  return JSON.stringify(message);
}

async function storeProfile(params) {
  return dynamoPut({TableName, Item: params});
}

async function storeElectorate(key, fbid) {
  const payload = {
    TableName,
    Key: {fbid},
    UpdateExpression: 'SET electorate = :value',
    ExpressionAttributeValues: { ':value': key },
  };
  return dynamoUpdate(payload);
}

function postcodeMessage(postcode, fbid) {
  const groups = getGroups(postcode);
  let reply;
  if (groups.length === 1) {
    reply = buttonTemplate(fillTemplate(script['group_view'], groups[0], postcode));
  } else {
    reply = showElectorates(script['group_multiple_electorates'], groups, postcode, fbid);
  }

  return { messages: [{ ...reply }] };
}

function showElectorates(reply, groups, postcode, fbid) {
  reply.text = reply.template.replace(/{postcode}/, postcode);
  delete reply.template;
  reply.quick_replies = groups.map(group => {
    return {
      type: 'json_plugin_url',
      url: `${HOSTNAME}/webhook?key=${group.key}&fbid=${fbid}`,
      title: group.electorate,
    }
  });
  return reply;
}

function electorateMessage(key) {
  const group = allGroups.find(group => group.key === key);
  const reply = buttonTemplate(fillTemplate(script['group_view'], group, group.electorate));
  return { messages: [{ ...reply }] };
}

function getGroups(postcode) {
  const groups = allGroups.filter(group => group.postcodes.includes(postcode));
  return groups.length ? groups : [ allGroups[0] ];
}

function fillTemplate(reply, group, area) {
  reply.text = reply.template
    .replace(/{area}/, area)
    .replace(/{group_name}/, group.name);
  reply.buttons[0].url = group.url;
  return reply;
}

function buttonTemplate(reply, completedActions) {
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
      }else if (message.text.toLowerCase() === "stop" || message.text.match(/unsubscribe/i)) {
        messages.push(sendMessage(recipientId, 'unsubscribe'));
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

  if (key === 'fallthrough' && await firstTimer(recipientId)) reply = script['intro'];

  const profile = await setupProfile(recipientId);
  const repeatedMessage = await repeatMessageCheck(recipientId, key);
  await prependLog(recipientId, key);
  if (repeatedMessage) {
    if (NODE_ENV !== 'test') console.error("REPEATED KEY?");
    return;
  };

  if (key.match(/^electorate_/)) {
    const group = allGroups.find(group => group.key === key);
    reply = fillTemplate(script['group_view'], group, group.electorate);
  }

  // if (postcode && profile.previous === 'petition_postcode') {
  //   key = 'petition_details';
  //   reply = script[key];
  // }

  let completedActions = [];
  switch(key) {
    case 'intro':
      await setAttribute(recipientId, {started: moment().format()});
    case 'default':
    case 'default_group':
    case 'default_subscribe':
    case 'default_petition':
    case 'default_continue':
    case 'default_persistent_menu':
      completedActions = await getActions(recipientId);
      await clearIntroActions(recipientId);
      await setAttribute(recipientId, {ignore_text: false});
      break;
    // case 'fallthrough':
    //   const ignore = await getAttribute(recipientId, 'ignore_text');
    //   if (ignore) return;
    //   await setAttribute(recipientId, {ignore_text: true});
    //   break;
    case 'petition_details':
      reply.text = await getName(recipientId, reply, postcode);
      break;
    case 'group_view':
      const groups = getGroups(postcode);
      if (groups.length === 1) {
        reply = fillTemplate(reply, groups[0], postcode);
      } else {
        reply = showElectorates(script['group_multiple_electorates'], groups, postcode);
      }
      break;
    default:
  }

  if (reply.persist) {
    await persistAction(recipientId, reply.persist);
  }

  let message;
  if (reply.text) message = { text: reply.text };
  if (reply.replies) message = quickReply(reply, completedActions);
  if (reply.buttons) message = buttonTemplate(reply, completedActions);
  if (reply.generic) message = genericTemplate(reply);

  return callSendAPI({recipient, message})
    .then(() => setAttribute(recipientId, {previous: key}))
    .then(() => {
      if (reply.next) {
        const delay = () => {
          let delayForEnviroment = NODE_ENV === 'test' ? 1 : (NODE_ENV === 'dev' ? 1000 : (reply.delay || 4000));
          return delayMessage(recipientId, reply.next, delayForEnviroment);
        }
        return reply.disable_typing ? delay() : callSendAPI({recipient, sender_action: 'typing_on'}).then(delay);
      }
    });
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
    FunctionName: `chatfuel-json-api-${NODE_ENV}-message`,
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
      console.log(`####### non-200 response.statusCode: ${response && response.statusCode}`);
      console.log({body});
      reject(error || body);
    });
  })
}

async function firstTimer(fbid) {
  const res = await dynamoGet({TableName, Key: {fbid}});
  if (!res.Item) return true;
}

async function setupProfile(fbid) {
  const res = await dynamoGet({TableName, Key: {fbid}});
  if (res.Item && res.Item.profile && res.Item.actions && res.Item.log) return res.Item;

  const profile = await getProfile(fbid);
  const actions = res.Item && res.Item.actions || [];
  const log = res.Item && res.Item.log || [];
  let newProfile = {fbid, profile, actions, log, ignore_text: false};
  await dynamoPut({TableName, Item: newProfile});
  return newProfile;
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

async function repeatMessageCheck(fbid, key) {
  const messageLog = await getAttribute(fbid, 'log');
  const repeat = messageLog.find(message => message.key === key);
  if (repeat && moment().diff(repeat.timestamp, 's') < 25) return true;
  return false;
}

async function prependLog(fbid, key) {
  const payload = {
    TableName,
    Key: {fbid},
    UpdateExpression: 'SET #attrName = list_append(:attrValue, #attrName)',
    ExpressionAttributeNames: { '#attrName': 'log' },
    ExpressionAttributeValues: { ':attrValue': [{key, timestamp: moment().format()}] }
  };
  return dynamoUpdate(payload);
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

// "intro actions" prevent a menu item from displaying one time
// so we don't loop endlessly on one item
async function clearIntroActions(fbid) {
  const res = await dynamoGet({TableName, Key: {fbid}});
  if (!res.Item) return;
  const actions = (res.Item.actions || []).filter(action => !action.match(/_intro/))
  return dynamoPut({TableName, Item: {...res.Item, actions}});
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

function quickReply(reply, completedActions) {
  const availableOptions = actionFilter(completedActions, reply.replies);
  if (availableOptions.length < 1) { return script.all_done };
  return {
    text: reply.text,
    quick_replies: availableOptions,
  };
}

function actionFilter(completedActions, options) {
  const actionsToRemove = completedActions.map(action => script.action_menu[action]);
  return options.filter(option => !actionsToRemove.includes(option.payload));
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
