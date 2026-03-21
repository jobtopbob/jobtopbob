CREATE TABLE tags (
    id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name       text,
    color      text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE taggings (
    user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id   uuid NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON taggings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
