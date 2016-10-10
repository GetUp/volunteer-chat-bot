const mod = require('../bot.js');
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'chat' });
import fs from 'fs';
import nock from 'nock';

describe('chat', () => {
  context('with a postback from the Get Started button', () => {
    const receivedData = JSON.parse(fs.readFileSync('test/fixtures/postback.json', 'utf8'));

    it('starts the converstaion and send the default message', (done) => {
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

  context('with a text message', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));

    it('should start the conversation and send a quick reply', (done) => {
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

  context('with a text message with a quick reply payload', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'ask_for_phone' };

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
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'link_to_vollie_group' };

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

  context('with a reply that appears to be a mobile', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));
    receivedData.body.entry[0].messaging[0].message.text = '02 9579 5627';

    it('should with a prompt to confirm the number', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/0295795627/) &&
            body.message.quick_replies[0].title.match(/Yes/);
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

  context('with a reply that appears to be a mobile', () => {
    const receivedData = JSON.parse(fs.readFileSync('event.json', 'utf8'));
    receivedData.body.entry[0].messaging[0].message.text = ' 2000 ';

    it('should with a prompt to confirm the number', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/2000 is your postcode/) &&
            body.message.quick_replies[0].title.match(/Yes/);
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
