# GetUp Volunteer ChatBot

## Installing

* run `npm install`
* install dynamodb local: `sls dynamodb install`
* patch `serverless-webpack` with this https://github.com/elastic-coders/serverless-webpack/issues/20 until a new version is released
* ensure you have IAM credentials and create `staging` and `production` profiles in your `~/.aws/credentials` file
* Follow this https://developers.facebook.com/docs/messenger-platform/quickstart and update the constants in `.env.example` and rename to `.env`

## Running locally

In separate terminal windows:

* `ngrok http 8001` (or similar way to forward webhooks to your machine)
* `npm run db`
* `npm start`

## Testing

In separate terminal windows:

* `npm run db`
* `npm test`

## Deploying

* deploy to staging with `npm run deploy`
* deploy to production with `npm run deployprod`

## Page "Thread Setup"

To provide help text, Get Started button, and persistent menu in the messenger interface, grab a page token and use the following curl commands:

```
curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"call_to_actions",
  "thread_state":"new_thread",
  "call_to_actions":[
    {
      "payload":"intro"
    }
  ]
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=$PAGE_ACCESS_TOKEN"

curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"greeting",
  "greeting":{
    "text":"Hi {{user_first_name}}!\n\nWelcome to the GetUp Volunteer Action Hub.\n\nPress Get Started to begin. :)"
  }
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=$PAGE_ACCESS_TOKEN"

curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type" : "call_to_actions",
  "thread_state" : "existing_thread",
  "call_to_actions": [{
    "type":"postback",
    "title":"What can I do?",
    "payload":"default"
  },{
    "type":"postback",
    "title":"Manage campaign updates",
    "payload":"subscription_manage"
  }]
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=$PAGE_ACCESS_TOKEN"
```

More info: https://developers.facebook.com/docs/messenger-platform/thread-settings

## Future features

* separate app to do broadcast group messages
