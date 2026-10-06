-- GreenTrack Supabase schema.
-- Run this file in the Supabase SQL Editor. It is safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'ADMIN' check (role in ('ADMIN', 'STAFF')),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'ADMIN' check (role in ('ADMIN', 'STAFF')),
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  species_name text not null,
  common_name text not null,
  scientific_name text not null,
  description text,
  suitable_climate text,
  water_requirement text,
  growth_information text,
  created_at timestamptz not null default now(),
  unique (organization_id, common_name)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  address text,
  area text,
  city text,
  state text,
  country text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, label)
);

create table if not exists public.trees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  species_id uuid not null references public.species(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  tree_code text not null,
  planting_date date not null default current_date,
  status text not null default 'Alive' check (status in ('Alive', 'Dead', 'Needs Attention')),
  health_condition text not null default 'Unknown' check (health_condition in ('Healthy', 'Moderate', 'Poor', 'Critical', 'Unknown')),
  latitude double precision,
  longitude double precision,
  image_url text,
  notes text,
  survival_probability double precision check (survival_probability between 0 and 1),
  risk_level text check (risk_level in ('Low', 'Medium', 'High', 'Critical')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tree_code)
);

create table if not exists public.maintenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  maintenance_type text not null check (maintenance_type in ('Watering', 'Fertilizing', 'Pruning', 'Pest Control', 'Disease Treatment', 'Soil Treatment', 'Other')),
  maintenance_date date not null default current_date,
  description text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.health_analysis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tree_id uuid not null references public.trees(id) on delete cascade,
  image_url text not null,
  health_status text not null check (health_status in ('Healthy', 'Moderate', 'Poor', 'Critical', 'Unknown')),
  possible_issue text not null,
  confidence_score double precision not null check (confidence_score between 0 and 1),
  ai_recommendation text not null,
  assessment_type text not null default 'Rule-based' check (assessment_type in ('AI', 'Rule-based')),
  created_at timestamptz not null default now()
);

create table if not exists public.survival_predictions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tree_id uuid not null references public.trees(id) on delete cascade,
  survival_probability double precision not null check (survival_probability between 0 and 1),
  risk_level text not null check (risk_level in ('Low', 'Medium', 'High', 'Critical')),
  prediction_factors jsonb not null default '[]'::jsonb,
  model_version text not null default 'rules-v1',
  scientifically_validated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tree_id uuid not null references public.trees(id) on delete cascade,
  recommendation_type text not null default 'Maintenance',
  priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  recommendation text not null,
  reason text not null,
  suggested_timeframe text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tree_id uuid references public.trees(id) on delete cascade,
  alert_type text not null,
  priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message text not null,
  status text not null default 'Open' check (status in ('Open', 'Acknowledged', 'Resolved')),
  created_at timestamptz not null default now()
);

create index if not exists trees_org_status_idx on public.trees (organization_id, status);
create index if not exists trees_org_health_idx on public.trees (organization_id, health_condition);
create index if not exists trees_org_planting_date_idx on public.trees (organization_id, planting_date);
create index if not exists maintenance_org_tree_date_idx on public.maintenance (organization_id, tree_id, maintenance_date desc);
create index if not exists alerts_org_status_date_idx on public.alerts (organization_id, status, created_at desc);
create unique index if not exists alerts_open_tree_type_uidx
  on public.alerts (tree_id, alert_type)
  where status <> 'Resolved' and tree_id is not null;

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.role = 'ADMIN'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_touch_updated_at on public.organizations;
create trigger organizations_touch_updated_at before update on public.organizations
for each row execute function public.touch_updated_at();
drop trigger if exists locations_touch_updated_at on public.locations;
create trigger locations_touch_updated_at before update on public.locations
for each row execute function public.touch_updated_at();
drop trigger if exists trees_touch_updated_at on public.trees;
create trigger trees_touch_updated_at before update on public.trees
for each row execute function public.touch_updated_at();

create or replace function public.keep_profile_scope_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id <> old.organization_id or new.role <> old.role or new.email <> old.email then
    raise exception 'Profile role and organization membership are managed by organization administrators';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_scope_immutable on public.profiles;
create trigger profiles_scope_immutable before update on public.profiles
for each row execute function public.keep_profile_scope_immutable();

create or replace function public.create_tree_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alert_priority text;
  alert_message text;
