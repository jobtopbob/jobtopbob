CREATE TABLE contacts (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    company_id   uuid REFERENCES companies(id) ON DELETE SET NULL,
    name         text NOT NULL,
    role         text,
    email        text,
    linkedin_url text,
    avatar_url   text,
    source       text,
    status       text,
    notes        text,
    last_contact timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
