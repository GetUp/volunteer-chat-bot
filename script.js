// hide menu items when actions are taken:
// persisted_value: menu_button_payload
const action_menu = {
  group_joined: 'group_intro',
  subscribed: 'subscribe_intro',
  petition_signed: 'petition_intro',
};

const petition = {
  title: 'Close the camps!',
  // item_url: '',
  image_url: 'https://d68ej2dhhub09.cloudfront.net/image_11715_full.jpg',
  subtitle: 'Minister Dutton, please end offshore detention.',
};

const group_action = {
  group_intro: {
    text: "GetUp #WeCanDoBetter action groups are a great way to stay up to date with campaign developments and get involved in upcoming actions.",
    next: 'group_postcode',
  },
  group_postcode: {
    text: "First off, what's your postcode so we can find the best local action group for you?",
  },
  group_view: {
    template: "Ok, the group that covers postcode {postcode} is {group_name}. Please join it now. :)",
    buttons: [{type: 'web_url', webview_height_ratio: 'tall', title: 'Join action group', url: '{group_url}'}],
    next: 'group_prompt',
    delay: 20000,
    disable_typing: true,
  },
  group_prompt: {
    text: "How'd you go?",
    buttons: [
      {type: 'postback', payload: 'group_joined', title: "I joined the group"},
      {type: 'postback', payload: 'group_error', title: "Something went wrong"},
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
};

const subscribe_action = {
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
};

// accessed from ≡ menu
const subscription_management = {
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
};

const petition_action = {
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
    persist: 'petition_signed',
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
};

export const script = {
  intro: {
    text: "Hey! Welcome to the GetUp Volunteer Action Hub. The current campaign is to end the government's policy of offshore detention camps. We know that #WeCanDoBetter and bring the men, women and children on Manus Island and Nauru to safety in Australia.",
    next: 'default',
    delay: 3000,
  },
  default: {
    text: "It would be great if you can join the campaign. Here are a few ways you can help make sure #WeCanDoBetter when it comes to our refugee policy in Australia.",
    buttons: [
      {type: 'postback', payload: 'group_intro', title: 'Join an action group'},
      {type: 'postback', payload: 'subscribe_intro', title: 'Keep me up to date'},
      // {type: 'postback', payload: 'petition_intro', title: 'Sign the open letter'},
    ],
  },

  ...group_action,
  ...subscribe_action,
  ...petition_action,

  all_done: {
    text: "That's all we have for now. Thanks for helping to show #WeCanDoBetter!",
  },

  ...subscription_management,

  unknown_payload: {
    text: "Sorry, we didn't quite understand that message.",
    next: 'signpost',
    delay: 1000,
    disable_typing: true,
  },

  fallthrough: {
    text: "Sorry, we didn't quite understand that message.",
    next: 'signpost',
    delay: 1000,
    disable_typing: true,
  },

  signpost: {
    text: "If you'd like to keep chatting with the bot choose 'Continue'.  If you need help from a member of the GetUp Strategy Team, choose 'Help'.",
    buttons: [
      {type: 'postback', payload: 'default', title: 'Continue'},
      {type: 'postback', payload: 'human_help', title: 'Help!'},
    ],
  },
  human_help: {
    text: "Ok, we've notified the GetUp Strategy Team. Someone will be in touch shortly, but there could be a delay.",
  },

  action_menu,
};
