-- §5.5 weekly_plan, plan_day, slot tables
CREATE TABLE weekly_plan (
  id          uuid        PRIMARY KEY,
  week_start  date        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plan_day (
  id              uuid        PRIMARY KEY,
  weekly_plan_id  uuid        NOT NULL REFERENCES weekly_plan (id) ON DELETE CASCADE,
  day_date        date        NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (weekly_plan_id, day_date)
);

CREATE TABLE slot (
  id           uuid        PRIMARY KEY,
  plan_day_id  uuid        NOT NULL REFERENCES plan_day (id) ON DELETE CASCADE,
  course       course      NOT NULL,
  dish_name    citext      NOT NULL,
  dish_id      uuid        REFERENCES dish (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_day_id, course)
);
CREATE INDEX slot_dish_id ON slot (dish_id);

-- set_updated_at triggers
CREATE TRIGGER weekly_plan_set_updated_at BEFORE UPDATE ON weekly_plan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER plan_day_set_updated_at BEFORE UPDATE ON plan_day
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER slot_set_updated_at BEFORE UPDATE ON slot
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- §5.6 Trigger 2: plan week_start must match settings.week_start_dow
CREATE OR REPLACE FUNCTION check_plan_week_start() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXTRACT(dow FROM NEW.week_start) != (SELECT week_start_dow FROM settings) THEN
    RAISE EXCEPTION 'week_start day-of-week does not match settings.week_start_dow';
  END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER weekly_plan_check_week_start
  AFTER INSERT OR UPDATE ON weekly_plan
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_plan_week_start();

-- §5.6 Trigger 3: every weekly_plan has exactly 7 plan_days; every plan_day has exactly 3 slots
CREATE OR REPLACE FUNCTION check_plan_completeness() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Check all plans have exactly 7 days
  IF EXISTS (
    SELECT 1 FROM weekly_plan wp
    WHERE (SELECT COUNT(*) FROM plan_day pd WHERE pd.weekly_plan_id = wp.id) != 7
  ) THEN
    RAISE EXCEPTION 'every weekly_plan must have exactly seven plan_day rows';
  END IF;
  -- Check all days have exactly 3 slots
  IF EXISTS (
    SELECT 1 FROM plan_day pd
    WHERE (SELECT COUNT(*) FROM slot s WHERE s.plan_day_id = pd.id) != 3
  ) THEN
    RAISE EXCEPTION 'every plan_day must have exactly three slot rows';
  END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER plan_day_check_completeness
  AFTER INSERT OR UPDATE OR DELETE ON plan_day
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_plan_completeness();
CREATE CONSTRAINT TRIGGER slot_check_completeness
  AFTER INSERT OR UPDATE OR DELETE ON slot
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_plan_completeness();

-- §5.6 Trigger 4: week_start_dow cannot change once any weekly_plan exists
CREATE OR REPLACE FUNCTION check_week_start_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.week_start_dow IS DISTINCT FROM NEW.week_start_dow THEN
    IF EXISTS (SELECT 1 FROM weekly_plan) THEN
      RAISE EXCEPTION 'week_start_dow cannot change once a weekly_plan exists';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER settings_check_week_start_frozen
  AFTER UPDATE ON settings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_week_start_frozen();
