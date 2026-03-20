CREATE TABLE users (
    id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email      text UNIQUE NOT NULL,
    name       text,
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
