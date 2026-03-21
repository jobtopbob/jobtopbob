CREATE TABLE interview_rounds (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    job_id         uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    round          int,
    type           text,
    scheduled_at   timestamptz,
    completed_at   timestamptz,
    interviewer_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
    notes          text,
    outcome        text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON interview_rounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
