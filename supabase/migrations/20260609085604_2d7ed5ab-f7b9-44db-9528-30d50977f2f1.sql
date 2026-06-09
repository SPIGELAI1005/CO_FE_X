-- ============ Enums ============
create type public.app_role as enum ('explorer', 'partner', 'admin');

-- ============ Shared trigger fn ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ user_roles ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Admins view all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle text unique,
  avatar_url text,
  bio text,
  city text,
  instagram_handle text,
  x_handle text,
  total_points integer not null default 0,
  total_check_ins integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles public read" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

-- ============ Auto profile + role on signup ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'explorer');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ coffee_shops ============
create table public.coffee_shops (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  cover_image_url text,
  logo_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.coffee_shops to anon, authenticated;
grant insert, update, delete on public.coffee_shops to authenticated;
grant all on public.coffee_shops to service_role;
alter table public.coffee_shops enable row level security;
create policy "Shops visibility" on public.coffee_shops for select using (
  status = 'approved' or partner_id = auth.uid() or public.has_role(auth.uid(),'admin')
);
create policy "Partner creates own shop" on public.coffee_shops for insert to authenticated with check (
  partner_id = auth.uid() and public.has_role(auth.uid(),'partner')
);
create policy "Partner updates own shop" on public.coffee_shops for update to authenticated using (partner_id = auth.uid()) with check (partner_id = auth.uid());
create policy "Admins manage shops" on public.coffee_shops for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger coffee_shops_updated_at before update on public.coffee_shops for each row execute function public.update_updated_at_column();

-- ============ partner_applications ============
create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business_name text not null,
  contact_email text not null,
  phone text,
  city text,
  message text,
  status text not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.partner_applications to authenticated;
grant all on public.partner_applications to service_role;
alter table public.partner_applications enable row level security;
create policy "View own application" on public.partner_applications for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Create own application" on public.partner_applications for insert to authenticated with check (user_id = auth.uid());
create policy "Admins manage applications" on public.partner_applications for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ campaigns ============
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  coffee_shop_id uuid references public.coffee_shops(id) on delete cascade not null,
  title text not null,
  description text,
  reward_description text,
  points_reward integer not null default 10,
  hashtag text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.campaigns to anon, authenticated;
grant insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "Campaigns visibility" on public.campaigns for select using (
  status = 'active'
  or exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "Partner manages own campaigns" on public.campaigns for all to authenticated
  using (exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid()))
  with check (exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid()));
create policy "Admins manage campaigns" on public.campaigns for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.update_updated_at_column();

-- ============ check_ins ============
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  coffee_shop_id uuid references public.coffee_shops(id) on delete cascade not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  social_post_url text,
  social_platform text,
  verified boolean not null default false,
  points_awarded integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.check_ins to authenticated;
grant all on public.check_ins to service_role;
alter table public.check_ins enable row level security;
create policy "Users view own check-ins" on public.check_ins for select to authenticated using (user_id = auth.uid());
create policy "Partners view shop check-ins" on public.check_ins for select to authenticated using (
  exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid())
);
create policy "Admins view all check-ins" on public.check_ins for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Users create own check-in" on public.check_ins for insert to authenticated with check (user_id = auth.uid());
create policy "Partners verify check-ins" on public.check_ins for update to authenticated using (
  exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid())
) with check (true);
create policy "Admins manage check-ins" on public.check_ins for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ badges ============
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon_url text,
  criteria jsonb,
  points_required integer default 0,
  created_at timestamptz not null default now()
);
grant select on public.badges to anon, authenticated;
grant all on public.badges to service_role;
alter table public.badges enable row level security;
create policy "Badges public" on public.badges for select using (true);
create policy "Admins manage badges" on public.badges for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_id)
);
grant select on public.user_badges to anon, authenticated;
grant insert on public.user_badges to authenticated;
grant all on public.user_badges to service_role;
alter table public.user_badges enable row level security;
create policy "User badges public" on public.user_badges for select using (true);
create policy "Admins manage user badges" on public.user_badges for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ rewards ============
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  coffee_shop_id uuid references public.coffee_shops(id) on delete cascade not null,
  title text not null,
  description text,
  cost_points integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.rewards to anon, authenticated;
grant insert, update, delete on public.rewards to authenticated;
grant all on public.rewards to service_role;
alter table public.rewards enable row level security;
create policy "Rewards visibility" on public.rewards for select using (
  active = true
  or exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "Partner manages own rewards" on public.rewards for all to authenticated
  using (exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid()))
  with check (exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid()));
create policy "Admins manage rewards" on public.rewards for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reward_id uuid references public.rewards(id) on delete cascade not null,
  redeemed_at timestamptz not null default now(),
  redemption_code text unique not null default substr(md5(random()::text),1,8)
);
grant select, insert on public.reward_redemptions to authenticated;
grant all on public.reward_redemptions to service_role;
alter table public.reward_redemptions enable row level security;
create policy "User views own redemptions" on public.reward_redemptions for select to authenticated using (user_id = auth.uid());
create policy "Partner views redemptions of own shop" on public.reward_redemptions for select to authenticated using (
  exists (select 1 from public.rewards r join public.coffee_shops s on r.coffee_shop_id = s.id where r.id = reward_id and s.partner_id = auth.uid())
);
create policy "User creates own redemption" on public.reward_redemptions for insert to authenticated with check (user_id = auth.uid());
create policy "Admins manage redemptions" on public.reward_redemptions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ reviews ============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  coffee_shop_id uuid references public.coffee_shops(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, coffee_shop_id)
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "Reviews public" on public.reviews for select using (true);
create policy "Users manage own reviews" on public.reviews for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins moderate reviews" on public.reviews for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger reviews_updated_at before update on public.reviews for each row execute function public.update_updated_at_column();