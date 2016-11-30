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
const fbid = '583b8377e4b074593314e725';
const memberQuery = { TableName, Key: {fbid} };

describe('webhook', () => {
  beforeEach(done => dynamo.delete(memberQuery, done));

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

      it('stores the member profile', done => {
        const profile = fixture('profile');
        wrapped.run(payload, (err, _) => {
          dynamo.get(memberQuery, (err, res) => {
            expect(res.Item).to.be.eql(profile);
            done(err);
          });
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
