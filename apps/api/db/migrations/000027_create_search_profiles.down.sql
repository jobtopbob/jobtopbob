ALTER TABLE scrape_runs DROP CONSTRAINT IF EXISTS fk_scrape_runs_search_profile;
DROP TABLE IF EXISTS search_profiles;
