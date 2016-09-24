const mod = require('../bot.js');
const mochaPlugin = require('serverless-mocha-plugin');
const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'bot' });

describe('bot', () => {
  describe('with a text message', () => {
    it('should echo it back', (done) => {
      done();
    });
  });
});
