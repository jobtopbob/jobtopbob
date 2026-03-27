CREATE TABLE resources (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title       text NOT NULL,
    url         text,
    type        text NOT NULL DEFAULT 'link',
    category    text,
    description text,
    content     text,
    pinned      boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own ON resources FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON resources FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON resources FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON resources FOR DELETE USING (user_id = current_user_id());
