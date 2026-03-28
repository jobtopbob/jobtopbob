CREATE TABLE email_events (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    job_id           uuid REFERENCES jobs(id) ON DELETE SET NULL,
    gmail_message_id text,
    detected_type    text,
    confidence       float,
    confirmed        boolean,
    raw_snippet      text,
    company_name     text,
    from_email       text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON email_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
