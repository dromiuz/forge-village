-- Signal Deck Online - Multi-Project Support

-- Drop existing tables if they exist
drop table if exists comments;
drop table if exists share_links;
drop table if exists tracking_items;
drop table if exists waveform_markers;
drop table if exists song_assets;
drop table if exists songs;
drop table if exists projects;

-- Projects table (multiple per user)
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Untitled Project',
  artist text,
  description text,
  stages jsonb default '["Idea", "Writing", "Demo", "Recording", "Production", "Mixing", "Mastering", "Ready to Release", "Released"]'::jsonb,
  release_checklist jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Songs table  
create table if not exists songs (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  artist text,
  stage text default 'Idea',
  progress integer default 0,
  notes text,
  about text,
  emotion text,
  unresolved text,
  why_matters text,
  visual_lane text,
  next_step text,
  release_date text,
  lyrics text,
  active_review_asset_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Song assets table
create table if not exists song_assets (
  id uuid default uuid_generate_v4() primary key,
  song_id uuid references songs(id) on delete cascade,
  name text not null,
  type text,
  kind text, -- demo, mix, master, instrumental, acapella
  status text default 'idea',
  notes text,
  file_url text,
  file_name text,
  mime_type text,
  is_active_review boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Waveform markers table
create table if not exists waveform_markers (
  id uuid default uuid_generate_v4() primary key,
  song_id uuid references songs(id) on delete cascade,
  time numeric not null,
  label text,
  comment text,
  color text default 'purple',
  resolved boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tracking board items table
create table if not exists tracking_items (
  id uuid default uuid_generate_v4() primary key,
  song_id uuid references songs(id) on delete cascade,
  section text,
  instrument text,
  part text,
  status text default 'needed',
  notes text,
  priority text default 'normal',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Comments table (for collaboration)
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  target_type text not null, -- 'song', 'marker', 'lyric', 'asset', 'tracking'
  target_id text not null, -- ID of the target item
  content text not null,
  resolved boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Share links table
create table if not exists share_links (
  id uuid default uuid_generate_v4() primary key,
  song_id uuid references songs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete cascade,
  token text unique not null,
  expires_at timestamp with time zone,
  permissions text default 'view', -- 'view', 'comment', 'edit'
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table projects enable row level security;
alter table songs enable row level security;
alter table song_assets enable row level security;
alter table waveform_markers enable row level security;
alter table tracking_items enable row level security;
alter table comments enable row level security;
alter table share_links enable row level security;

-- RLS Policies
create policy "Users can manage their own projects"
  on projects for all
  using (auth.uid() = user_id);

create policy "Users can manage project songs"
  on songs for all
  using (exists (
    select 1 from projects 
    where projects.id = songs.project_id 
    and projects.user_id = auth.uid()
  ));

create policy "Users can manage song assets"
  on song_assets for all
  using (exists (
    select 1 from songs 
    join projects on songs.project_id = projects.id
    where song_assets.song_id = songs.id 
    and projects.user_id = auth.uid()
  ));

create policy "Users can manage waveform markers"
  on waveform_markers for all
  using (exists (
    select 1 from songs 
    join projects on songs.project_id = projects.id
    where waveform_markers.song_id = songs.id 
    and projects.user_id = auth.uid()
  ));

create policy "Users can manage tracking items"
  on tracking_items for all
  using (exists (
    select 1 from songs 
    join projects on songs.project_id = projects.id
    where tracking_items.song_id = songs.id 
    and projects.user_id = auth.uid()
  ));

create policy "Users can manage their comments"
  on comments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can view share links"
  on share_links for select
  using (true);

create policy "Users can manage their share links"
  on share_links for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Function to get all user projects with songs
create or replace function get_user_projects()
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'projects', coalesce((
      select json_agg(json_build_object(
        'id', p.id,
        'name', p.name,
        'artist', p.artist,
        'description', p.description,
        'stages', p.stages,
        'releaseChecklist', p.release_checklist,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at,
        'songs', coalesce((
          select json_agg(json_build_object(
            'id', s.id,
            'title', s.title,
            'artist', s.artist,
            'stage', s.stage,
            'progress', s.progress,
            'notes', s.notes,
            'about', s.about,
            'emotion', s.emotion,
            'unresolved', s.unresolved,
            'whyMatters', s.why_matters,
            'visualLane', s.visual_lane,
            'nextStep', s.next_step,
            'releaseDate', s.release_date,
            'lyrics', s.lyrics,
            'activeReviewAssetId', s.active_review_asset_id,
            'assets', coalesce((
              select json_agg(json_build_object(
                'id', a.id,
                'name', a.name,
                'type', a.type,
                'kind', a.kind,
                'status', a.status,
                'notes', a.notes,
                'fileUrl', a.file_url,
                'fileName', a.file_name,
                'mimeType', a.mime_type,
                'isActiveReview', a.is_active_review
              ))
              from song_assets a
              where a.song_id = s.id
            ), '[]'::json),
            'waveformMarkers', coalesce((
              select json_agg(json_build_object(
                'id', m.id,
                'time', m.time,
                'label', m.label,
                'comment', m.comment,
                'color', m.color,
                'resolved', m.resolved
              ))
              from waveform_markers m
              where m.song_id = s.id
            ), '[]'::json),
            'trackingBoard', coalesce((
              select json_agg(json_build_object(
                'id', t.id,
                'section', t.section,
                'instrument', t.instrument,
                'part', t.part,
                'status', t.status,
                'notes', t.notes,
                'priority', t.priority
              ))
              from tracking_items t
              where t.song_id = s.id
            ), '[]'::json)
          ))
          from songs s
          where s.project_id = p.id
          order by s.created_at
        ), '[]'::json)
      ))
      from projects p
      where p.user_id = auth.uid()
      order by p.created_at desc
    ), '[]'::json)
  ) into result;
  
  return result;
end;
$$ language plpgsql security definer;

-- Function to create a new project
create or replace function create_user_project(project_name text, artist_name text default null, project_description text default null)
returns json as $$
declare
  new_project record;
  result json;
begin
  insert into projects (user_id, name, artist, description)
  values (auth.uid(), project_name, artist_name, project_description)
  returning * into new_project;
  
  select json_build_object(
    'project', json_build_object(
      'id', new_project.id,
      'name', new_project.name,
      'artist', new_project.artist,
      'description', new_project.description,
      'stages', new_project.stages,
      'releaseChecklist', new_project.release_checklist,
      'createdAt', new_project.created_at,
      'updatedAt', new_project.updated_at
    )
  ) into result;
  
  return result;
end;
$$ language plpgsql security definer;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all functions in schema public to authenticated;
grant all on all sequences in schema public to authenticated;