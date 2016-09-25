const mod = require('../bot.js');
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'chat' });
import fs from 'fs';
import nock from 'nock';

describe('chat', () => {
  context('with a text message', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));
    it('should send a greeting message and options to take action', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', {message: {text: /GetUp Volunteer Chatbot/}})
        .query(true)
        .reply(200, {message_id: 1, recipient_id: 1})
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/What action would you like to take/) &&
            body.message.quick_replies[0].title.match(/petition/);
        })
        .query(true)
        .reply(200);
      wrapped.run(receivedData, (err) => {
        setImmediate( () => {
          graphAPICalls.done();
          done(err)
        });
      });
    });
  });
});
