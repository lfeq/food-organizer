CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE course AS ENUM ('soup', 'side', 'main');
CREATE TYPE member_role AS ENUM ('admin', 'member');

CREATE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
