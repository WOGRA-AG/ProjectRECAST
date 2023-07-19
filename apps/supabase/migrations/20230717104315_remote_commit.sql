alter table "public"."processes" drop constraint "Processes_owner_id_fkey";

create table "public"."bundles" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone default now(),
    "name" text,
    "owner_id" uuid
);


alter table "public"."bundles" enable row level security;

alter table "public"."processes" add column "bundle_id" bigint;

CREATE UNIQUE INDEX bundles_pkey ON public.bundles USING btree (id);

alter table "public"."bundles" add constraint "bundles_pkey" PRIMARY KEY using index "bundles_pkey";

alter table "public"."bundles" add constraint "bundles_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."bundles" validate constraint "bundles_owner_id_fkey";

alter table "public"."processes" add constraint "processes_bundle_id_fkey" FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE not valid;

alter table "public"."processes" validate constraint "processes_bundle_id_fkey";

alter table "public"."processes" add constraint "processes_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) not valid;

alter table "public"."processes" validate constraint "processes_owner_id_fkey";

