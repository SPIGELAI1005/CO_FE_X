export type EeffocTemplate = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  reward_description: string;
  points_reward: number;
  requirements: string;
  hashtag: string;
  durationDays: number;
  max_participants: number | null;
  fulfillment_mode: "check_in" | "social_proof" | "hybrid";
  social_requirements?: {
    platforms?: string[];
    caption_template?: string;
    media_hints?: string;
  };
};

export const EEFFOC_TEMPLATES: EeffocTemplate[] = [
  {
    id: "free_espresso_friday",
    title: "Free Espresso Friday",
    emoji: "☕️",
    description: "A complimentary espresso every Friday, because the week deserves an ending.",
    reward_description: "1 free single espresso",
    points_reward: 15,
    requirements: "Check in on a Friday between open and close.",
    hashtag: "#FreeEspressoFriday",
    durationDays: 28,
    max_participants: 100,
    fulfillment_mode: "check_in",
  },
  {
    id: "matcha_monday",
    title: "Matcha Monday",
    emoji: "🍵",
    description: "Start the week green. Matcha lattes at a sweet price every Monday.",
    reward_description: "50% off any matcha drink",
    points_reward: 10,
    requirements: "Show this campaign at the counter on Monday.",
    hashtag: "#MatchaMonday",
    durationDays: 30,
    max_participants: 80,
    fulfillment_mode: "check_in",
  },
  {
    id: "student_week",
    title: "Student Coffee Week",
    emoji: "🎓",
    description: "One week, students drink for less. Bring your ID, bring your study buddies.",
    reward_description: "30% off all drinks for students",
    points_reward: 20,
    requirements: "Valid student ID required at check-in.",
    hashtag: "#StudentCoffeeWeek",
    durationDays: 7,
    max_participants: 200,
    fulfillment_mode: "check_in",
  },
  {
    id: "bogo",
    title: "Buy One Get One",
    emoji: "🎁",
    description: "Bring a friend (or treat yourself twice). Two drinks, one price.",
    reward_description: "Buy any coffee, get the second free",
    points_reward: 15,
    requirements: "Both drinks ordered together. Equal or lesser value free.",
    hashtag: "#EEFFOCBogo",
    durationDays: 14,
    max_participants: 150,
    fulfillment_mode: "check_in",
  },
  {
    id: "free_with_pastry",
    title: "Free Coffee With Pastry",
    emoji: "🥐",
    description: "Pair anything from the bakery with a free filter or americano.",
    reward_description: "Free filter or americano with any pastry",
    points_reward: 10,
    requirements: "Purchase any in-house pastry.",
    hashtag: "#PastryAndCoffee",
    durationDays: 21,
    max_participants: 120,
    fulfillment_mode: "check_in",
  },
  {
    id: "social_story",
    title: "Social Media Story Reward",
    emoji: "📸",
    description: "Tag us in your story. We'll tag you with a free drink on your next visit.",
    reward_description: "Free drink on next visit",
    points_reward: 25,
    requirements: "Post a story tagging the café and use the campaign hashtag.",
    hashtag: "#WeGiveEEFFOC",
    durationDays: 30,
    max_participants: 250,
    fulfillment_mode: "social_proof",
    social_requirements: {
      platforms: ["instagram_story", "instagram_post", "tiktok", "facebook_post"],
      caption_template: "Coffee moment at {shop_name}! {hashtag}",
      media_hints: "Film your drink, the vibe, or your first sip.",
    },
  },
  {
    id: "custom",
    title: "Custom Campaign",
    emoji: "✨",
    description: "Design your own EEFFOC moment from scratch.",
    reward_description: "",
    points_reward: 10,
    requirements: "",
    hashtag: "#WeGiveEEFFOC",
    durationDays: 14,
    max_participants: 100,
    fulfillment_mode: "check_in",
  },
];
