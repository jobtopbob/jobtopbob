CREATE TABLE stages (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name          text NOT NULL,
    position      int NOT NULL,
    is_terminal   boolean,
    color         text,
    mapped_status text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
