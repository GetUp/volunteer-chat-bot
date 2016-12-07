if (!global._babelPolyfill) require('babel-polyfill');
require('dotenv').config();
const NODE_ENV = process.env.NODE_ENV;
let apiPath = process.env.API_PATH;

import { script } from './script';
import { allGroups } from './groups';

const moment = require('moment-timezone');
moment.tz.setDefault('Australia/Sydney');
import promisify from 'es6-promisify'
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient(dbConf());
const dynamoPut = promisify(::dynamo.put);
const dynamoUpdate = promisify(::dynamo.update);
const TableName = `chatfuel-json-api-${NODE_ENV}-members`;

export const chat = (e, ctx, cb) => {
  if (NODE_ENV !== 'test') console.log({
    query: JSON.stringify(e.queryStringParameters),
    body: JSON.stringify(e.body),
  });

  if (e.headers && e.requestContext) {
    apiPath = `https://${e.headers.Host}/${e.requestContext.stage}/webhook`;
  }

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

async function handleParams({key, fbid, ...params}) {
  let message = { set_variables: {welcome: true} };

  switch(key) {
    case 'welcome':
      await storeProfile(fbid, params);
      break;
    case 'postcode':
      await setAttr(fbid, 'postcode', params.postcode);
      message = postcodeMessage(fbid, params.postcode);
      break;
    case 'electorate':
      await setAttr(fbid, 'electorate', params.electorate);
      message = electorateMessage(fbid, params.electorate);
      break;
    case 'action':
      await storeAction(fbid, params.action);
      break;
    default:
  }

  return JSON.stringify(message);
}

async function storeAction(fbid, action) {
  const payload = {
    TableName,
    Key: {fbid},
    UpdateExpression: 'SET actions = list_append(:value, actions)',
    ExpressionAttributeValues: {
      ':value': [{action, timestamp: moment().format()}]
    }
  };
  return dynamoUpdate(payload);
}

async function storeProfile(fbid, params) {
  const sanitisedParams = sanitiseParams(params);
  const payload = {
    TableName,
    Item: {
      fbid,
      profile: sanitisedParams,
      actions: [],
    },
    ConditionExpression: 'attribute_not_exists(fbid)',
  };
  try {
    await dynamoPut(payload);
    return;
  } catch (e) {
    if (e.code === "ConditionalCheckFailedException") return;
    throw e;
  }
}

function sanitiseParams(params) {
  const validAttrs = Object.entries(params).map(([key, val]) => !!val && {[key]: val});
  return Object.assign({}, ...validAttrs);
}

async function setAttr(fbid, attr, val) {
  const payload = {
    TableName,
    Key: {fbid},
    UpdateExpression: `SET ${attr} = :value`,
    ExpressionAttributeValues: { ':value': val },
  };
  return dynamoUpdate(payload);
}

function postcodeMessage(fbid, postcode) {
  const groups = getGroups(postcode);
  if (groups.length === 1) return areaTemplate(groups[0], postcode);

  const template = Object.assign({}, script['group_multiple_electorates']);
  const reply = showElectorates(template, groups, postcode, fbid);
  return { messages: [{ ...reply }] };
}

function electorateMessage(fbid, electorate) {
  const group = allGroups.find(group => group.key === electorate);
  return areaTemplate(group, group.electorate);
}

function areaTemplate(group, area) {
  const template = Object.assign({}, script['group_view']);
  const reply = buttonTemplate(fillTemplate(template, group, area));
  const electorate = group.electorate;
  return { set_variables: {electorate}, messages: [{ ...reply }] };
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

function showElectorates(reply, groups, postcode, fbid) {
  reply.text = reply.template.replace(/{postcode}/, postcode);
  delete reply.template;
  reply.quick_replies = groups.map(group => {
    return {
      type: 'json_plugin_url',
      url: `${apiPath}?key=electorate&electorate=${group.key}&fbid=${fbid}`,
      title: group.electorate,
    }
  });
  return reply;
}

function dbConf() {
  if (['dev', 'test'].includes(NODE_ENV)) {
    return {region: 'localhost', endpoint: 'http://localhost:8000'}
  }
  return {region: 'us-east-1'};
}