begin
  if new.health_condition in ('Critical', 'Poor') or new.status = 'Needs Attention' then
    alert_priority := case
      when new.health_condition = 'Critical' then 'CRITICAL'
      when new.health_condition = 'Poor' then 'HIGH'
      else 'MEDIUM'
    end;
    alert_message := case
      when new.health_condition = 'Critical' then 'Critical health condition reported; inspect this tree as soon as possible.'
      when new.health_condition = 'Poor' then 'Poor health condition reported; schedule an inspection and care.'
      else 'This tree is marked as needing attention; review its condition and maintenance history.'
    end;
    insert into public.alerts (organization_id, tree_id, alert_type, priority, message)
    values (new.organization_id, new.id, 'Tree health', alert_priority, alert_message)
    on conflict (tree_id, alert_type) where status <> 'Resolved' and tree_id is not null
    do update set priority = excluded.priority, message = excluded.message, created_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trees_create_alert on public.trees;
create trigger trees_create_alert after insert or update of health_condition, status on public.trees
for each row execute function public.create_tree_alert();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.species enable row level security;
alter table public.locations enable row level security;
alter table public.trees enable row level security;
alter table public.maintenance enable row level security;
alter table public.health_analysis enable row level security;
alter table public.survival_predictions enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.alerts enable row level security;

drop policy if exists organizations_read_member on public.organizations;
create policy organizations_read_member on public.organizations for select to authenticated using (public.is_org_member(id));
drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

drop policy if exists profiles_read_org on public.profiles;
create policy profiles_read_org on public.profiles for select to authenticated using (id = auth.uid() or public.is_org_member(organization_id));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists members_read_org on public.organization_members;
create policy members_read_org on public.organization_members for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists species_read_org on public.species;
create policy species_read_org on public.species for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists species_insert_admin on public.species;
create policy species_insert_admin on public.species for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists species_update_admin on public.species;
create policy species_update_admin on public.species for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists species_delete_admin on public.species;
create policy species_delete_admin on public.species for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists locations_read_org on public.locations;
create policy locations_read_org on public.locations for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists locations_insert_admin on public.locations;
create policy locations_insert_admin on public.locations for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists locations_update_admin on public.locations;
create policy locations_update_admin on public.locations for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists locations_delete_admin on public.locations;
create policy locations_delete_admin on public.locations for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists trees_read_org on public.trees;
create policy trees_read_org on public.trees for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists trees_insert_org on public.trees;
drop policy if exists trees_update_org on public.trees;
create policy trees_update_org on public.trees for update to authenticated
using (public.is_org_member(organization_id))
with check (
  public.is_org_member(organization_id)
  and exists (select 1 from public.species s where s.id = public.trees.species_id and s.organization_id = public.trees.organization_id)
  and exists (select 1 from public.locations l where l.id = public.trees.location_id and l.organization_id = public.trees.organization_id)
);
drop policy if exists trees_insert_org on public.trees;
create policy trees_insert_org on public.trees for insert to authenticated with check (
  public.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (select 1 from public.species s where s.id = public.trees.species_id and s.organization_id = public.trees.organization_id)
  and exists (select 1 from public.locations l where l.id = public.trees.location_id and l.organization_id = public.trees.organization_id)
);
drop policy if exists trees_delete_admin on public.trees;
create policy trees_delete_admin on public.trees for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists maintenance_read_org on public.maintenance;
create policy maintenance_read_org on public.maintenance for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists maintenance_insert_org on public.maintenance;
create policy maintenance_insert_org on public.maintenance for insert to authenticated with check (
  public.is_org_member(organization_id)
  and user_id = auth.uid()
  and exists (select 1 from public.trees t where t.id = public.maintenance.tree_id and t.organization_id = public.maintenance.organization_id)
);
drop policy if exists maintenance_update_admin on public.maintenance;
create policy maintenance_update_admin on public.maintenance for update to authenticated
using (public.is_org_admin(organization_id))
with check (
  public.is_org_admin(organization_id)
  and exists (select 1 from public.trees t where t.id = public.maintenance.tree_id and t.organization_id = public.maintenance.organization_id)
);
drop policy if exists maintenance_delete_admin on public.maintenance;
create policy maintenance_delete_admin on public.maintenance for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists health_analysis_read_org on public.health_analysis;
create policy health_analysis_read_org on public.health_analysis for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists health_analysis_insert_org on public.health_analysis;
create policy health_analysis_insert_org on public.health_analysis for insert to authenticated with check (
  public.is_org_member(organization_id)
  and exists (select 1 from public.trees t where t.id = public.health_analysis.tree_id and t.organization_id = public.health_analysis.organization_id)
);
drop policy if exists survival_read_org on public.survival_predictions;
create policy survival_read_org on public.survival_predictions for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists survival_insert_org on public.survival_predictions;
create policy survival_insert_org on public.survival_predictions for insert to authenticated with check (
  public.is_org_member(organization_id)
  and exists (select 1 from public.trees t where t.id = public.survival_predictions.tree_id and t.organization_id = public.survival_predictions.organization_id)
);
drop policy if exists recommendation_read_org on public.ai_recommendations;
create policy recommendation_read_org on public.ai_recommendations for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists recommendation_insert_org on public.ai_recommendations;
create policy recommendation_insert_org on public.ai_recommendations for insert to authenticated with check (
  public.is_org_member(organization_id)
  and exists (select 1 from public.trees t where t.id = public.ai_recommendations.tree_id and t.organization_id = public.ai_recommendations.organization_id)
);

