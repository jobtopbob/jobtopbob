package seed

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jobtopbob/jobtopbob/internal/storage"
)

const demoEmail = "demo@jobtopbob.com"

type stage struct {
	Name         string
	Position     int
	IsTerminal   bool
	Color        string
	MappedStatus string
}

//go:embed logos/*.svg
var logoFS embed.FS

type company struct {
	Name     string
	Website  string
	Industry string
	Size     string
	LogoFile string // filename in logos/ dir, e.g. "vercel.png"
}

type job struct {
	Title          string
	CompanyName    string
	StageName      string
	Status         string
	CloseReason    string
	Source         string
	SourceURL      string
	Location       string
	LocationType   string
	SalaryMin      int
	SalaryMax      int
	Interest       int
	DaysAgo        int
	AppliedDaysAgo int // 0 means not applied
	FollowUpDays   int // positive = days from now, 0 = no follow-up
	Tags           []string
}

var demoStages = []stage{
	{"Wishlist", 0, false, "#6B7280", "open"},
	{"Applied", 1, false, "#3B82F6", "open"},
	{"Screening", 2, false, "#8B5CF6", "open"},
	{"Interviewing", 3, false, "#F59E0B", "open"},
	{"Offer", 4, false, "#10B981", "open"},
	{"Accepted", 5, true, "#059669", "accepted"},
	{"Rejected", 6, true, "#EF4444", "rejected"},
	{"Withdrawn", 7, true, "#9CA3AF", "closed"},
}

var demoCompanies = []company{
	{"Vercel", "https://vercel.com", "Technology", "201-500", "vercel.svg"},
	{"GitHub", "https://github.com", "Technology", "1001-5000", "github.svg"},
	{"Linear", "https://linear.app", "Technology", "51-200", "linear.svg"},
	{"Stripe", "https://stripe.com", "Financial Technology", "5001-10000", "stripe.svg"},
	{"Figma", "https://figma.com", "Design Technology", "1001-5000", "figma.svg"},
	{"Datadog", "https://datadoghq.com", "Technology", "5001-10000", "datadog.svg"},
	{"Cloudflare", "https://cloudflare.com", "Technology", "1001-5000", "cloudflare.svg"},
	{"Shopify", "https://shopify.com", "E-Commerce", "10001+", "shopify.svg"},
	{"Airbnb", "https://airbnb.com", "Travel", "5001-10000", "airbnb.svg"},
	{"Twilio", "https://twilio.com", "Technology", "5001-10000", "twilio.svg"},
	{"Atlassian", "https://atlassian.com", "Technology", "5001-10000", "atlassian.svg"},
	{"HashiCorp", "https://hashicorp.com", "Technology", "1001-5000", "hashicorp.svg"},
	{"Slack", "https://slack.com", "Technology", "1001-5000", "slack.svg"},
	{"Meta", "https://meta.com", "Technology", "10001+", "meta.svg"},
	{"Coinbase", "https://coinbase.com", "Financial Technology", "1001-5000", "coinbase.svg"},
}

var demoTags = []struct {
	Name  string
	Color string
}{
	{"Remote", "#10B981"},
	{"React", "#61DAFB"},
	{"TypeScript", "#3178C6"},
	{"Senior", "#F59E0B"},
	{"Startup", "#8B5CF6"},
	{"FAANG", "#EF4444"},
}

