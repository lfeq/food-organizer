-- Auth schema: settings, member, session, dish, and remaining tables (§5.5).
-- Constraint triggers for at-least-one-admin (§5.6 #1) and week-start-frozen (§5.6 #4).
-- Plan-completeness and plan-alignment triggers come with the plan feature (tickets #18-19).

CREATE TABLE settings (
  id              uuid        PRIMARY KEY,
  singleton       boolean     NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  week_start_dow  smallint    NOT NULL DEFAULT 0 CHECK (week_start_dow BETWEEN 0 AND 6),
  timezone        text        NOT NULL DEFAULT 'America/Mexico_City'
                              CHECK (NOW() AT TIME ZONE timezone IS NOT NULL),
  display_name    text,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE member (
  id                    uuid        PRIMARY KEY,
  username              citext      NOT NULL UNIQUE
                                    CHECK (
                                      LENGTH(TRIM(username)) > 0
                                      AND username ~ '^[a-zA-Z0-9_-]+$'
                                    ),
  password_hash         text        NOT NULL,
  must_change_password  boolean     NOT NULL DEFAULT true,
  role                  member_role NOT NULL DEFAULT 'member',
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE session (
  token_hash  bytea       PRIMARY KEY CHECK (OCTET_LENGTH(token_hash) = 32),
  member_id   uuid        NOT NULL REFERENCES member (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX session_member_id ON session (member_id);

CREATE TABLE dish (
  id          uuid        PRIMARY KEY,
  name        citext      NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
  course      course      NOT NULL,
  author_id   uuid        REFERENCES member (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (course, name)
);
CREATE INDEX dish_author_id ON dish (author_id);

CREATE TABLE weekly_plan (
  id          uuid        PRIMARY KEY,
  week_start  date        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_day (
  id              uuid        PRIMARY KEY,
  weekly_plan_id  uuid        NOT NULL REFERENCES weekly_plan (id) ON DELETE CASCADE,
  day_date        date        NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (weekly_plan_id, day_date)
);

CREATE TABLE slot (
  id           uuid        PRIMARY KEY,
  plan_day_id  uuid        NOT NULL REFERENCES plan_day (id) ON DELETE CASCADE,
  course       course      NOT NULL,
  dish_name    citext      NOT NULL,
  dish_id      uuid        REFERENCES dish (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (plan_day_id, course)
);
CREATE INDEX slot_dish_id ON slot (dish_id);

-- set_updated_at triggers on all mutable tables (session is exempt by design)
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER member_set_updated_at BEFORE UPDATE ON member
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dish_set_updated_at BEFORE UPDATE ON dish
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER weekly_plan_set_updated_at BEFORE UPDATE ON weekly_plan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER plan_day_set_updated_at BEFORE UPDATE ON plan_day
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER slot_set_updated_at BEFORE UPDATE ON slot
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- §5.6 #1: at least one admin must exist at all times (deferrable for role swaps)
CREATE FUNCTION check_at_least_one_admin() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM member WHERE role = 'admin') THEN
    RAISE EXCEPTION 'at_least_one_admin';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER member_at_least_one_admin
  AFTER UPDATE OR DELETE ON member
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_at_least_one_admin();

-- §5.6 #4: week_start_dow freezes once the first weekly_plan exists
CREATE FUNCTION check_week_start_not_frozen() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.week_start_dow IS DISTINCT FROM OLD.week_start_dow THEN
    IF EXISTS (SELECT 1 FROM weekly_plan LIMIT 1) THEN
      RAISE EXCEPTION 'week_start_frozen';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER settings_week_start_not_frozen BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION check_week_start_not_frozen();
