const bot = require('../bot.js');
import { script } from '../script';
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(bot, { handler: 'chat' });
import fs from 'fs';
// import nock from 'nock';
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient({region: 'localhost', endpoint: 'http://localhost:8000'});
// const tk = require('timekeeper');
// const moment = require('moment-timezone');

const TableName = 'chatfuel-json-api-test-members';
const fbid = '1274747332556664';

describe('webhook', () => {
  // beforeEach(done => dynamo.delete(payload, done));
  describe('postcode', () => {
    context('with a postcode that spans one electorate', () => {
      const payload = fixture('postcode_event');
      it('returns a group view message with button', done => {
        const response = responseFile('postcode_2000');
        wrapped.run(payload, (err, res) => {
          expect(res).to.be.eql(response);
          done();
        });
      });
    });
  });
});

function fixture(file) {
  return JSON.parse(fs.readFileSync(`${__dirname}/fixtures/${file}.json`, 'utf8'));
}

function responseFile(file) {
  return JSON.parse(fs.readFileSync(`${__dirname}/responses/${file}.json`, 'utf8'));
}
