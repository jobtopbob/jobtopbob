CREATE TABLE resumes (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name             text NOT NULL,
    rxresume_id      text,
    is_base          boolean,
    -- Synced fields from RxResume
    template         text,
    headline         text,
    full_name        text,
    email            text,
    picture_url      text,
    latest_role      text,
    primary_color    text,
    experience_count int NOT NULL DEFAULT 0,
    education_count  int NOT NULL DEFAULT 0,
    skills_count     int NOT NULL DEFAULT 0,
    projects_count   int NOT NULL DEFAULT 0,
    certs_count      int NOT NULL DEFAULT 0,
    top_skills       text[],
    synced_at        timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
