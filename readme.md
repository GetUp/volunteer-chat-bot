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

## Page "Thread Setup"

To provide help text and a Get Started button in the messenger interface, grab a page token and use the following curl commands:

```
curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"call_to_actions",
  "thread_state":"new_thread",
  "call_to_actions":[
    {
      "payload":"GET_STARTED"
    }
  ]
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN"
```

```
curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"greeting",
  "greeting":{
    "text":"Hi {{user_first_name}}!\n\nDo not worry, I am a friendly bot.  I like humans and would never destroy them all.  To talk to me, please hit the\n•Get Started button•\nway down there. ☟\n\nThanks puny human!"
  }
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN"
```

More info: https://developers.facebook.com/docs/messenger-platform/thread-settings

## TODO

* switch to environment variables of some kind
* validate FB token
* gather the email and details of the sender

## Chat

* Hello! I'm the GetUp Volunteer ChatBot (or "robot"). I'm a computer program designed to help you connect with the GetUp community and take action on the #BringThemHere campaign
* What action would you like to take?
  * sign the petition
  * join a group of GetUp members near you
    * Could i please get your postcode?
    * It doesn't look like there is a group near you! Would you be interested in starting a group or would you like to be notified when one forms?
      * "Start a group"
        * ok create a facebook group following these instructions
      * "notify me"
        * join group
    * could i please get your phonenumber to g
      
  * purchase a poster
  * learn more about the campaign
  * donate
  * latest news on the campaign
* If you'd like to stay connected with the campaign on FB and learn about upcoming events and opportunities to action, please join our BringThemHere volunteer FB group
* May we contact you in the future if there is an urgent volunteering opportunity?

## MVP interaction

Hello! I'm the GetUp Volunteer ChatBot (or "robot"). I'm a computer program designed to help you connect with the GetUp community and take action on the #BringThemHere campaign.
Have you joined our #BringThemHere volunteer group yet?
Yes No
  No => Ok here is the link, please come back and chat to me when you're done
Yes
Ok, next step, could we please get in your phone number in case there's an urgent action?

No worries/thanks
Would you like to join a local groups of GetUp members in your area?
Ok, could I please have your postcode


First up, we'd love you to join our #BringThemHere volunteer group. You'll get to meet other passionate GetUp members particpiating in the campaign. It's also the way we'll keep you updated on upcoming actions. So please join the group now. After you're done, 
[Take Me There]




Let's start by seeing if there's already a local group near you. Could we please get your postcode?
Thanks! It doesn't seem like there are any groups near you yet. Would you like to start one?
No worries would you like us to notify you when one gets started near you?
In that case, could we please have your phone number just in case we need to contact you?
Thanks! The most important thing we need is for you to 


## Future features

* remember which options have been completed
* separate app to do broadcast group messages
