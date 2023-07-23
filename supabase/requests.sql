create table
  public.requests (
    id uuid not null,
    created_at timestamp with time zone not null default now(),
    sender uuid not null,
    receiver uuid not null,
    status smallint not null default '0'::smallint,
    constraint requests_pkey primary key (id)
  ) tablespace pg_default;