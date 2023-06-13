drop index if exists "auth"."refresh_tokens_token_idx";


alter table "public"."profiles" add column "shepard_api_key" text;

alter table "public"."profiles" add column "shepard_url" text;

alter table "public"."profiles" add column "storage_backend" text;

CREATE UNIQUE INDEX unique_name_processid ON public.elements USING btree (process_id, name);

alter table "public"."elements" add constraint "unique_name_processid" UNIQUE using index "unique_name_processid";


