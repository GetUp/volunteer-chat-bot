const mod = require('../bot.js');
import { script } from '../script';
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'chat' });
import fs from 'fs';
import nock from 'nock';
import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient({region: 'localhost', endpoint: 'http://localhost:8000'});


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
        nestedTimeout(3, () => {
          graphAPICalls.done();
          done(err)
        });
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
        nestedTimeout(3, () => {
          graphAPICalls.done();
          done(err)
        });
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
        nestedTimeout(50, () => {
          graphAPICalls.done();
          done(err)
        });
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
      wrapped.run(receivedData, (err) => {
        nestedTimeout(13, () => {
          graphAPICalls.done();
          done(err)
        });
      });
    });
  });

  context('with a reply that appears to be a postcode', () => {
    const receivedData = JSON.parse(fs.readFileSync(fixture('message'), 'utf8'));
    receivedData.body.entry[0].messaging[0].message.text = ' 2000 ';
    const recipient = receivedData.body.entry[0].messaging[0].sender.id;
    const mockedProfile = {first_name: 'test', last_name: 'user'};
    let graphAPICalls;

    beforeEach(() => {
      graphAPICalls = nock('https://graph.facebook.com')
        .get(`/v2.8/${recipient}`)
        .query(true)
        .reply(200, mockedProfile)
    });

    it('should get their details from a facebook and prompt to confirm the number', (done) => {
      graphAPICalls.post('/v2.6/me/messages', (body) => {
          return body.message.text.match(/2000/) &&
            body.message.text.match(mockedProfile.first_name) &&
            body.message.quick_replies[0].title.match(script.petition_details.replies[0].t);
        })
        .query(true)
        .reply(200);
      wrapped.run(receivedData, (err) => {
        nestedTimeout(30, () => {
          graphAPICalls.done();
          done(err);
        });
      });
    });

    it('should store their profile', (done) => {
      graphAPICalls.post('/v2.6/me/messages').query(true).reply(200);
      wrapped.run(receivedData, (err) => {
        nestedTimeout(10, () => {
          const payload = {
            TableName: 'volunteer-chat-bot-test-members',
            Key: {fbid: recipient}
          };

          dynamo.get(payload, (err, res) => {
            expect(res.Item.profile.first_name).to.be.equal(mockedProfile.first_name);
            done(err);
          });
        });
      });
    });
  });

  context('with a delayed reply that typing turned off', () => {
    let receivedData = JSON.parse(fs.readFileSync(fixture('get_started'), 'utf8'));
    receivedData.body.entry[0].messaging[0].postback.payload = 'group_intro';

    it('should not send the typing message', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', body => !body.message.sender_action)
        .query(true)
        .reply(200);
      wrapped.run(receivedData, (err) => {
        nestedTimeout(1, () => {
          graphAPICalls.done();
          done(err)
        });
      });
    });
  });

  context('with a response that persists data', () => {
    const receivedData = JSON.parse(fs.readFileSync(fixture('postback'), 'utf8'));
    receivedData.body.entry[0].messaging[0].postback = { payload: 'group_joined' };
    const recipient = receivedData.body.entry[0].messaging[0].sender.id;
    const payload = {
      TableName: 'volunteer-chat-bot-test-members',
      Key: {fbid: recipient}
    };
    beforeEach(done => dynamo.delete(payload, done));
    beforeEach(() => {
      nock('https://graph.facebook.com')
        .post('/v2.6/me/messages').query(true).reply(200);
    })

    context('without an existing user', () => {
      it('stores the actions', (done) => {
        wrapped.run(receivedData, (err) => {
          nestedTimeout(40, () => {
            dynamo.get(payload, (err, res) => {
              expect(res.Item.actions[0]).to.be.equal('group_joined');
              done(err);
            });
          });
        });
      });
    });

    context('with an existing user', () => {
      const member = {
        TableName: 'volunteer-chat-bot-test-members',
        Item: {fbid: recipient, profile: {
          first_name: 'test'
        }}
      };
      beforeEach(done => dynamo.put(member, done));

      it('does not overwrite the user profile', (done) => {
        wrapped.run(receivedData, (err) => {
          nestedTimeout(40, () => {
            dynamo.get(payload, (err, res) => {
              expect(res.Item.profile.first_name).to.be.equal('test');
              expect(res.Item.actions[0]).to.be.equal('group_joined');
              done(err);
            });
          });
        });
      });
    });

    context("after taking action and reloading the menu", () => {
      // Remove the delay between next action so that the menu message is sent
      beforeEach(() => mod.loadedScript.group_joined.delay = 1)
      afterEach(() => mod.loadedScript.group_joined.delay = null)

      it("should remove the action from the menu", (done) => {
          const graphAPICalls = nock('https://graph.facebook.com')
            .post('/v2.6/me/messages')
            .query(true).reply(200)
            .post('/v2.6/me/messages', (body) => {
              return !body.message.attachment.payload.buttons.map(b=>b.payload).includes('group_intro');
            }).query(true).reply(200);

          wrapped.run(receivedData, (err) => {
            nestedTimeout(100, () => {
              graphAPICalls.done();
              done();
            });
          });

      });
    });

  });
});

function fixture(file) {
  return `${__dirname}/fixtures/${file}.json`
}

function nestedTimeout(levels, cb) {
  if (levels === -1) return cb();
  setTimeout( () => {
    nestedTimeout(levels - 1, cb);
  }, 0);
}
