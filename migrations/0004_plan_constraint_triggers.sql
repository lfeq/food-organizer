-- The two constraint triggers §5.6 specifies that were never built: plan
-- alignment (§5.6 #2) and plan completeness (§5.6 #3). §5.6 #1 and #4 ship in
-- `0002_auth.sql`, whose comments number themselves the same way.
--
-- Both are DEFERRABLE INITIALLY DEFERRED, which is what makes them compatible
-- with writing a plan in one transaction: `generateWeek` reuses the
-- `weekly_plan` row, deletes the days it is about to redraw, then inserts each
-- `plan_day` followed by its three `slot` rows one at a time. Between those
-- statements a plan momentarily holds no days and a day momentarily holds
-- fewer than three slots. Only the state at COMMIT is an invariant.

-- §5.6 #2: a plan's week start matches the setting. Cross-table, so it cannot
-- be a CHECK; with the freeze in §5.6 #4 a misaligned week is unrepresentable.
CREATE FUNCTION check_plan_week_start_aligned() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_start date;
  configured_dow smallint;
BEGIN
  -- The row may have been deleted, or its week_start changed again, later in
  -- the same transaction; the committed row is what has to be aligned.
  SELECT week_start INTO current_start FROM weekly_plan WHERE id = NEW.id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT week_start_dow INTO configured_dow FROM settings LIMIT 1;
  IF EXTRACT(DOW FROM current_start) IS DISTINCT FROM configured_dow THEN
    RAISE EXCEPTION 'week_start_misaligned';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER weekly_plan_week_start_aligned
  AFTER INSERT OR UPDATE ON weekly_plan
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_plan_week_start_aligned();

-- §5.6 #3: a plan is complete or absent -- every weekly_plan holds at least one
-- plan_day, and every plan_day exactly three slot rows. NOT "exactly seven":
-- a plan generated once its week is underway holds only the days still ahead
-- (§9.1), so seven is not an invariant. The half worth having is the slot
-- count, which catches a partial redraw that drops a day's slots.

-- §5.6 #3, first half: no weekly_plan with no days.
CREATE FUNCTION check_weekly_plan_has_days() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  plan_ids uuid[];
  plan_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'weekly_plan' THEN
    plan_ids := ARRAY[NEW.id];
  ELSIF TG_OP = 'DELETE' THEN
    plan_ids := ARRAY[OLD.weekly_plan_id];
  ELSIF TG_OP = 'INSERT' THEN
    plan_ids := ARRAY[NEW.weekly_plan_id];
  ELSE
    -- A day moved between plans can empty the plan it left.
    plan_ids := ARRAY[NEW.weekly_plan_id, OLD.weekly_plan_id];
  END IF;

  FOREACH plan_id IN ARRAY plan_ids LOOP
    -- A plan deleted later in the transaction takes its days with it; that is
    -- "absent", not "incomplete".
    IF EXISTS (SELECT 1 FROM weekly_plan WHERE id = plan_id)
       AND NOT EXISTS (SELECT 1 FROM plan_day WHERE weekly_plan_id = plan_id) THEN
      RAISE EXCEPTION 'plan_incomplete';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER weekly_plan_has_days
  AFTER INSERT ON weekly_plan
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_weekly_plan_has_days();

CREATE CONSTRAINT TRIGGER plan_day_keeps_plan_complete
  AFTER INSERT OR UPDATE OR DELETE ON plan_day
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_weekly_plan_has_days();

-- §5.6 #3, second half: no plan_day with other than exactly three slots.
CREATE FUNCTION check_plan_day_slot_count() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  day_ids uuid[];
  day_id uuid;
  slots integer;
BEGIN
  IF TG_TABLE_NAME = 'plan_day' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN NULL;  -- the day is gone; its slots went with it
    END IF;
    day_ids := ARRAY[NEW.id];
  ELSIF TG_OP = 'DELETE' THEN
    day_ids := ARRAY[OLD.plan_day_id];
  ELSIF TG_OP = 'INSERT' THEN
    day_ids := ARRAY[NEW.plan_day_id];
  ELSE
    -- A slot moved between days can leave the day it left short.
    day_ids := ARRAY[NEW.plan_day_id, OLD.plan_day_id];
  END IF;

  FOREACH day_id IN ARRAY day_ids LOOP
    IF EXISTS (SELECT 1 FROM plan_day WHERE id = day_id) THEN
      SELECT COUNT(*) INTO slots FROM slot WHERE plan_day_id = day_id;
      IF slots <> 3 THEN
        RAISE EXCEPTION 'plan_incomplete';
      END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER plan_day_has_three_slots
  AFTER INSERT OR UPDATE ON plan_day
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_plan_day_slot_count();

CREATE CONSTRAINT TRIGGER slot_keeps_day_complete
  AFTER INSERT OR UPDATE OR DELETE ON slot
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_plan_day_slot_count();
