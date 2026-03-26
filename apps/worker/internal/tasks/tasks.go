// Package tasks defines the Asynq task handlers for background job processing.
package tasks

// Task type constants.
const (
	TypeEmailProcess    = "email:process"
	TypeEmailWatchRenew = "email:watch-renew"
	TypeCompanyEnrich   = "company:enrich"
	TypeScrapeDispatch  = "scrape:dispatch"
	TypeScrapeSource    = "scrape:source"
	TypeJobExtract      = "job:extract"
	TypeJobScore        = "job:score"
)
