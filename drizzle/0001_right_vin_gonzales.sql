ALTER TABLE "users" ADD COLUMN "username" varchar(32);

DO $$
DECLARE
  r RECORD;
  base_name text;
  candidate text;
  suffix integer;
  max_base_length integer;
BEGIN
  FOR r IN
    SELECT id, email
    FROM "users"
    WHERE "username" IS NULL
    ORDER BY id
  LOOP
    base_name := lower(
      regexp_replace(
        split_part(r.email, '@', 1),
        '[^a-z0-9_]+',
        '_',
        'g'
      )
    );

    base_name := trim(both '_' from base_name);

    IF base_name = '' THEN
      base_name := 'user';
    END IF;

    max_base_length := 32;
    base_name := left(base_name, max_base_length);

    candidate := base_name;
    suffix := 1;

    WHILE EXISTS (
      SELECT 1
      FROM "users"
      WHERE "username" = candidate
    )
    LOOP
      suffix := suffix + 1;
      candidate :=
        left(
          base_name,
          32 - length('_' || suffix::text)
        )
        || '_' || suffix::text;
    END LOOP;

    UPDATE "users"
    SET "username" = candidate
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_unique"
  ON "users" USING btree ("username");
