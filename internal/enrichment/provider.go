// Package enrichment defines the interface and types for company data enrichment providers.
package enrichment

import "context"

// Result holds the data returned by an enrichment provider.
// Each field is a pointer — nil means the provider did not return this field.
type Result struct {
	Description   *string
	Industry      *string
	Size          *string
	Location      *string
	FoundedYear   *int32
	LinkedinURL   *string
	EmployeeCount *int32
	LogoURL       *string
}

// FieldsSet returns the list of field names that were populated in this result.
func (r *Result) FieldsSet() []string {
	var fields []string
	if r.Description != nil {
		fields = append(fields, "description")
	}
	if r.Industry != nil {
		fields = append(fields, "industry")
	}
	if r.Size != nil {
		fields = append(fields, "size")
	}
	if r.Location != nil {
		fields = append(fields, "location")
	}
	if r.FoundedYear != nil {
		fields = append(fields, "founded_year")
	}
	if r.LinkedinURL != nil {
		fields = append(fields, "linkedin_url")
	}
	if r.EmployeeCount != nil {
		fields = append(fields, "employee_count")
	}
	if r.LogoURL != nil {
		fields = append(fields, "logo_url")
	}
	return fields
}

// IsEmpty returns true if the provider returned no data.
func (r *Result) IsEmpty() bool {
	return len(r.FieldsSet()) == 0
}

// Provider is the interface that all enrichment sources must implement.
type Provider interface {
	// Name returns a unique identifier for this provider (e.g. "pdl", "webscrape", "favicon").
	Name() string

	// Enrich fetches company data for the given domain.
	// Returns a Result with populated fields, or an error.
	// A nil Result with nil error means the provider chose to skip (e.g. no data found).
	Enrich(ctx context.Context, domain string) (*Result, error)
}

// Accumulator merges results from multiple providers into a single combined result.
// Earlier providers take priority — a field set by provider A is not overwritten by provider B.
type Accumulator struct {
	Description   *string
	Industry      *string
	Size          *string
	Location      *string
	FoundedYear   *int32
	LinkedinURL   *string
	EmployeeCount *int32
	LogoURL       *string
}

// Merge applies a provider's result into the accumulator, filling gaps only.
// Returns the list of field names that were actually applied (not already set).
func (a *Accumulator) Merge(r *Result) []string {
	if r == nil {
		return nil
	}

	var applied []string

	if a.Description == nil && r.Description != nil {
		a.Description = r.Description
		applied = append(applied, "description")
	}
	if a.Industry == nil && r.Industry != nil {
		a.Industry = r.Industry
		applied = append(applied, "industry")
	}
	if a.Size == nil && r.Size != nil {
		a.Size = r.Size
		applied = append(applied, "size")
	}
	if a.Location == nil && r.Location != nil {
		a.Location = r.Location
		applied = append(applied, "location")
	}
	if a.FoundedYear == nil && r.FoundedYear != nil {
		a.FoundedYear = r.FoundedYear
		applied = append(applied, "founded_year")
	}
	if a.LinkedinURL == nil && r.LinkedinURL != nil {
		a.LinkedinURL = r.LinkedinURL
		applied = append(applied, "linkedin_url")
	}
	if a.EmployeeCount == nil && r.EmployeeCount != nil {
		a.EmployeeCount = r.EmployeeCount
		applied = append(applied, "employee_count")
	}
	if a.LogoURL == nil && r.LogoURL != nil {
		a.LogoURL = r.LogoURL
		applied = append(applied, "logo_url")
	}

	return applied
}

// HasGaps returns true if any core fields are still empty.
func (a *Accumulator) HasGaps() bool {
	return a.Description == nil || a.Industry == nil || a.Size == nil || a.Location == nil
}

// strPtr is a helper to create a string pointer.
func StrPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Int32Ptr is a helper to create an int32 pointer.
func Int32Ptr(v int32) *int32 {
	if v == 0 {
		return nil
	}
	return &v
}