drop policy if exists alerts_read_org on public.alerts;
create policy alerts_read_org on public.alerts for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists alerts_update_org on public.alerts;
create policy alerts_update_org on public.alerts for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists alerts_delete_admin on public.alerts;
create policy alerts_delete_admin on public.alerts for delete to authenticated using (public.is_org_admin(organization_id));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.organizations, public.organization_members to authenticated;
grant select, insert, update, delete on public.species, public.locations to authenticated;
grant select, insert, update, delete on public.trees, public.maintenance to authenticated;
grant select, insert on public.health_analysis, public.survival_predictions, public.ai_recommendations to authenticated;
grant select, update, delete on public.alerts to authenticated;

create or replace function public.seed_greentrack_org(
  target_org_id uuid,
  owner_user_id uuid,
  owner_name text default 'GreenTrack Administrator'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  s_id uuid;
  l_id uuid;
  l_lat double precision;
  l_lon double precision;
  tree_id uuid;
  tree_status text;
  tree_health text;
  tree_species text;
begin
  if exists (select 1 from public.trees where organization_id = target_org_id) then
    return;
  end if;

  insert into public.species (organization_id, species_name, common_name, scientific_name, description, suitable_climate, water_requirement, growth_information)
  values
    (target_org_id, 'Neem', 'Neem', 'Azadirachta indica', 'A hardy, drought-tolerant shade tree valued for its resilience.', 'Tropical and subtropical', 'Low to moderate', 'Evergreen; establish with regular watering in the first year.'),
    (target_org_id, 'Mango', 'Mango', 'Mangifera indica', 'A long-lived fruit tree suited to warm, frost-free regions.', 'Tropical and subtropical', 'Moderate', 'Needs sun, well-drained soil, and seasonal pruning.'),
    (target_org_id, 'Banyan', 'Banyan', 'Ficus benghalensis', 'A broad-canopied native tree that needs ample growing space.', 'Tropical', 'Moderate', 'Very large mature canopy and extensive aerial roots.'),
    (target_org_id, 'Peepal', 'Peepal', 'Ficus religiosa', 'A culturally significant native tree with a spreading canopy.', 'Tropical and subtropical', 'Moderate', 'Fast-growing when young; select an open planting site.'),
    (target_org_id, 'Teak', 'Teak', 'Tectona grandis', 'A deciduous timber tree requiring seasonal rainfall and sun.', 'Tropical monsoon', 'Moderate', 'Prefers deep, well-drained soil and a distinct dry season.'),
    (target_org_id, 'Guava', 'Guava', 'Psidium guajava', 'A compact fruit tree that adapts to a range of warm climates.', 'Tropical and subtropical', 'Moderate', 'Fruits well with regular watering and light pruning.')
  on conflict (organization_id, common_name) do nothing;

  insert into public.locations (organization_id, label, address, area, city, state, country, latitude, longitude)
  values
    (target_org_id, 'North Grove', 'North field entrance', 'North Grove', 'Bengaluru', 'Karnataka', 'India', 13.0450, 77.5850),
    (target_org_id, 'Lakeview Plot', 'East lake path', 'Lakeview', 'Bengaluru', 'Karnataka', 'India', 12.9750, 77.6200),
    (target_org_id, 'Community Park', 'Community park grounds', 'Central Park', 'Bengaluru', 'Karnataka', 'India', 12.9600, 77.5850),
    (target_org_id, 'South Orchard', 'South orchard access road', 'South Orchard', 'Bengaluru', 'Karnataka', 'India', 12.9000, 77.5700)
  on conflict (organization_id, label) do nothing;

  for i in 1..26 loop
    tree_species := case (i % 6)
      when 0 then 'Neem' when 1 then 'Mango' when 2 then 'Banyan'
      when 3 then 'Peepal' when 4 then 'Teak' else 'Guava' end;
    select id into s_id from public.species
      where organization_id = target_org_id and common_name = tree_species;
    select id, latitude, longitude into l_id, l_lat, l_lon
      from public.locations
      where organization_id = target_org_id
      order by label
      offset ((i - 1) % 4) limit 1;
    tree_status := case when i % 10 = 0 then 'Dead' when i % 5 = 0 then 'Needs Attention' else 'Alive' end;
    tree_health := case when i % 11 = 0 then 'Critical' when i % 5 = 0 then 'Poor' when i % 4 = 0 then 'Moderate' else 'Healthy' end;

    insert into public.trees (
      organization_id, species_id, location_id, tree_code, planting_date, status,
      health_condition, latitude, longitude, notes, created_by
    )
    values (
      target_org_id, s_id, l_id, 'GT-' || lpad(i::text, 3, '0'),
      current_date - ((i * 23) % 1300), tree_status, tree_health,
      l_lat + ((i % 7) - 3) * 0.0008, l_lon + ((i % 9) - 4) * 0.0008,
      case when tree_status = 'Needs Attention' then 'Follow up on recent field inspection.' else null end,
      owner_user_id
    )
    returning id into tree_id;

    if i % 3 <> 0 then
      insert into public.maintenance (organization_id, tree_id, user_id, maintenance_type, maintenance_date, description)
      values (
        target_org_id, tree_id, owner_user_id,
        case when i % 2 = 0 then 'Watering' else 'Soil Treatment' end,
        current_date - (i % 22),
        case when i % 2 = 0 then 'Routine watering during establishment.' else 'Checked soil moisture and condition.' end
      );
    end if;
  end loop;

  insert into public.ai_recommendations (organization_id, tree_id, recommendation_type, priority, recommendation, reason, suggested_timeframe)
  select target_org_id, t.id, 'Maintenance', 'HIGH',
    'Inspect the tree and review its watering schedule.',
    'The tree is currently marked as needing attention.',
    'Within 48 hours'
  from public.trees t
  where t.organization_id = target_org_id and t.status = 'Needs Attention'
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_greentrack_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_org_id uuid;
  display_name text;
  org_name text;
begin
  display_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));
  org_name := coalesce(nullif(new.raw_user_meta_data ->> 'organization_name', ''), 'GreenTrack Workspace');
  insert into public.organizations (name, contact_email)
  values (org_name, new.email)
  returning id into new_org_id;

  insert into public.profiles (id, full_name, email, role, organization_id)
  values (new.id, display_name, coalesce(new.email, ''), 'ADMIN', new_org_id);

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'ADMIN');

  perform public.seed_greentrack_org(new_org_id, new.id, display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_greentrack on auth.users;
create trigger on_auth_user_created_greentrack
after insert on auth.users
for each row execute function public.handle_new_greentrack_user();

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
revoke all on function public.seed_greentrack_org(uuid, uuid, text) from public, anon, authenticated;

-- Storage is private. The first path segment must be the user's organization UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tree-images', 'tree-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Organization members read tree images" on storage.objects;
create policy "Organization members read tree images" on storage.objects
for select to authenticated using (
  bucket_id = 'tree-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);
drop policy if exists "Organization members upload tree images" on storage.objects;
create policy "Organization members upload tree images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'tree-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);
drop policy if exists "Organization members update tree images" on storage.objects;
create policy "Organization members update tree images" on storage.objects
for update to authenticated using (
  bucket_id = 'tree-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
  )
) with check (
  bucket_id = 'tree-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
  )
);
drop policy if exists "Organization admins delete tree images" on storage.objects;
create policy "Organization admins delete tree images" on storage.objects
for delete to authenticated using (
  bucket_id = 'tree-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
      and public.is_org_admin(p.organization_id)
  )
);
