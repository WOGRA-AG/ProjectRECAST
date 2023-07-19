alter table "public"."processes" drop constraint "processes_owner_id_fkey";

alter table "public"."bundles" alter column "owner_id" set default auth.uid();

CREATE UNIQUE INDEX unique_name_bundleid ON public.processes USING btree (bundle_id, name);

alter table "public"."processes" add constraint "unique_name_bundleid" UNIQUE using index "unique_name_bundleid";

alter table "public"."processes" add constraint "processes_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."processes" validate constraint "processes_owner_id_fkey";

create policy "Enable ALL operations for users based on user_id"
on "public"."bundles"
as permissive
for all
to authenticated
using ((auth.uid() = owner_id));



