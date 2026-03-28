CREATE TABLE offers (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    job_id           uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
    base_salary      int,
    currency         text,
    salary_interval  text,
    sign_on_bonus    int,
    annual_bonus     text,
    equity           text,
    equity_value     int,
    equity_schedule  text,
    bonus            text,
    benefits         jsonb,
    pto_days         int,
    remote_policy    text,
    retirement_match text,
    relocation       text,
    work_location    text,
    deadline         timestamptz,
    accepted         boolean,
    negotiation_log  jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