var demoJobs = []job{
	// Wishlist (3)
	{"Staff Frontend Engineer", "Vercel", "Wishlist", "", "", "linkedin", "", "Remote", "remote", 200000, 280000, 5, 2, 0, 0, []string{"Remote", "React", "TypeScript"}},
	{"Senior Full Stack Developer", "GitHub", "Wishlist", "", "", "company_website", "", "San Francisco, CA", "onsite", 180000, 250000, 4, 5, 0, 0, []string{"React", "TypeScript"}},
	{"Principal Engineer", "Linear", "Wishlist", "", "", "referral", "", "Remote", "remote", 220000, 300000, 5, 1, 0, 0, []string{"Remote", "Startup", "TypeScript"}},

	// Applied (5)
	{"Senior Software Engineer", "Stripe", "Applied", "", "", "linkedin", "", "San Francisco, CA", "hybrid", 190000, 260000, 5, 12, 12, 0, []string{"TypeScript", "Senior"}},
	{"Frontend Engineer", "Figma", "Applied", "", "", "linkedin", "", "New York, NY", "onsite", 170000, 230000, 4, 18, 18, 0, []string{"React", "TypeScript"}},
	{"Software Engineer II", "Datadog", "Applied", "", "", "indeed", "", "Remote", "remote", 160000, 210000, 3, 8, 8, 0, []string{"Remote"}},
	{"Full Stack Engineer", "Cloudflare", "Applied", "", "", "linkedin", "", "Austin, TX", "hybrid", 150000, 200000, 3, 15, 14, 0, []string{"TypeScript"}},
	{"Senior Platform Engineer", "Shopify", "Applied", "", "", "company_website", "", "Remote", "remote", 175000, 240000, 4, 6, 5, 3, []string{"Remote", "Senior"}},

	// Interviewing (3)
	{"Staff Software Engineer", "Airbnb", "Interviewing", "", "", "referral", "", "San Francisco, CA", "onsite", 210000, 290000, 5, 22, 20, 0, []string{"Senior", "FAANG"}},
	{"Senior Backend Engineer", "Twilio", "Interviewing", "", "", "linkedin", "", "Remote", "remote", 165000, 220000, 4, 25, 24, 0, []string{"Remote", "TypeScript"}},
	{"Engineering Manager", "Atlassian", "Interviewing", "", "", "referral", "", "New York, NY", "hybrid", 200000, 270000, 5, 20, 18, 1, []string{"Senior"}},

	// Offer (2)
	{"Senior Software Engineer", "HashiCorp", "Offer", "", "", "linkedin", "", "San Francisco, CA", "hybrid", 195000, 265000, 5, 28, 27, 0, []string{"Senior", "TypeScript"}},
	{"Lead Frontend Engineer", "Slack", "Offer", "", "", "company_website", "", "Remote", "remote", 185000, 255000, 4, 26, 25, 0, []string{"Remote", "React"}},

	// Rejected (1)
	{"Software Engineer", "Meta", "Rejected", "", "rejected", "linkedin", "", "Menlo Park, CA", "onsite", 180000, 250000, 3, 29, 28, 0, []string{"FAANG"}},

	// Withdrawn (1)
	{"Senior Engineer", "Coinbase", "Withdrawn", "", "withdrawn", "indeed", "", "Remote", "remote", 170000, 230000, 3, 27, 26, 0, []string{"Remote"}},
}

