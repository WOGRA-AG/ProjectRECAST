drop policy "Enable read access for all users" on "public"."element_properties";

drop policy "Enable read access for all users" on "public"."elements";

drop policy "Enable read access for all users" on "public"."processes";

drop policy "Enable read access for all users" on "public"."step_properties";

drop policy "Enable read access for all users" on "public"."steps";

create policy "full_access_if_owner"
on "public"."element_properties"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT e.id
   FROM elements e
  WHERE (e.id = element_properties.element_id))));


create policy "full_access_if_owner"
on "public"."elements"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT p.id
   FROM processes p
  WHERE (p.id = elements.process_id))));


create policy "full_access_if_owner"
on "public"."processes"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT b.id
   FROM bundles b
  WHERE (b.id = processes.bundle_id))));


create policy "full_access_if_owner"
on "public"."step_properties"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT s.id
   FROM steps s
  WHERE (s.id = step_properties.step_id))));


create policy "full_acccess_if_owner"
on "public"."steps"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT p.id
   FROM processes p
  WHERE (p.id = steps.process_id))));



