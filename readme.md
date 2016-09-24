# GetUp Volunteer ChatBot

## Installing

* run `npm install`
* patch `serverless-webpack` with this https://github.com/elastic-coders/serverless-webpack/issues/20 until a new version is released
* ensure you have a IAM user on showcase that is in the `serverless-deployment` group
* Follow this https://developers.facebook.com/docs/messenger-platform/quickstart and update the constants in `bot.js`
* update stage from `bjdev` to something else in `serverless.yml`. Also you might need to update your profile.

# Running

* run locally with `sls webpack serve` or with `SLS_DEBUG=debug sls webpack invoke -f chat -p event.json` (but change the recipient id to be you!)
* deploy with `sls deploy`
