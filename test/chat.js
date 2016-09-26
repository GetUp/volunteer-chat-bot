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

    it('should start the converstaion and send a quick reply', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/Have you joined/) &&
            body.message.quick_replies[0].title.match(/Not yet/);
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

  context('with a text message with a quick reply payloy', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'vollie_yes' };

    it('should respond with the correct reply', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/Keep your eye out/);
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

  context('with a reply that has a button', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'vollie_no' };

    it('should respond with the correct reply', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.attachment.payload.text.match(/here's the link/) &&
                 body.message.attachment.payload.buttons[0].url.match(/facebook.com\/groups/);
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
