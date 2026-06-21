-- CO(X) demo seed — extends inline migration seeds with campaign domain examples.
-- Run after migrations: supabase db reset (local) or apply manually in SQL editor.
-- Does NOT create auth users; safe to run on environments with existing shops.

-- Example campaign domain fields on active campaigns (idempotent style updates)
UPDATE public.campaigns
SET
  slogan = COALESCE(NULLIF(trim(slogan), ''), 'We give EEFFOC!'),
  reward_type = CASE
    WHEN lower(reward_description) LIKE '%matcha%' THEN 'matcha'
    WHEN lower(reward_description) LIKE '%espresso%' THEN 'espresso'
    WHEN lower(reward_description) LIKE '%cappuccino%' THEN 'cappuccino'
    WHEN lower(reward_description) LIKE '%ice%' THEN 'ice_cream'
    ELSE COALESCE(reward_type, 'coffee')
  END,
  reward_quantity = COALESCE(reward_quantity, 1),
  available_quantity = COALESCE(available_quantity, max_participants),
  hashtags = CASE
    WHEN hashtags = '{}'::text[] AND hashtag IS NOT NULL AND trim(hashtag) <> ''
    THEN ARRAY[hashtag]
    ELSE hashtags
  END
WHERE status IN ('active', 'draft');

-- Demo opening hours + social links for approved shops (placeholder structure)
UPDATE public.coffee_shops
SET
  opening_hours = CASE
    WHEN opening_hours = '{}'::jsonb THEN jsonb_build_object(
      'mon', jsonb_build_object('open', '08:00', 'close', '18:00'),
      'tue', jsonb_build_object('open', '08:00', 'close', '18:00'),
      'wed', jsonb_build_object('open', '08:00', 'close', '18:00'),
      'thu', jsonb_build_object('open', '08:00', 'close', '18:00'),
      'fri', jsonb_build_object('open', '08:00', 'close', '20:00'),
      'sat', jsonb_build_object('open', '09:00', 'close', '20:00'),
      'sun', jsonb_build_object('open', '09:00', 'close', '17:00')
    )
    ELSE opening_hours
  END,
  social_links = CASE
    WHEN social_links = '{}'::jsonb THEN jsonb_build_object('instagram', 'https://instagram.com/cofex.demo')
    ELSE social_links
  END
WHERE status = 'approved';

-- Default privacy preferences for explorers without any set
UPDATE public.profiles
SET privacy_preferences = jsonb_build_object(
  'show_on_leaderboard', true,
  'allow_arrival_signals', true,
  'allow_gift_receipt', true,
  'marketing_emails', false
)
WHERE privacy_preferences = '{}'::jsonb OR privacy_preferences IS NULL;
