CREATE TABLE user_settings (
    user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ai_provider   text,
    ai_model      text,
    writing_style text,
    weekly_goal   int,
    task_models   jsonb,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
