
-- =========================================================================
-- 1. GEOGRAPHY
-- =========================================================================

CREATE TABLE public.countries (
  code text PRIMARY KEY,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  locale text NOT NULL DEFAULT 'en',
  default_timezone text NOT NULL DEFAULT 'Europe/Berlin',
  vat_rate numeric(5,2) NOT NULL DEFAULT 0,
  flag_emoji text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO authenticated, anon;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries readable" ON public.countries FOR SELECT USING (true);

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, slug)
);
GRANT SELECT ON public.regions TO authenticated, anon;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions readable" ON public.regions FOR SELECT USING (true);

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  lat numeric(9,6),
  lng numeric(9,6),
  timezone text,
  population int,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, slug)
);
CREATE INDEX cities_country_idx ON public.cities (country_code) WHERE active;
CREATE INDEX cities_featured_idx ON public.cities (featured) WHERE featured AND active;
GRANT SELECT ON public.cities TO authenticated, anon;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities readable" ON public.cities FOR SELECT USING (true);

INSERT INTO public.countries (code, name, currency, locale, default_timezone, vat_rate, flag_emoji) VALUES
('AT','Austria','EUR','de-AT','Europe/Vienna',20.00,'🇦🇹'),
('BE','Belgium','EUR','nl-BE','Europe/Brussels',21.00,'🇧🇪'),
('BG','Bulgaria','BGN','bg-BG','Europe/Sofia',20.00,'🇧🇬'),
('CH','Switzerland','CHF','de-CH','Europe/Zurich',8.10,'🇨🇭'),
('CZ','Czechia','CZK','cs-CZ','Europe/Prague',21.00,'🇨🇿'),
('DE','Germany','EUR','de-DE','Europe/Berlin',19.00,'🇩🇪'),
('DK','Denmark','DKK','da-DK','Europe/Copenhagen',25.00,'🇩🇰'),
('EE','Estonia','EUR','et-EE','Europe/Tallinn',22.00,'🇪🇪'),
('ES','Spain','EUR','es-ES','Europe/Madrid',21.00,'🇪🇸'),
('FI','Finland','EUR','fi-FI','Europe/Helsinki',25.50,'🇫🇮'),
('FR','France','EUR','fr-FR','Europe/Paris',20.00,'🇫🇷'),
('GB','United Kingdom','GBP','en-GB','Europe/London',20.00,'🇬🇧'),
('GR','Greece','EUR','el-GR','Europe/Athens',24.00,'🇬🇷'),
('HR','Croatia','EUR','hr-HR','Europe/Zagreb',25.00,'🇭🇷'),
('HU','Hungary','HUF','hu-HU','Europe/Budapest',27.00,'🇭🇺'),
('IE','Ireland','EUR','en-IE','Europe/Dublin',23.00,'🇮🇪'),
('IS','Iceland','ISK','is-IS','Atlantic/Reykjavik',24.00,'🇮🇸'),
('IT','Italy','EUR','it-IT','Europe/Rome',22.00,'🇮🇹'),
('LT','Lithuania','EUR','lt-LT','Europe/Vilnius',21.00,'🇱🇹'),
('LU','Luxembourg','EUR','fr-LU','Europe/Luxembourg',17.00,'🇱🇺'),
('LV','Latvia','EUR','lv-LV','Europe/Riga',21.00,'🇱🇻'),
('NL','Netherlands','EUR','nl-NL','Europe/Amsterdam',21.00,'🇳🇱'),
('NO','Norway','NOK','nb-NO','Europe/Oslo',25.00,'🇳🇴'),
('PL','Poland','PLN','pl-PL','Europe/Warsaw',23.00,'🇵🇱'),
('PT','Portugal','EUR','pt-PT','Europe/Lisbon',23.00,'🇵🇹'),
('RO','Romania','RON','ro-RO','Europe/Bucharest',19.00,'🇷🇴'),
('SE','Sweden','SEK','sv-SE','Europe/Stockholm',25.00,'🇸🇪'),
('SI','Slovenia','EUR','sl-SI','Europe/Ljubljana',22.00,'🇸🇮'),
('SK','Slovakia','EUR','sk-SK','Europe/Bratislava',23.00,'🇸🇰'),
('TR','Turkey','TRY','tr-TR','Europe/Istanbul',20.00,'🇹🇷');

