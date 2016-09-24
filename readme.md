# GetUp Volunteer ChatBot

## Installing

* run `npm install`
* patch `serverless-webpack` with this https://github.com/elastic-coders/serverless-webpack/issues/20 until a new version is released
* ensure you have a IAM user on showcase that is in the `serverless-deployment` group
* Follow this https://developers.facebook.com/docs/messenger-platform/quickstart and update the constants in `bot.js`
* update stage from `bjdev` to something else in `serverless.yml`. Also you might need to update your profile.

## Running

* run locally with `sls webpack serve` or with `SLS_DEBUG=debug sls webpack invoke -f chat -p event.json` (but change the recipient id to be you!)
* deploy with `sls deploy`

## Testing

* `npm test`

## TODO

* validate FB token
* add greeting message?
* gather the email and details of the sender

## Chat

* Hello! I'm the GetUp Volunteer ChatBot (or "robot"). I'm a computer program designed to help you connect with the GetUp community and take action on the #BringThemHere campaign
* What action would you like to take?
  * sign the petition
  * join a group of GetUp members near you
  * purchase a poster
  * learn more about the campaign
  * donate
  * latest news on the campaign
* If you'd like to stay connected with the campaign on FB and learn about upcoming events and opportunities to action, please join our BringThemHere volunteer FB group
* May we contact you in the future if there is an urgent volunteering opportunity?

## Future features

* remember which options have been completed
* separate app to do broadcast group messages
