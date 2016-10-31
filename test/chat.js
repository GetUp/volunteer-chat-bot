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

const TableName = 'volunteer-chat-bot-test-members';
const fbid = '1274747332556664';
let firstIntercept;

describe('chat', () => {
  const mockedProfile = {first_name: 'test', last_name: 'user'};
  const payload = { TableName, Key: {fbid} };
  beforeEach(done => dynamo.delete(payload, done));
  afterEach(() => {
    firstIntercept = false;
    nock.cleanAll();
  });

  context('with a postback from the Get Started button', () => {
    const receivedData = fixture('get_started');
    beforeEach(() => {
      nock('https://graph.facebook.com')
        .get(`/v2.8/${fbid}`)
        .query(true)
        .reply(200, mockedProfile)
    });

    it('starts the conversation and sends the intro message', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .persist()
        .post('/v2.6/me/messages', assertOnce((body) => {
          return !!body.message.text.match(/Welcome to the GetUp Volunteer Action Hub/);
        })).query(true).reply(200)

      wrapped.run(receivedData, (err) => {
        graphAPICalls.done();
        done(err)
      });
    });

    it('retrieves and saves the profile', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com').persist()
        .post('/v2.6/me/messages').query(true).reply(200)

      wrapped.run(receivedData, (err) => {
        dynamo.get({ TableName, Key: {fbid} }, (err, res) => {
          expect(res.Item.profile.first_name).to.be.equal(mockedProfile.first_name);
          done(err);
        });
      });
    });
  });

  context('with a message that triggers a short message followed by quick replies', () => {
    const receivedData = fixture('get_started');
    beforeEach(() => {
      nock('https://graph.facebook.com')
        .get(`/v2.8/${fbid}`)
        .query(true)
        .reply(200, mockedProfile)
    });

    it('should send back a message and then after a short delay send quick replies', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .persist()
        .post('/v2.6/me/messages', assertOnce((body) => {
          return body.message.text.match(/Welcome to the GetUp Volunteer Action Hub/) ||
            ( body.message.text.match(/Here are some ways/) &&
             body.message.quick_replies[0].title.match(/Subscribe to updates/) );
        })).query(true).reply(200)

      wrapped.run(receivedData, (err) => {
        graphAPICalls.done();
        done(err)
      });
    });
  });

  context('with a text message with a quick reply payload', () => {
    const receivedData = fixture('message');
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'subscribe_yes' };

    it('should respond with the correct reply - quick', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .persist()
        .post('/v2.6/me/messages', assertOnce((body) => {
          return body.message.text.match(script.subscribe_yes.text);
        })).query(true).reply(200)

      wrapped.run(receivedData, (err) => {
        graphAPICalls.done();
        done(err)
      });
    });
  });

  context('with a reply that has a button', () => {
    const receivedData = fixture('message');
    receivedData.body.entry[0].messaging[0].message.quick_reply = { payload: 'default' };

    it('should respond with the correct reply - button', (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .persist()
        .post('/v2.6/me/messages', assertOnce((body) => {
          return body.message.attachment.payload.text === script.default.text &&
                 body.message.attachment.payload.buttons[0].type === 'postback';
        })).query(true).reply(200)

      wrapped.run(receivedData, (err) => {
        graphAPICalls.done();
        done(err)
      });
    });
  });

  context('with a reply that appears to be a postcode', () => {
    const receivedData = fixture('message');
    receivedData.body.entry[0].messaging[0].message.text = ' 2000 ';
    let graphAPICalls;

    beforeEach(() => {
      graphAPICalls = nock('https://graph.facebook.com')
        .get(`/v2.8/${fbid}`)
        .query(true)
        .reply(200, mockedProfile)
    });

    it('should get their details from facebook and show them the appropriate action group', (done) => {
      graphAPICalls.persist()
        .post('/v2.6/me/messages', assertOnce((body) => {
          return body.message.attachment.payload.text.match(/2000/) &&
            body.message.attachment.payload.text.match(/GetUp Sydney/);
        })).query(true).reply(200);

      wrapped.run(receivedData, (err) => {
        graphAPICalls.done();
        done(err);
      });
    });

    it('should store their profile', (done) => {
      graphAPICalls.persist().post('/v2.6/me/messages').query(true).reply(200);
      wrapped.run(receivedData, (err) => {
        const payload = { TableName, Key: {fbid} };
        dynamo.get(payload, (err, res) => {
          expect(res.Item.profile.first_name).to.be.equal(mockedProfile.first_name);
          done(err);
        });
      });
    });

    context('with an existing action', () => {
      const memberAction = { TableName, Item: { fbid, actions: ['subscribed'] } };
      const member = { TableName, Key: {fbid} };
      beforeEach(done => dynamo.put(memberAction, done));
      beforeEach(() => graphAPICalls.persist().post('/v2.6/me/messages').query(true).reply(200));

      it('does not overwrite the previous actions on petition sign', (done) => {
        wrapped.run(receivedData, (err) => {
          graphAPICalls.done()
          dynamo.get(member, (err, res) => {
            expect(res.Item.actions[0]).to.be.equal('subscribed');
            done(err);
          });
        });
      });
    });
  });

  context('with a delayed reply that typing turned off', () => {
    let receivedData = fixture('get_started');
    receivedData.body.entry[0].messaging[0].postback.payload = 'group_view';
    let graphAPICalls;

    beforeEach(() => {
      graphAPICalls = nock('https://graph.facebook.com')
        .get(`/v2.8/${fbid}`)
        .query(true)
        .reply(200, mockedProfile)
    });

    it('should not send the typing message', (done) => {
      graphAPICalls
        .post('/v2.6/me/messages', body => !body.message.sender_action)
        .query(true).reply(200)
        .post('/v2.6/me/messages', body => body.message.attachment.payload.text === script.group_prompt.text)
        .query(true).reply(200)

      wrapped.run(receivedData, (err) => {
        graphAPICalls.done();
        done(err)
      });
    });
  });

  context('with a response that persists data', () => {
    const receivedData = fixture('postback');
    receivedData.body.entry[0].messaging[0].postback = { payload: 'group_joined' };

    beforeEach(() => {
      nock('https://graph.facebook.com').persist()
        .post('/v2.6/me/messages').query(true).reply(200);
    })

    context('without an existing user', () => {
      it('stores the actions', (done) => {
        wrapped.run(receivedData, (err) => {
          dynamo.get(payload, (err, res) => {
            expect(res.Item.actions[0]).to.be.equal('group_joined');
            done(err);
          });
        });
      });
    });

    context('with an existing user', () => {
      const member = {
        TableName,
        Item: {fbid, profile: {
          first_name: 'test'
        }}
      };
      beforeEach(done => dynamo.put(member, done));

      it('does not overwrite the user profile', (done) => {
        wrapped.run(receivedData, (err) => {
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
    const receivedData = fixture('postback');
    receivedData.body.entry[0].messaging[0].postback = { payload: 'group_joined' };
    const member = {
      TableName,
      Item: {fbid, actions: ['group_intro'] }
    };
    beforeEach(done => dynamo.put(member, done));

    it("should remove the action from the menu", (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages').query(true).reply(200)
        .post('/v2.6/me/messages').query(true).reply(200)
        .post('/v2.6/me/messages', (body) => {
          return !body.message.attachment.payload.buttons.map(b=>b.payload).includes('group_intro');
        }).query(true).reply(200)
        .post('/v2.6/me/messages').query(true).reply(200)
        .post('/v2.6/me/messages').query(true).reply(200)
        .post('/v2.6/me/messages').query(true).reply(200)

      wrapped.run(receivedData, (err) => {
        wrapped.run(receivedData, (err) => {
          graphAPICalls.done();
          done(err);
        });
      });
    });
  });

  context("with a chosen action path", () => {
    const choosePath = fixture('postback');
    choosePath.body.entry[0].messaging[0].postback = { payload: 'group_intro' };
    const showMenu = fixture('postback');
    showMenu.body.entry[0].messaging[0].postback = { payload: 'default' };

    beforeEach(() => {
      nock('https://graph.facebook.com')
        .post('/v2.6/me/messages').query(true).reply(200) // group_intro
        .post('/v2.6/me/messages').query(true).reply(200) // typing_on
        .post('/v2.6/me/messages').query(true).reply(200) // group_postcode
    });

    it("removes the action from the menu one time only", (done) => {
      const graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return !body.message.attachment.payload.buttons.map(b=>b.payload).includes('group_intro');
        }).query(true).reply(200)
        .post('/v2.6/me/messages', (body) => {
          return body.message.attachment.payload.buttons.map(b=>b.payload).includes('group_intro');
        }).query(true).reply(200)
        // .post('/v2.6/me/messages', body => console.log(JSON.stringify(body))).query(true).reply(200)
        // .post('/v2.6/me/messages').query(true).reply(200)

      wrapped.run(choosePath, (err) => {
        wrapped.run(showMenu, (err) => {
          wrapped.run(showMenu, (err) => {
            graphAPICalls.done();
            done(err);
          });
        });
      });
    });
  });

  context("with an unknown message", () => {
    const receivedData = fixture('message');
    receivedData.body.entry[0].messaging[0].message.text = 'no thanks';
    let graphAPICalls;

    beforeEach(() => {
      graphAPICalls = nock('https://graph.facebook.com')
        .post('/v2.6/me/messages', (body) => {
          return body.message.text === script.fallthrough.text;
        }).query(true).reply(200)
        .post('/v2.6/me/messages', (body) => {
          return body.message.attachment.payload.text === script.signpost.text &&
            body.message.attachment.payload.buttons[0].title === script.signpost.buttons[0].title;
        }).query(true).reply(200)
    });

    it("provides the user with help options", (done) => {
      wrapped.run(receivedData, (err) => {
        graphAPICalls.done();
        done(err)
      });
    });

    it("ignores further messages", (done) => {
      wrapped.run(receivedData, (err) => {
        // nock will raise if this responds
        wrapped.run(receivedData, (err) => {
          graphAPICalls.done();
          done(err)
        });
      });
    });
  });

  context("with ignore_text set", () => {
    const member = {
      TableName,
      Item: {fbid, ignore_text: true}
    };
    beforeEach(done => dynamo.put(member, done));

    context("with a postback payload", () => {
      const postback = fixture('postback');
      postback.body.entry[0].messaging[0].postback = { payload: 'default' };
      const receivedData = fixture('message');
      receivedData.body.entry[0].messaging[0].message.text = 'no thanks';

      it("unsets ignore_text and responds to plain text messages", (done) => {
        const graphAPICalls = nock('https://graph.facebook.com')
          .post('/v2.6/me/messages').query(true).reply(200) // 'default'
          .post('/v2.6/me/messages').query(true).reply(200) // 'fallthrough'
          .post('/v2.6/me/messages', (body) => {
              return body.message.attachment.payload.text === script.signpost.text &&
                body.message.attachment.payload.buttons[0].title === script.signpost.buttons[0].title;
            }).query(true).reply(200) // signpost

        wrapped.run(postback, (err) => {
          wrapped.run(receivedData, (err) => {
            graphAPICalls.done();
            done(err)
          });
        });
      });
    });
  });
});

function fixture(file) {
  return JSON.parse(fs.readFileSync(`${__dirname}/fixtures/${file}.json`, 'utf8'));
}

function assertOnce(assertion, body) {
  return (body) => {
    if(!firstIntercept) {
      firstIntercept = true;
      return assertion(body);
    }
    return true
  }
}
