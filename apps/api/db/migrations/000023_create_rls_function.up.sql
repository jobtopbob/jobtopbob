CREATE OR REPLACE FUNCTION current_user_id() RETURNS text AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '');
END;
$$ LANGUAGE plpgsql STABLE;
