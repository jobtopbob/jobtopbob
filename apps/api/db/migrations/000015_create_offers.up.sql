CREATE TABLE offers (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id          uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
    base_salary     int,
    currency        text,
    equity          text,
    bonus           text,
    benefits        jsonb,
    deadline        timestamptz,
    accepted        boolean,
    negotiation_log jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