INSERT INTO public.cities (country_code, name, slug, lat, lng, timezone, population, featured) VALUES
('DE','Berlin','berlin',52.520008,13.404954,'Europe/Berlin',3669491,true),
('DE','Munich','munich',48.137154,11.576124,'Europe/Berlin',1488202,true),
('DE','Hamburg','hamburg',53.551086,9.993682,'Europe/Berlin',1899160,true),
('DE','Cologne','cologne',50.937531,6.960279,'Europe/Berlin',1085664,true),
('DE','Frankfurt','frankfurt',50.110924,8.682127,'Europe/Berlin',753056,true),
('DE','Stuttgart','stuttgart',48.775845,9.182932,'Europe/Berlin',634830,false),
('DE','Düsseldorf','dusseldorf',51.227741,6.773456,'Europe/Berlin',619294,false),
('DE','Leipzig','leipzig',51.339695,12.373075,'Europe/Berlin',597493,false),
('FR','Paris','paris',48.856613,2.352222,'Europe/Paris',2161000,true),
('FR','Lyon','lyon',45.764043,4.835659,'Europe/Paris',513275,true),
('FR','Marseille','marseille',43.296482,5.369780,'Europe/Paris',861635,true),
('FR','Bordeaux','bordeaux',44.837789,-0.579180,'Europe/Paris',254436,true),
('FR','Toulouse','toulouse',43.604652,1.444209,'Europe/Paris',479553,false),
('FR','Nice','nice',43.710173,7.261953,'Europe/Paris',342669,false),
('FR','Nantes','nantes',47.218371,-1.553621,'Europe/Paris',309346,false),
('IT','Rome','rome',41.902782,12.496366,'Europe/Rome',2872800,true),
('IT','Milan','milan',45.464204,9.189982,'Europe/Rome',1378689,true),
('IT','Florence','florence',43.769562,11.255814,'Europe/Rome',382258,true),
('IT','Naples','naples',40.851799,14.268124,'Europe/Rome',967069,false),
('IT','Turin','turin',45.070312,7.686856,'Europe/Rome',870952,false),
('IT','Bologna','bologna',44.494887,11.342616,'Europe/Rome',388367,false),
('IT','Venice','venice',45.440845,12.315515,'Europe/Rome',261905,true),
('ES','Madrid','madrid',40.416775,-3.703790,'Europe/Madrid',3223334,true),
('ES','Barcelona','barcelona',41.385063,2.173404,'Europe/Madrid',1620343,true),
('ES','Valencia','valencia',39.469907,-0.376288,'Europe/Madrid',791413,true),
('ES','Seville','seville',37.388630,-5.982328,'Europe/Madrid',688711,false),
('ES','Bilbao','bilbao',43.262985,-2.935013,'Europe/Madrid',345821,false),
('ES','Málaga','malaga',36.721274,-4.421399,'Europe/Madrid',574654,false),
('GB','London','london',51.507351,-0.127758,'Europe/London',8961989,true),
('GB','Manchester','manchester',53.480759,-2.242631,'Europe/London',553230,true),
('GB','Edinburgh','edinburgh',55.953251,-3.188267,'Europe/London',482005,true),
('GB','Birmingham','birmingham',52.486244,-1.890401,'Europe/London',1141816,false),
('GB','Bristol','bristol',51.454514,-2.587910,'Europe/London',463400,false),
('GB','Glasgow','glasgow',55.860916,-4.251433,'Europe/London',626410,false),
('GB','Liverpool','liverpool',53.408371,-2.991573,'Europe/London',498042,false),
('NL','Amsterdam','amsterdam',52.367573,4.904139,'Europe/Amsterdam',872680,true),
('NL','Rotterdam','rotterdam',51.924420,4.477733,'Europe/Amsterdam',651446,true),
('NL','The Hague','the-hague',52.070498,4.300700,'Europe/Amsterdam',545838,false),
('NL','Utrecht','utrecht',52.090737,5.121420,'Europe/Amsterdam',361924,false),
('NL','Eindhoven','eindhoven',51.441642,5.469722,'Europe/Amsterdam',235691,false),
('BE','Brussels','brussels',50.850346,4.351721,'Europe/Brussels',1208542,true),
('BE','Antwerp','antwerp',51.219448,4.402464,'Europe/Brussels',529247,true),
('BE','Ghent','ghent',51.054342,3.717424,'Europe/Brussels',263927,false),
('BE','Bruges','bruges',51.209348,3.224700,'Europe/Brussels',118509,true),
('AT','Vienna','vienna',48.208174,16.373819,'Europe/Vienna',1911191,true),
('AT','Salzburg','salzburg',47.809490,13.055010,'Europe/Vienna',155021,true),
('AT','Innsbruck','innsbruck',47.269212,11.404102,'Europe/Vienna',132493,false),
('AT','Graz','graz',47.070713,15.439504,'Europe/Vienna',289440,false),
('CH','Zurich','zurich',47.376888,8.541694,'Europe/Zurich',402762,true),
('CH','Geneva','geneva',46.204391,6.143158,'Europe/Zurich',201818,true),
('CH','Basel','basel',47.559599,7.588576,'Europe/Zurich',177595,false),
('CH','Bern','bern',46.947975,7.447447,'Europe/Zurich',133883,false),
('CH','Lausanne','lausanne',46.519962,6.633597,'Europe/Zurich',139111,false),
('PT','Lisbon','lisbon',38.722252,-9.139337,'Europe/Lisbon',505526,true),
('PT','Porto','porto',41.157944,-8.629105,'Europe/Lisbon',237591,true),
('PT','Coimbra','coimbra',40.203313,-8.410257,'Europe/Lisbon',143396,false),
('PT','Faro','faro',37.019356,-7.930440,'Europe/Lisbon',64560,false),
('IE','Dublin','dublin',53.349805,-6.260310,'Europe/Dublin',1173179,true),
('IE','Cork','cork',51.898514,-8.475603,'Europe/Dublin',208669,false),
('IE','Galway','galway',53.270668,-9.056791,'Europe/Dublin',79934,false),
('DK','Copenhagen','copenhagen',55.676098,12.568337,'Europe/Copenhagen',794128,true),
('DK','Aarhus','aarhus',56.162939,10.203921,'Europe/Copenhagen',285273,false),
('DK','Odense','odense',55.403756,10.402370,'Europe/Copenhagen',180863,false),
('SE','Stockholm','stockholm',59.329323,18.068581,'Europe/Stockholm',975551,true),
('SE','Gothenburg','gothenburg',57.708870,11.974560,'Europe/Stockholm',583056,true),
('SE','Malmö','malmo',55.604981,13.003822,'Europe/Stockholm',347949,false),
('SE','Uppsala','uppsala',59.858562,17.638927,'Europe/Stockholm',233839,false),
('NO','Oslo','oslo',59.913868,10.752245,'Europe/Oslo',697549,true),
('NO','Bergen','bergen',60.391262,5.322054,'Europe/Oslo',285911,true),
('NO','Trondheim','trondheim',63.430515,10.395053,'Europe/Oslo',205163,false),
('NO','Stavanger','stavanger',58.969976,5.733107,'Europe/Oslo',143574,false),
('FI','Helsinki','helsinki',60.169856,24.938379,'Europe/Helsinki',658864,true),
('FI','Tampere','tampere',61.498016,23.760300,'Europe/Helsinki',244223,false),
('FI','Turku','turku',60.451810,22.266630,'Europe/Helsinki',194391,false),
('IS','Reykjavik','reykjavik',64.146582,-21.942366,'Atlantic/Reykjavik',131136,true),
('PL','Warsaw','warsaw',52.229675,21.012230,'Europe/Warsaw',1790658,true),
('PL','Krakow','krakow',50.064651,19.944981,'Europe/Warsaw',779115,true),
('PL','Gdansk','gdansk',54.352026,18.646639,'Europe/Warsaw',470907,true),
('PL','Wroclaw','wroclaw',51.107883,17.038538,'Europe/Warsaw',641928,false),
('PL','Poznan','poznan',52.406376,16.925167,'Europe/Warsaw',534813,false),
('PL','Lodz','lodz',51.759445,19.457217,'Europe/Warsaw',677286,false),
('CZ','Prague','prague',50.075539,14.437800,'Europe/Prague',1308632,true),
('CZ','Brno','brno',49.195061,16.606836,'Europe/Prague',379527,false),
('CZ','Ostrava','ostrava',49.820923,18.262524,'Europe/Prague',287968,false),
('HU','Budapest','budapest',47.497913,19.040236,'Europe/Budapest',1752286,true),
('HU','Debrecen','debrecen',47.532852,21.639286,'Europe/Budapest',201981,false),
('HU','Szeged','szeged',46.253013,20.148283,'Europe/Budapest',160766,false),
('GR','Athens','athens',37.983810,23.727539,'Europe/Athens',664046,true),
('GR','Thessaloniki','thessaloniki',40.640063,22.944419,'Europe/Athens',315196,true),
('GR','Patras','patras',38.246639,21.734573,'Europe/Athens',213984,false),
('HR','Zagreb','zagreb',45.815010,15.981919,'Europe/Zagreb',790017,true),
('HR','Split','split',43.508133,16.440193,'Europe/Zagreb',178102,true),
('HR','Dubrovnik','dubrovnik',42.650661,18.094423,'Europe/Zagreb',41562,true),
('RO','Bucharest','bucharest',44.426767,26.102538,'Europe/Bucharest',1883425,true),
('RO','Cluj-Napoca','cluj-napoca',46.770439,23.591423,'Europe/Bucharest',324576,false),
('RO','Timisoara','timisoara',45.760696,21.226788,'Europe/Bucharest',319279,false),
('BG','Sofia','sofia',42.697708,23.321868,'Europe/Sofia',1241675,true),
('BG','Plovdiv','plovdiv',42.135408,24.745281,'Europe/Sofia',346893,false),
('BG','Varna','varna',43.214050,27.914733,'Europe/Sofia',335177,false),
('SK','Bratislava','bratislava',48.148598,17.107748,'Europe/Bratislava',437725,true),
('SK','Kosice','kosice',48.716385,21.261074,'Europe/Bratislava',239095,false),
('SI','Ljubljana','ljubljana',46.056946,14.505752,'Europe/Ljubljana',295504,true),
('SI','Maribor','maribor',46.554649,15.645881,'Europe/Ljubljana',95767,false),
('EE','Tallinn','tallinn',59.436962,24.753574,'Europe/Tallinn',437619,true),
('EE','Tartu','tartu',58.378025,26.728870,'Europe/Tallinn',91407,false),
('LV','Riga','riga',56.949649,24.105186,'Europe/Riga',632614,true),
('LT','Vilnius','vilnius',54.687157,25.279652,'Europe/Vilnius',588412,true),
('LT','Kaunas','kaunas',54.898521,23.903597,'Europe/Vilnius',315933,false),
('LU','Luxembourg City','luxembourg-city',49.611622,6.131935,'Europe/Luxembourg',128512,true),
('TR','Istanbul','istanbul',41.008240,28.978359,'Europe/Istanbul',15462452,true),
('TR','Ankara','ankara',39.933365,32.859741,'Europe/Istanbul',5503985,false),
('TR','Izmir','izmir',38.423733,27.142826,'Europe/Istanbul',2937343,false);

ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS country_code text REFERENCES public.countries(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;

UPDATE public.coffee_shops s SET country_code = c.code
  FROM public.countries c
 WHERE s.country_code IS NULL AND s.country IS NOT NULL
   AND (lower(s.country) = lower(c.name) OR upper(s.country) = c.code);

UPDATE public.coffee_shops s
   SET city_id = ci.id, country_code = COALESCE(s.country_code, ci.country_code)
  FROM public.cities ci
 WHERE s.city_id IS NULL AND s.city IS NOT NULL
   AND lower(s.city) = lower(ci.name)
   AND (s.country_code IS NULL OR s.country_code = ci.country_code);

CREATE INDEX IF NOT EXISTS coffee_shops_country_idx ON public.coffee_shops (country_code);
CREATE INDEX IF NOT EXISTS coffee_shops_city_idx ON public.coffee_shops (city_id);
CREATE INDEX IF NOT EXISTS coffee_shops_status_country_idx ON public.coffee_shops (status, country_code) WHERE status='approved';

-- =========================================================================
-- 2. BILLING
-- =========================================================================

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_eur_cents int NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  max_shops int,
  max_campaigns_per_month int,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_price_id text,
  trial_days int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans readable" ON public.plans FOR SELECT USING (active);

INSERT INTO public.plans (code, name, description, price_eur_cents, interval, max_shops, max_campaigns_per_month, features, trial_days, sort_order) VALUES
('starter','Starter','Get listed and run a single campaign.',0,'month',1,1,
  '{"analytics":"basic","api_read":false,"api_write":false,"social_approval":true,"priority_support":false,"branded_rewards":false}'::jsonb, 0, 1),
('growth','Growth','Multi-shop with full analytics and API read access.',2900,'month',3,10,
  '{"analytics":"full","api_read":true,"api_write":false,"social_approval":true,"priority_support":false,"branded_rewards":true,"csv_export":true}'::jsonb, 14, 2),
('pro','Pro','Unlimited campaigns, full API, dedicated support.',9900,'month',25,NULL,
  '{"analytics":"full","api_read":true,"api_write":true,"social_approval":true,"priority_support":true,"branded_rewards":true,"csv_export":true,"webhooks":true,"franchise":true}'::jsonb, 14, 3);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_partner_idx ON public.subscriptions (partner_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions (status);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner reads own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id text UNIQUE,
  amount_eur_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL,
  hosted_invoice_url text,
  pdf_url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_invoices_partner_idx ON public.billing_invoices (partner_id, issued_at DESC);
GRANT SELECT ON public.billing_invoices TO authenticated;
GRANT ALL ON public.billing_invoices TO service_role;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner reads own invoices" ON public.billing_invoices
  FOR SELECT TO authenticated USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- 3. API KEYS + REQUEST LOG
-- =========================================================================

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read'],
  rate_limit_per_minute int NOT NULL DEFAULT 60,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_partner_idx ON public.api_keys (partner_id) WHERE revoked_at IS NULL;
GRANT SELECT (id, partner_id, name, key_prefix, scopes, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at)
  ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner reads own api keys" ON public.api_keys
  FOR SELECT TO authenticated USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.api_request_log (
  id bigserial PRIMARY KEY,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  partner_id uuid,
  method text NOT NULL,
  path text NOT NULL,
  status int NOT NULL,
  response_ms int,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_request_log_key_time_idx ON public.api_request_log (api_key_id, created_at DESC);
CREATE INDEX api_request_log_time_brin ON public.api_request_log USING brin (created_at);
GRANT SELECT ON public.api_request_log TO authenticated;
GRANT ALL ON public.api_request_log TO service_role;
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner reads own api logs" ON public.api_request_log
  FOR SELECT TO authenticated USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- 4. PARTNER REFERRALS
-- =========================================================================

CREATE TABLE public.partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','paid','expired')),
  reward_eur_cents int NOT NULL DEFAULT 5000,
  qualified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_partner_id)
);
CREATE INDEX partner_referrals_referrer_idx ON public.partner_referrals (referrer_partner_id);
GRANT SELECT ON public.partner_referrals TO authenticated;
GRANT ALL ON public.partner_referrals TO service_role;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner reads own referrals" ON public.partner_referrals
  FOR SELECT TO authenticated USING (
    referrer_partner_id = auth.uid() OR referred_partner_id = auth.uid() OR public.has_role(auth.uid(),'admin')
  );

-- =========================================================================
-- 5. ANALYTICS ROLLUPS
-- =========================================================================

CREATE TABLE public.shop_daily_stats (
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  day date NOT NULL,
  check_ins int NOT NULL DEFAULT 0,
  unique_users int NOT NULL DEFAULT 0,
  reviews int NOT NULL DEFAULT 0,
  avg_rating numeric(3,2),
  redemptions int NOT NULL DEFAULT 0,
  social_submissions int NOT NULL DEFAULT 0,
  social_reach int NOT NULL DEFAULT 0,
  PRIMARY KEY (shop_id, day)
);
CREATE INDEX shop_daily_stats_day_brin ON public.shop_daily_stats USING brin (day);
GRANT SELECT ON public.shop_daily_stats TO authenticated;
GRANT ALL ON public.shop_daily_stats TO service_role;
ALTER TABLE public.shop_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner reads stats for owned shops" ON public.shop_daily_stats
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.partner_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

CREATE TABLE public.partner_daily_stats (
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  check_ins int NOT NULL DEFAULT 0,
  new_customers int NOT NULL DEFAULT 0,
  redemptions int NOT NULL DEFAULT 0,
  reviews int NOT NULL DEFAULT 0,
  social_reach int NOT NULL DEFAULT 0,
  revenue_eur_cents int NOT NULL DEFAULT 0,
  api_calls int NOT NULL DEFAULT 0,
  PRIMARY KEY (partner_id, day)
);
CREATE INDEX partner_daily_stats_day_brin ON public.partner_daily_stats USING brin (day);
GRANT SELECT ON public.partner_daily_stats TO authenticated;
GRANT ALL ON public.partner_daily_stats TO service_role;
ALTER TABLE public.partner_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner reads own stats" ON public.partner_daily_stats
  FOR SELECT TO authenticated USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.platform_daily_stats (
  day date NOT NULL,
  country_code text REFERENCES public.countries(code) ON DELETE CASCADE,
  new_users int NOT NULL DEFAULT 0,
  new_shops int NOT NULL DEFAULT 0,
  active_users int NOT NULL DEFAULT 0,
  campaigns_created int NOT NULL DEFAULT 0,
  redemptions int NOT NULL DEFAULT 0,
  revenue_eur_cents int NOT NULL DEFAULT 0,
  PRIMARY KEY (day, country_code)
);
CREATE INDEX platform_daily_stats_day_brin ON public.platform_daily_stats USING brin (day);
GRANT SELECT ON public.platform_daily_stats TO authenticated;
GRANT ALL ON public.platform_daily_stats TO service_role;
ALTER TABLE public.platform_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads platform stats" ON public.platform_daily_stats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- 6. ENTITLEMENT + API HELPERS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.has_plan_feature(_partner uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(
    (SELECT (p.features ->> _feature)
       FROM public.subscriptions s
       JOIN public.plans p ON p.id = s.plan_id
      WHERE s.partner_id = _partner
        AND s.status IN ('trialing','active')
      ORDER BY p.sort_order DESC
      LIMIT 1) IN ('true','full','read','write','yes'),
    false
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_plan_feature(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_plan_feature(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.partner_can(_partner uuid, _action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.has_role(_partner,'partner') OR public.has_role(_partner,'admin')) THEN RETURN false; END IF;
  IF _action IN ('manage_shop','create_campaign','approve_submission') THEN RETURN true; END IF;
  IF _action = 'api_read' THEN RETURN public.has_plan_feature(_partner,'api_read'); END IF;
  IF _action = 'api_write' THEN RETURN public.has_plan_feature(_partner,'api_write'); END IF;
  IF _action = 'csv_export' THEN RETURN public.has_plan_feature(_partner,'csv_export'); END IF;
  IF _action = 'franchise' THEN RETURN public.has_plan_feature(_partner,'franchise'); END IF;
  RETURN false;
END $$;
REVOKE EXECUTE ON FUNCTION public.partner_can(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_can(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.issue_api_key(_name text, _scopes text[] DEFAULT ARRAY['read'])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _partner uuid := auth.uid();
  _raw text;
  _prefix text;
  _hash text;
  _id uuid;
  _rpm int := 60;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_partner,'partner') THEN RAISE EXCEPTION 'Only partners can issue API keys'; END IF;
  IF NOT public.has_plan_feature(_partner,'api_read') THEN RAISE EXCEPTION 'Upgrade to Growth or Pro to use the API'; END IF;
  IF 'write' = ANY(_scopes) AND NOT public.has_plan_feature(_partner,'api_write') THEN
    RAISE EXCEPTION 'Pro plan required for write scope';
  END IF;

  _raw := 'cofx_live_' || encode(gen_random_bytes(24), 'hex');
  _prefix := substr(_raw, 1, 16);
  _hash := encode(sha256(_raw::bytea), 'hex');
  IF public.has_plan_feature(_partner,'api_write') THEN _rpm := 600; END IF;

  INSERT INTO public.api_keys(partner_id, name, key_prefix, key_hash, scopes, rate_limit_per_minute)
    VALUES (_partner, _name, _prefix, _hash, _scopes, _rpm)
    RETURNING id INTO _id;

  RETURN jsonb_build_object('id', _id, 'api_key', _raw, 'prefix', _prefix, 'rate_limit_per_minute', _rpm);
END $$;
REVOKE EXECUTE ON FUNCTION public.issue_api_key(text,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_api_key(text,text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.revoke_api_key(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.api_keys SET revoked_at = now()
   WHERE id = _id AND (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.revoke_api_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_api_key(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_api_key(_raw text)
RETURNS TABLE(api_key_id uuid, partner_id uuid, scopes text[], rate_limit_per_minute int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, partner_id, scopes, rate_limit_per_minute
    FROM public.api_keys
   WHERE key_hash = encode(sha256(_raw::bytea),'hex')
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_api_quota(_api_key_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _limit int; _count int;
BEGIN
  SELECT rate_limit_per_minute INTO _limit FROM public.api_keys WHERE id = _api_key_id;
  IF _limit IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason','unknown_key'); END IF;
  SELECT COUNT(*) INTO _count FROM public.api_request_log
   WHERE api_key_id = _api_key_id AND created_at > now() - interval '1 minute';
  IF _count >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason','rate_limited', 'limit', _limit, 'retry_after', 60);
  END IF;
  UPDATE public.api_keys SET last_used_at = now() WHERE id = _api_key_id;
  RETURN jsonb_build_object('allowed', true, 'remaining', _limit - _count - 1);
END $$;
REVOKE EXECUTE ON FUNCTION public.consume_api_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_quota(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_starter_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _starter uuid;
BEGIN
  IF NEW.role = 'partner' THEN
    SELECT id INTO _starter FROM public.plans WHERE code='starter' LIMIT 1;
    IF _starter IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE partner_id = NEW.user_id) THEN
      INSERT INTO public.subscriptions(partner_id, plan_id, status, current_period_start, current_period_end)
        VALUES (NEW.user_id, _starter, 'active', now(), now() + interval '100 years');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ensure_starter_subscription ON public.user_roles;
CREATE TRIGGER trg_ensure_starter_subscription
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.ensure_starter_subscription();

INSERT INTO public.subscriptions(partner_id, plan_id, status, current_period_start, current_period_end)
SELECT ur.user_id, (SELECT id FROM public.plans WHERE code='starter'), 'active', now(), now() + interval '100 years'
  FROM public.user_roles ur
 WHERE ur.role='partner'
   AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.partner_id = ur.user_id);

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
