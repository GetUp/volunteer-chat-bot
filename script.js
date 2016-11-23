// hide menu items when actions are taken:
// persisted_value: menu_button_payload
const action_menu = {
  group_joined: 'group_intro',
  group_intro: 'group_intro',
  subscribed: 'subscribe_intro',
  subscribe_intro: 'subscribe_intro',
  petition_signed: 'petition_intro',
  petition_intro: 'petition_intro',
};

const petition = {
  title: 'Close the camps!',
  // item_url: '',
  image_url: 'https://d68ej2dhhub09.cloudfront.net/image_11715_full.jpg',
  subtitle: 'Minister Dutton, please end offshore detention.',
};

const group_action = {
  group_intro: {
    text: "GetUp #SafetyForAll action groups are a great way to stay up to date with campaign developments and get involved in upcoming actions.",
    next: 'group_postcode',
    persist: 'group_intro',
  },
  group_postcode: {
    text: "First off, what's your postcode so we can find the best local action group for you?",
  },
  group_multiple_electorates: {
    template: "Postcode {postcode} covers multiple electorates. Which electorate do you live in?",
  },
  group_view: {
    template: "Ok, the group that covers the {area} area is {group_name}.\n\nUse the button below to view the group page. Then click the 'Join' or 'Join Group' button to join the group",
    buttons: [{type: 'web_url', webview_height_ratio: 'tall', title: 'Show me the group', url: '{group_url}'}],
    next: 'group_prompt',
    delay: 20000,
    disable_typing: true,
  },
  group_prompt: {
    text: "How'd you go?",
    replies: [
      {content_type: 'text', payload: 'group_joined', title: "I requested to join"},
      {content_type: 'text', payload: 'group_no_thanks', title: "Not right now"},
      {content_type: 'text', payload: 'group_error', title: "Something went wrong"},
    ],
  },
  group_joined: {
    text: "Excellent! :D Keep your eye out for Facebook notifications from the group.",
    persist: 'group_joined',
    next: 'default_group',
  },
  group_error: {
    text: "Bummer! :( Somebody will be in touch shortly. Maybe try one of the other ways to get involved?",
    persist: 'group_error',
    next: 'default_group',
  },
  group_no_thanks: {
    text: "No worries, we have other ways you can get involved. :)",
    next: 'default_group',
  },
};

const subscribe_action = {
  subscribe_intro: {
    text: "The GetUp Strategy Team can message you when there are important updates to the campaign and opportunities for you to help out.",
    next: 'subscribe_frequency',
    persist: 'subscribe_intro',
  },
  subscribe_frequency: {
    text: "It's unlikely you'll receive more than two per week.",
    next: 'subscribe_ask',
    delay: 3000,
  },
  subscribe_ask: {
    text: "Would you like us to keep you in the loop?",
    replies: [
      {content_type: 'text', payload: 'subscribe_yes', title: 'Yes please!'},
      {content_type: 'text', payload: 'subscribe_no', title: 'No thanks'}
    ],
  },
  subscribe_yes: {
    text: "Great! We'll be in touch when something important comes up. :D",
    persist: 'subscribed',
    next: 'subscribe_manage',
    delay: 3000,
  },
  subscribe_manage: {
    text: "You can turn campaign updates on or off from the ≡ icon below.",
    next: 'default_subscribe',
  },
  subscribe_no: {
    text: "No problem, there are plenty of ways to stay up to date. :)",
    persist: 'subscribe_no',
    next: 'default_subscribe',
  },
};

// accessed from ≡ menu
const subscription_management = {
  subscription_manage: {
    text: "Would you like campaign update messages on or off?",
    replies: [
      {content_type: 'text', payload: 'subscription_on', title: 'On please'},
      {content_type: 'text', payload: 'subscription_off', title: 'Off thanks'}
    ],
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
    persist: 'petition_intro',
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
    replies: [
      {content_type: 'text', payload: 'petition_details_yes', title: "Yep, that's me"},
      {content_type: 'text', payload: 'petition_details_no', title: "No, that's not right"}
    ],
  },
  petition_details_yes: {
    text: "Excellent! All done. Thank you for signing the petition.",
    persist: 'petition_signed',
    next: 'petition_share_ask',
  },
  petition_share_ask: {
    text: "Would you be willing to share the petition with your friends?",
    replies: [
      {content_type: 'text', payload: 'petition_share_yes', title: 'Yeah sure'},
      {content_type: 'text', payload: 'petition_share_no', title: 'Not right now'}
    ],
  },
  petition_share_yes: {
    generic: [{
      ...petition,
      buttons: [{type: 'element_share'}],
    }],
    next: 'default_petition',
    delay: 20000,
    disable_typing: true
  },
  petition_share_no: {
    text: "Not a problem. Maybe another time. :)",
    next: 'default_petition',
  },
  petition_details_no: {
    text: "Aah, that's no good. To sign, please use our website:",
    buttons: [{title: 'Open petition', type: 'web_url', webview_height_ratio: 'tall', url: 'https://www.getup.org.au/campaigns/refugees/bring-them-here/petition-bring-them-here'}],
    next: 'petition_details_no_prompt',
  },
  petition_details_no_prompt: {
    text: "How'd you go?",
    replies: [
      {content_type: 'text', payload: 'petition_details_yes', title: 'All signed'},
      {content_type: 'text', payload: 'petition_error', title: 'Something went wrong'},
    ],
  },
  petition_error: {
    text: "Bummer! Somebody will be in touch shortly. Maybe try one of the other ways to get involved?",
    persist: 'petition_error',
    next: 'default_petition',
  },
};

const menu = {
  text: "It would be great if you can join the campaign. Here are a few ways you can help make sure we have #SafetyForAll when it comes to our refugee policy in Australia.",
  replies: [
    {content_type: 'text', payload: 'group_intro', title: 'Join an action group'},
    {content_type: 'text', payload: 'subscribe_intro', title: 'Keep me up to date'},
    // {content_type: 'text', payload: 'petition_intro', title: 'Sign the open letter'},
  ],
};

export const script = {
  intro: {
    text: "Hey! Welcome to the GetUp Volunteer Action Hub. The current campaign is to ensure that we can have #SafetyForAll people in offshore detention camps.",
    next: 'default',
    delay: 3000,
  },

  // b/c FB sends us repeated postbacks so we need to ignore them for 25 secs
  default: menu,
  default_group: menu,
  default_subscribe: menu,
  default_petition: menu,
  default_persistent_menu: menu,

  ...group_action,
  ...subscribe_action,
  ...petition_action,

  all_done: {
    text: "That's all we have for now. Thanks for helping to show we can have #SafetyForAll!",
  },

  ...subscription_management,

  unsubscribe: {
    text: "No worries, you won't receive anymore campaign updates from us. :) If you unsubscribed in error or change your mind later, you can resubscribe from the ≡ menu below at any time. Thanks!",
    persist: 'unsubscribed',
  },

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
