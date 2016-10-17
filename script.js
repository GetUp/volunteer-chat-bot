const petition = {
  title: 'Close the camps!',
  // item_url: '',
  image_url: 'https://d68ej2dhhub09.cloudfront.net/image_11715_full.jpg',
  subtitle: 'Minister Dutton, please end offshore detention.',
};

export const script = {
  intro: {
    text: "Welcome to the GetUp Volunteer Action Hub. The current campaign is to end Australia's offshore detention regime and bring the remaining refugees to Australia.",
    next: 'default',
  },
  default: {
    text: "Here are some ways you can help close the camps and #BringThemHere:",
    buttons: [
      {type: 'postback', payload: 'subscribe_intro', title: 'Subscribe to updates'},
      {type: 'postback', payload: 'petition_intro', title: 'Sign the petition'},
      {type: 'postback', payload: 'group_intro', title: 'Join the group'},
    ],
  },

  group_intro: {
    text: 'The GetUp Volunteer group is a great way to share ideas with other GetUp members about how we can help to end offshore detention.',
    next: 'group_view',
  },
  group_view: {
    text: "Join the group by pressing the button below and pressing on the usual join button in the window that opens. Press Close when you're finished.",
    buttons: [{type: 'web_url', title: 'Join vollie group', url: 'https://www.facebook.com/groups/517488501775144/', webview_height_ratio: 'tall'}],
    next: 'group_prompt',
    delay: 20000,
    disable_typing: true
  },
  group_prompt: {
    text: "How'd you go?",
    buttons: [
      {type: 'postback', payload: 'group_joined', title: 'I joined the group'},
      {type: 'postback', payload: 'group_error', title: 'Something went wrong'},
      {type: 'postback', payload: 'group_no_thanks', title: "Not right now"},
    ],
  },
  group_joined: {
    text: "Excellent! Keep your eye out for Facebook notifications from the group.",
    persist: 'group_joined',
    next: 'default',
  },
  group_error: {
    text: "Bummer! Somebody will be in touch shortly. Maybe try one of the other ways to get involved?",
    persist: 'group_error',
    next: 'default',
  },
  group_no_thanks: {
    text: "No worries, we have other ways you can get involved. :)",
    next: 'default',
  },

  subscribe_intro: {
    text: "The GetUp Strategy Team can message you when there are important updates to the campaign and opportunities for you to help out.",
    next: 'subscribe_frequency',
  },
  subscribe_frequency: {
    text: "It's unlikely you'll receive more than two per week.",
    next: 'subscribe_ask',
    delay: 3000,
  },
  subscribe_ask: {
    text: "Would you like us to keep you in the loop?",
    replies: [{k: 'subscribe_yes', t: 'Yes please!'}, {k: 'subscribe_no', t: 'No thanks'}],
  },
  subscribe_yes: {
    text: "Great! We'll be in touch when something important comes up.",
    persist: 'subscribed',
    next: 'subscribe_manage',
    delay: 3000,
  },
  subscribe_manage: {
    text: "You can manage when we contact you from the ≡ icon below.",
    next: 'default',
  },
  subscribe_no: {
    text: "No problem, there are plenty of ways to stay up to date. :)",
    persist: 'subscribe_no',
    next: 'default',
  },
  subscribe_examples: [
// TODO images? maybe a third?
    {
      text: "Papua New Guinea's Hight Court has just ruled the Manus island camp illegal. Share this great news with your friends.",
      buttons: [{type: 'element_share', title: 'Share', url: 'https://www.theguardian.com/australia-news/2016/apr/26/papua-new-guinea-court-rules-detention-asylum-seekers-manus-unconstitutional'}],
    },
    {
      text: "There's a rally to support refugees tomorrow at Town Hall. It'll be at 6:30pm - can you join everyone?",
      buttons: [{type: 'element_share', title: 'Share', url: 'http://www.refugeeaction.org.au/?p=5230'}],
    },
  ],

  petition_intro: {
    text: "We'll be delivering our petition to the immigration minister at the start of next month. Make sure your name is on it!",
    next: 'petition_show',
  },
  petition_show: {
    generic: [{
      ...petition,
      buttons: [
        {title: 'Sign now', type: 'postback', payload: 'petition_postcode'},
        {title: 'Read more', type: 'web_url', webview_height_ratio: 'tall', url: 'https://www.getup.org.au/campaigns/refugees/bring-them-here/petition-bring-them-here'},
      ],
    }],
  },
  petition_postcode: {
    text: "Thanks for agreeing to sign! What's your postcode?",
  },
  petition_details: {
    template: "Great! Your signature will be recorded as {first_name} {last_name}, {postcode}. Is that correct?",
    replies: [{k: 'petition_details_yes', t: "Yep, that's me"}, {k: 'petition_details_no', t: "No, that's not right"}],
  },
  petition_details_yes: {
    text: "Excellent! All done. Thank you for signing the petition.",
    next: 'petition_share_ask',
  },
  petition_share_ask: {
    text: "Would you be willing to share the petition with your friends?",
    replies: [{k: 'petition_share_yes', t: 'Yeah sure'}, {k: 'petition_share_no', t: 'Not right now'}],
  },
  petition_share_yes: {
    generic: [{
      ...petition,
      buttons: [{type: 'element_share'}],
    }],
    next: 'default',
    delay: 20000,
    disable_typing: true
  },
  petition_share_no: {
    text: "Not a problem. Maybe another time. :)",
    next: 'default',
  },
  petition_details_no: {
    text: "Aah, that's no good. To sign, please use our website:",
    buttons: [{title: 'Open petition', type: 'web_url', webview_height_ratio: 'tall', url: 'https://www.getup.org.au/campaigns/refugees/bring-them-here/petition-bring-them-here'}],
    next: 'petition_details_no_prompt',
  },
  petition_details_no_prompt: {
    text: "How'd you go?",
    buttons: [
      {type: 'postback', payload: 'petition_details_yes', title: 'All signed'},
      {type: 'postback', payload: 'petition_error', title: 'Something went wrong'},
    ],
  },
  petition_error: {
    text: "Bummer! Somebody will be in touch shortly. Maybe try one of the other ways to get involved?",
    persist: 'petition_error',
    next: 'default',
  },

  all_done: {
    text: "Awesome! That's all we have for now. Thanks for helping to end offshore detention.",
  },

  subscription_manage: {
    text: "Would you like campaign update messages on or off?",
    replies: [{k: 'subscription_on', t: 'On please'}, {k: 'subscription_off', t: 'Off thanks'}],
  },
  subscription_on: {
    text: "Awesome! We'll be in touch when there's an update. :)",
    persist: 'subscribed',
  },
  subscription_off: {
    text: "No worries. You won't receive any more campaign updates from us. :)",
    persist: 'unsubscribed',
  },

  unknown_payload: {
    text: "Sorry, we didn't quite understand that message.",
    next: 'default',
  },

  fallthrough: {
    text: "somehow, that message passed through the gatekeepers",
    next: 'default',
  }
};