// SeedDemoData inserts demo data into the database for showcasing the application.
// It requires the demo user to already exist (created by the TS seed script via Better Auth).
// It is idempotent — if the demo user already has stages, it skips seeding.
func SeedDemoData(ctx context.Context, pool *pgxpool.Pool, store *storage.Client) error {
	// Look up demo user by email (ID is assigned by Better Auth, not hardcoded)
	var demoUserID string
	err := pool.QueryRow(ctx, `SELECT id FROM "user" WHERE email = $1`, demoEmail).Scan(&demoUserID)
	if err != nil {
		slog.Warn("demo user not found — run 'pnpm --filter @jobtopbob/web seed:demo' first", "email", demoEmail)
		return nil
	}

	// Check if demo data already exists
	var stageCount int
	err = pool.QueryRow(ctx, `SELECT COUNT(*) FROM stages WHERE user_id = $1`, demoUserID).Scan(&stageCount)
	if err != nil {
		return fmt.Errorf("check existing demo data: %w", err)
	}
	if stageCount > 0 {
		slog.Info("demo data already exists, skipping seed")
		return nil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	now := time.Now()

	// 1. Insert stages and collect IDs
	stageIDs := make(map[string]string) // name -> id
	for _, s := range demoStages {
		var id string
		err = tx.QueryRow(ctx, `
			INSERT INTO stages (user_id, name, position, is_terminal, color, mapped_status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
			RETURNING id`,
			demoUserID, s.Name, s.Position, s.IsTerminal, s.Color, s.MappedStatus, now).Scan(&id)
		if err != nil {
			return fmt.Errorf("insert stage %s: %w", s.Name, err)
		}
		stageIDs[s.Name] = id
	}

	// 2. Upload company logos to storage and insert companies
	companyIDs := make(map[string]string) // name -> id
	for _, c := range demoCompanies {
		var logoURL *string
		if c.LogoFile != "" && store != nil {
			data, readErr := logoFS.ReadFile("logos/" + c.LogoFile)
			if readErr != nil {
				slog.Warn("failed to read embedded logo", "file", c.LogoFile, "error", readErr)
			} else {
				key := "logos/" + strings.ToLower(strings.ReplaceAll(c.Name, " ", "-")) + ".svg"
				url, uploadErr := store.Upload(ctx, key, bytes.NewReader(data), "image/svg+xml")
				if uploadErr != nil {
					slog.Warn("failed to upload logo", "company", c.Name, "error", uploadErr)
				} else {
					logoURL = &url
				}
			}
		}

		var id string
		err = tx.QueryRow(ctx, `
			INSERT INTO companies (user_id, name, website, industry, size, logo_url, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
			RETURNING id`,
			demoUserID, c.Name, c.Website, c.Industry, c.Size, logoURL, now).Scan(&id)
		if err != nil {
			return fmt.Errorf("insert company %s: %w", c.Name, err)
		}
		companyIDs[c.Name] = id
	}

	// 3. Insert tags and collect IDs
	tagIDs := make(map[string]string) // name -> id
	for _, t := range demoTags {
		var id string
		err = tx.QueryRow(ctx, `
			INSERT INTO tags (user_id, name, color, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $4)
			RETURNING id`,
			demoUserID, t.Name, t.Color, now).Scan(&id)
		if err != nil {
			return fmt.Errorf("insert tag %s: %w", t.Name, err)
		}
		tagIDs[t.Name] = id
	}

	// 4. Insert jobs and their taggings
	for _, j := range demoJobs {
		stageID := stageIDs[j.StageName]
		companyID := companyIDs[j.CompanyName]
		createdAt := now.Add(-time.Duration(j.DaysAgo) * 24 * time.Hour)

		var appliedAt *time.Time
		if j.AppliedDaysAgo > 0 {
			t := now.Add(-time.Duration(j.AppliedDaysAgo) * 24 * time.Hour)
			appliedAt = &t
		}

		var followUpAt *time.Time
		if j.FollowUpDays > 0 {
			t := now.Add(time.Duration(j.FollowUpDays) * 24 * time.Hour)
			followUpAt = &t
		}

		var closeReason *string
		if j.CloseReason != "" {
			closeReason = &j.CloseReason
		}

		var jobID string
		err = tx.QueryRow(ctx, `
			INSERT INTO jobs (
				user_id, company_id, stage_id, title, close_reason,
				source, location, location_type,
				salary_min, salary_max, salary_currency,
				interest, applied_at, follow_up_at, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'USD', $11, $12, $13, $14, $14)
			RETURNING id`,
			demoUserID, companyID, stageID, j.Title, closeReason,
			j.Source, j.Location, j.LocationType,
			j.SalaryMin, j.SalaryMax,
			j.Interest, appliedAt, followUpAt, createdAt).Scan(&jobID)
		if err != nil {
			return fmt.Errorf("insert job %s at %s: %w", j.Title, j.CompanyName, err)
		}

		// Insert taggings for this job
		for _, tagName := range j.Tags {
			tagID := tagIDs[tagName]
			_, err = tx.Exec(ctx, `
				INSERT INTO taggings (user_id, tag_id, entity_type, entity_id, created_at, updated_at)
				VALUES ($1, $2, 'job', $3, $4, $4)`,
				demoUserID, tagID, jobID, createdAt)
			if err != nil {
				return fmt.Errorf("insert tagging %s for job %s: %w", tagName, j.Title, err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	slog.Info("demo data seeded successfully",
		"user_id", demoUserID,
		"stages", len(demoStages),
		"companies", len(demoCompanies),
		"jobs", len(demoJobs),
		"tags", len(demoTags),
	)
	return nil
}
