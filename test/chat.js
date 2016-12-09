const bot = require('../bot.js');
import { script } from '../script';
const mochaPlugin = require('serverless-mocha-plugin');
const expect = mochaPlugin.chai.expect;
import fs from 'fs';
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient({region: 'localhost', endpoint: 'http://localhost:8000'});

const TableName = 'chatfuel-json-api-test-members';
const fbid = '583b8377e4b074593314e725';
const memberQuery = { TableName, Key: {fbid} };

describe('bot', () => {
  beforeEach(done => dynamo.delete(memberQuery, done));

  describe('chat', () => {
    context('with a welcome callback', () => {
      const payload = fixture('welcome');

      it('stores the profile', done => {
        const profile = fixture('profile');
        bot.chat(payload, {}, (err, res) => {
          dynamo.get(memberQuery, (err, res) => {
            expect(res.Item).to.be.eql(profile);
            done(err);
          });
        });
      });

      context('with an existing action', () => {
        const actions = [{action: 'subscribed'}];
        beforeEach(done => dynamo.put({TableName, Item: {fbid, actions}}, done));

        it('does not overwrite previous actions', done => {
          bot.chat(payload, {}, (err, _) => {
            dynamo.get(memberQuery, (err, res) => {
              expect(res.Item.actions.length).to.be.equal(1);
              expect(res.Item.actions[0].action).to.be.equal('subscribed');
              done(err);
            });
          });
        });
      });

      context('with an empty string attribute', () => {
        beforeEach(() => payload.queryStringParameters.gender = "");

        it('persists the valid attributes', done => {
          bot.chat(payload, {}, (err, _) => {
            dynamo.get(memberQuery, (err, res) => {
              expect(res.Item.profile.first_name).to.be.equal("Tim");
              expect(res.Item.profile.last_name).to.be.equal("McEwan");
              done(err);
            });
          });
        });
      });
    });

    context('with a postcode that spans one electorate', () => {
      const payload = { queryStringParameters: { fbid,
        key: "postcode",
        postcode: "2000",
      }};

      it('returns a group view message for the postcode', done => {
        const response = responseFile('postcode_2000');
        bot.chat(payload, {}, (err, res) => {
          const body = JSON.parse(res.body);
          expect(body).to.be.eql(response);
          done(err);
        });
      });

      it('stores the postcode', done => {
        bot.chat(payload, {}, (err, _) => {
          dynamo.get(memberQuery, (err, res) => {
            expect(res.Item.postcode).to.be.equal('2000');
            done(err);
          });
        });
      });
    });

    context('with a postcode that spans more than one electorate', () => {
      const payload = { queryStringParameters: { fbid,
        key: "postcode",
        postcode: "2042",
      }};

      it('returns a multi electorate message with quick replies', done => {
        const response = responseFile('postcode_2042');
        bot.chat(payload, {}, (err, res) => {
          const body = JSON.parse(res.body);
          expect(body).to.be.eql(response);
          done(err);
        });
      });

      it('also stores the postcode', done => {
        bot.chat(payload, {}, (err, _) => {
          dynamo.get(memberQuery, (err, res) => {
            expect(res.Item.postcode).to.be.equal('2042');
            done(err);
          });
        });
      });
    });

    context('with an electorate', () => {
      const payload = { queryStringParameters: { fbid,
        key: "electorate",
        electorate: "wentworth",
      }};

      it('returns a group view message for the electorate', done => {
        const response = responseFile('electorate_wentworth');
        bot.chat(payload, {}, (err, res) => {
          const body = JSON.parse(res.body);
          expect(body).to.be.eql(response);
          done(err);
        });
      });

      it('stores the electorate', done => {
        bot.chat(payload, {}, (err, _) => {
          dynamo.get(memberQuery, (err, res) => {
            expect(res.Item.electorate).to.be.equal('wentworth');
            done(err);
          });
        });
      });
    });

    context('with an action', () => {
      const payload = { queryStringParameters: { fbid,
        key: "action",
        action: "group_joined",
      }};
      const profile = fixture('profile');
      beforeEach(done => dynamo.put({TableName, Item: profile}, done));

      it('stores actions', done => {
        bot.chat(payload, {}, (err, _) => {
          bot.chat(payload, {}, (err, _) => {
            dynamo.get(memberQuery, (err, res) => {
              expect(res.Item.actions.length).to.be.equal(2);
              expect(res.Item.actions[0].action).to.be.equal('group_joined');
              expect(res.Item.actions[1].action).to.be.equal('group_joined');
              done(err);
            });
          });
        });
      });
    });

    context('with a mobile number', () => {
      const payload = { queryStringParameters: { fbid,
        key: "mobile",
        mobile: "0412345678",
      }};

      it('stores the mobile', done => {
        bot.chat(payload, {}, (err, _) => {
          dynamo.get(memberQuery, (err, res) => {
            expect(res.Item.mobile).to.be.equal('0412345678');
            done(err);
          });
        });
      });
    });

    context('with an email address', () => {
      const payload = { queryStringParameters: { fbid,
        key: "email",
        email: "tim@example.com",
      }};

      it('stores the mobile', done => {
        bot.chat(payload, {}, (err, _) => {
          dynamo.get(memberQuery, (err, res) => {
            expect(res.Item.email).to.be.equal('tim@example.com');
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
