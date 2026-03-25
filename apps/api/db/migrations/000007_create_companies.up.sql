CREATE TABLE companies (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name              text NOT NULL,
    domain            text,
    website           text,
    description       text,
    industry          text,
    size              text,
    location          text,
    founded_year      int,
    linkedin_url      text,
    employee_count    int,
    interest          int,
    notes             text,
    logo_url          text,
    data_source       text NOT NULL DEFAULT 'manual',
    enrichment_status text NOT NULL DEFAULT 'none',
    last_enriched_at  timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_companies_user_domain
    ON companies (user_id, domain) WHERE domain IS NOT NULL;

CREATE INDEX idx_companies_user_name_lower
    ON companies (user_id, lower(name));

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tracks which enrichment providers contributed data to each company.
CREATE TABLE enrichment_logs (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    provider     text NOT NULL,                  -- e.g. "pdl", "webscrape", "favicon"
    status       text NOT NULL DEFAULT 'success', -- 'success', 'failed', 'skipped'
    fields_set   text[],                         -- columns this provider populated, e.g. {"industry","size"}
    error        text,                           -- error message if status = 'failed'
    raw_response jsonb,                          -- optional: cached provider response for debugging
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrichment_logs_company ON enrichment_logs (company_id);
CREATE INDEX idx_enrichment_logs_user_provider ON enrichment_logs (user_id, provider);
