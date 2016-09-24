const mod = require('../bot.js');
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'chat' });
import fs from 'fs';
import nock from 'nock';

describe('bot', () => {
  context('with a text message', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));
    it('should send a greeting message', (done) => {
      const apiCall = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', {message: {text: /GetUp Volunteer Chatbot/}})
        .query(true)
        .reply(200, {message_id: 1, recipient_id: 1});
      wrapped.run(receivedData, (err) => {
        setImmediate( () => {
          apiCall.done();
          done(err)
        });
      });
    });
  });
});
