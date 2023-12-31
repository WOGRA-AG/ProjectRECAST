
alter table "public"."element_properties" drop constraint "fk_element";

alter table "public"."element_properties" drop constraint "fk_step_property";

alter table "public"."element_properties" add column "storage_backend" character varying;

alter table "public"."element_properties" add constraint "element_properties_element_id_fkey" FOREIGN KEY (element_id) REFERENCES elements(id) ON DELETE CASCADE not valid;

alter table "public"."element_properties" validate constraint "element_properties_element_id_fkey";

alter table "public"."element_properties" add constraint "element_properties_step_property_id_fkey" FOREIGN KEY (step_property_id) REFERENCES step_properties(id) ON DELETE CASCADE not valid;

alter table "public"."element_properties" validate constraint "element_properties_step_property_id_fkey";



set check_function_bodies = off;

CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$
;

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return split_part(_filename, '.', 2);
END
$function$
;

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$function$
;


