create table
  public.friends (
    id uuid not null,
    user uuid not null,
    friends array null,
    constraint friends_pkey primary key (id),
    constraint friends_user_key unique ("user")
  ) tablespace pg_default;