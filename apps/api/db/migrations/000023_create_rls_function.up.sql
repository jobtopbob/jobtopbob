CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION WHEN invalid_text_representation THEN
    RETURN '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$ LANGUAGE plpgsql STABLE;
