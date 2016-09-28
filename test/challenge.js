const mod = require('../bot.js');
const messenger = require('../messenger.js');
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'challenge' });

describe('challenge', () => {
  context('with a valid challenge token', () => {
    const query = {'hub.mode': 'subscribe', 'hub.verify_token': messenger.VALIDATION_TOKEN};
    it('should succeed', done => wrapped.run({query: query}, done));
  });

  context('with an invalid challenge token', () => {
    const query = {'hub.mode': 'subscribe', 'hub.verify_token': 'DO NOT validate me'};
    it('should fail', (done) => {
      wrapped.run({query: query}, (err) => {
        expect(err).to.equal('Validation failed');
        done();
      });
    });
  });
});
