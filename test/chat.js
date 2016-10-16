const mod = require('../bot.js');
import { script } from '../script';
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'chat' });
import fs from 'fs';
import nock from 'nock';

describe('chat', () => {
  context('with a postback from the Get Started button', () => {
    const receivedData = JSON.parse(fs.readFileSync(fixture('get_started'), 'utf8'));

    it('starts the conversation and sends the intro message', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return !!body.message.text.match(/Welcome to the GetUp Volunteer Action Hub/);
        })
        .query(true)
        .reply(200)
        .post('/v2.6/me/messages', {"recipient":{"id":"1274747332556664"},"sender_action":"typing_on"})
        .query(true)
        .reply(200)
      wrapped.run(receivedData, (err) => {
        setTimeout( () => {
          graphAPICalls.done();
          done(err)
        }, 20);
      });
    });
  });

  context('with a message that triggers a short message followed by quick replies', () => {
    const receivedData = JSON.parse(fs.readFileSync(fixture('get_started'), 'utf8'));

    it('should send back a message and then after a short delay send quick replies', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/Welcome to the GetUp Volunteer Action Hub/) ||
            ( body.message.text.match(/Here are some ways/) &&
             body.message.quick_replies[0].title.match(/Subscribe to updates/) );
        })
        .query(true)
        .reply(200)
        .post('/v2.6/me/messages', {"recipient":{"id":"1274747332556664"},"sender_action":"typing_on"})
        .query(true)
        .reply(200);
      wrapped.run(receivedData, (err) => {
        setTimeout( () => {
          graphAPICalls.done();
          done(err)
        }, 20);
      });
    });
  });

  context('with a text message with a quick reply payload', () => {
    const receivedData = JSON.parse(fs.readFileSync(fixture('message'), 'utf8'));
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'subscribe_yes' };

    it('should respond with the correct reply', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(script.subscribe_yes.text);
        })
        .query(true)
        .reply(200)
        .post('/v2.6/me/messages', {"recipient":{"id":"1274747332556664"},"sender_action":"typing_on"})
        .query(true)
        .reply(200);
      wrapped.run(receivedData, (err) => {
        setTimeout( () => {
          graphAPICalls.done();
          done(err)
        }, 10);
      });
    });
  });

  context('with a reply that has a button', () => {
    const receivedData = JSON.parse(fs.readFileSync(fixture('message'), 'utf8'));
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'group_view' };

    it('should respond with the correct reply', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.attachment.payload.text.match(script.group_view.text) &&
                 body.message.attachment.payload.buttons[0].url.match(script.group_view.buttons[0].url);
        })
        .query(true)
        .reply(200)
        .post('/v2.6/me/messages', {"recipient":{"id":"1274747332556664"},"sender_action":"typing_on"})
        .query(true)
        .reply(200);
      wrapped.run(receivedData, (err) => {
        setTimeout( () => {
          graphAPICalls.done();
          done(err)
        }, 10);
      });
    });
  });

  context('with a reply that appears to be a postcode', () => {
    const receivedData = JSON.parse(fs.readFileSync(fixture('message'), 'utf8'));
    receivedData.body.entry[0].messaging[0].message.text = ' 2000 ';
    const recipient = receivedData.body.entry[0].messaging[0].sender.id;
    const profile = {first_name: 'test', last_name: 'user'};

    it('should get their details from a facebook and prompt to confirm the number', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .get(`/v2.8/${recipient}`)
        .query(true)
        .reply(200, profile)
        .post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/2000/) &&
            body.message.text.match(profile.first_name) &&
            body.message.quick_replies[0].title.match(script.petition_details.replies[0].t);
        })
        .query(true)
        .reply(200);
      wrapped.run(receivedData, (err) => {
        setTimeout( () => {
          graphAPICalls.done();
          done(err)
        }, 40);
      });
    });
  });
});

function fixture(file) {
  return `${__dirname}/fixtures/${file}.json`
}
