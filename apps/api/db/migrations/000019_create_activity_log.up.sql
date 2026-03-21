CREATE TABLE activity_log (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    entity_type text,
    entity_id   uuid,
    action      text,
    old_value   jsonb,
    new_value   jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- No updated_at trigger: activity_log is append-only
