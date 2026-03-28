package seed

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"log/slog"
	"net/url"
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
	Title              string
	CompanyName        string
	StageName          string
	Status             string
	CloseReason        string
	Source             string
	SourceURL          string
	Location           string
	LocationType       string
	SalaryMin          int
	SalaryMax          int
	SalaryInterval     string // "annual", "monthly", "hourly" (empty = annual)
	Interest           int
	MonthOffset        int // -3 to +3 relative to current month (0 = this month)
	DayOfMonth         int // 1-28 (safe for all months)
	AppliedMonthOffset int // month offset for applied_at (ignored if AppliedDayOfMonth == 0)
	AppliedDayOfMonth  int // 0 means not applied
	FollowUpDays       int // positive = days from now, 0 = no follow-up
	DeadlineDays       int // positive = days from now, negative = days ago, 0 = no deadline
	JobType            string // "full_time", "part_time", "contract", "internship", etc.
	JobLevel           string // "intern", "entry", "mid", "senior", "lead", "manager", etc.
	ApplicationURL     string
	ExperienceRange    string // "3-5 years", "5+ years", etc.
	Tags               []string
	// Offer fields (only for jobs in Offer stage)
	OfferBaseSalary    int
	OfferCurrency      string
	OfferSalaryInterval string
	OfferSignOnBonus   int
	OfferAnnualBonus   string
	OfferEquity        string
	OfferEquityValue   int
	OfferEquitySchedule string
	OfferBonus         string
	OfferPtoDays       int
	OfferRemotePolicy  string
	OfferRetirementMatch string
	OfferRelocation    string
	OfferWorkLocation  string
	OfferDeadlineDays  int // positive = days from now
}

var demoStages = []stage{
	{"Yet to Apply", 0, false, "#6B7280", "open"},
	{"Applied", 1, false, "#3B82F6", "open"},
	{"Screening", 2, false, "#8B5CF6", "open"},
	{"Interviewing", 3, false, "#F59E0B", "open"},
	{"Offer", 4, false, "#10B981", "offer"},
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

type contact struct {
	Name        string
	CompanyName string // matches company in demoCompanies
	Role        string
	Email       string
	LinkedInURL string
	Source      string
	Status      string
	Notes       string
	DaysAgo     int // last_contact = now - DaysAgo
}

type resource struct {
	Title       string
	URL         string
	Type        string // "link", "note", "file"
	Category    string
	Description string
	Content     string
	Pinned      bool
}

var demoContacts = []contact{
	{
		Name: "Sarah Chen", CompanyName: "Stripe", Role: "Engineering Manager",
		Email: "sarah.chen@stripe.com", LinkedInURL: "https://linkedin.com/in/sarahchen",
		Source: "referral", Status: "active",
		Notes: "Met at StrangeLoop 2025. Open to referring for senior roles.", DaysAgo: 3,
	},
	{
		Name: "James Rodriguez", CompanyName: "Vercel", Role: "Staff Engineer",
		Email: "james.r@vercel.com", LinkedInURL: "https://linkedin.com/in/jamesrodriguez",
		Source: "linkedin", Status: "active",
		Notes: "DM'd on Twitter about the Staff Frontend role. Very responsive.", DaysAgo: 7,
	},
	{
		Name: "Emily Park", CompanyName: "Airbnb", Role: "Senior Recruiter",
		Email: "emily.park@airbnb.com", LinkedInURL: "https://linkedin.com/in/emilypark",
		Source: "linkedin", Status: "active",
		Notes: "Reached out about Staff SWE position. Scheduled phone screen.", DaysAgo: 1,
	},
	{
		Name: "Michael Torres", CompanyName: "Figma", Role: "Tech Lead",
		Email: "m.torres@figma.com", LinkedInURL: "https://linkedin.com/in/michaeltorres",
		Source: "referral", Status: "active",
		Notes: "Former coworker from Acme Corp. Can provide internal referral.", DaysAgo: 14,
	},
	{
		Name: "Priya Sharma", CompanyName: "GitHub", Role: "Director of Engineering",
		Email: "priya.sharma@github.com", LinkedInURL: "https://linkedin.com/in/priyasharma",
		Source: "conference", Status: "active",
		Notes: "Connected at ReactConf. Mentioned upcoming senior roles on her team.", DaysAgo: 21,
	},
	{
		Name: "Alex Kim", CompanyName: "Linear", Role: "Founding Engineer",
		Email: "alex@linear.app", LinkedInURL: "https://linkedin.com/in/alexkim",
		Source: "twitter", Status: "active",
		Notes: "Engaged with their open-source work. Warm intro possible.", DaysAgo: 10,
	},
	{
		Name: "Rachel Green", CompanyName: "HashiCorp", Role: "HR Business Partner",
		Email: "rachel.green@hashicorp.com", LinkedInURL: "https://linkedin.com/in/rachelgreen",
		Source: "linkedin", Status: "replied",
		Notes: "Handling my offer negotiation. Very professional and transparent.", DaysAgo: 2,
	},
	{
		Name: "David Liu", CompanyName: "Atlassian", Role: "VP of Engineering",
		Email: "david.liu@atlassian.com", LinkedInURL: "https://linkedin.com/in/davidliu",
		Source: "referral", Status: "active",
		Notes: "Referred by a mutual friend. Looking for EM candidates for NY office.", DaysAgo: 5,
	},
}

var demoResources = []resource{
	{
		Title: "System Design Interview Guide", URL: "https://github.com/donnemartin/system-design-primer",
		Type: "link", Category: "Interview Prep", Pinned: true,
		Description: "Comprehensive system design interview prep with real-world examples",
	},
	{
		Title: "Negotiation Tips from levels.fyi", URL: "https://www.levels.fyi/blog/salary-negotiation-tips.html",
		Type: "link", Category: "Negotiation", Pinned: true,
		Description: "Data-driven salary negotiation strategies for tech roles",
	},
	{
		Title: "My STAR Stories", Type: "note", Category: "Interview Prep", Pinned: true,
		Description: "Behavioral interview answers using the STAR format",
		Content: "Leadership: Led migration of monolith to microservices, reducing deploy time by 80%.\n\nConflict: Disagreed with PM on scope — proposed phased rollout that satisfied both eng and product.\n\nFailure: Pushed a bad config change to prod. Built automated rollback system afterward.",
	},
	{
		Title: "Blind — TC Negotiation Thread", URL: "https://www.teamblind.com/post/Negotiation-tips",
		Type: "link", Category: "Negotiation",
		Description: "Community thread with real negotiation outcomes at FAANG companies",
	},
	{
		Title: "Neetcode 150", URL: "https://neetcode.io/practice",
		Type: "link", Category: "Interview Prep", Pinned: false,
		Description: "Curated list of LeetCode problems organized by pattern",
	},
	{
		Title: "Company Research Template", Type: "note", Category: "Research",
		Description: "Template for researching companies before interviews",
		Content: "1. Mission & Values\n2. Recent funding / IPO status\n3. Engineering blog posts\n4. Glassdoor reviews (eng team)\n5. Tech stack & open source contributions\n6. Recent product launches\n7. Key competitors",
	},
	{
		Title: "Questions to Ask Interviewers", Type: "note", Category: "Interview Prep",
		Description: "Strong questions to ask at the end of interviews",
		Content: "- What does the onboarding process look like for new engineers?\n- How do you measure success for this role in the first 6 months?\n- What's the biggest technical challenge the team is facing right now?\n- How does the team handle technical debt vs feature work?\n- What does the promotion process look like?",
	},
	{
		Title: "Remote Job Boards List", URL: "https://github.com/remoteintech/remote-jobs",
		Type: "link", Category: "Job Search",
		Description: "Curated list of companies with fully remote positions",
	},
}

var demoJobs = []job{
	// --- 3 months ago: closed applications ---
	{
		Title: "Software Engineer", CompanyName: "Meta", StageName: "Rejected", CloseReason: "rejected",
		Source: "linkedin", Location: "Menlo Park, CA", LocationType: "onsite",
		SalaryMin: 180000, SalaryMax: 250000, Interest: 3,
		MonthOffset: -3, DayOfMonth: 5, AppliedMonthOffset: -3, AppliedDayOfMonth: 8,
		JobType: "full_time", JobLevel: "mid", ExperienceRange: "2-4 years",
		Tags: []string{"FAANG"},
	},
	{
		Title: "Senior Engineer", CompanyName: "Coinbase", StageName: "Withdrawn", CloseReason: "withdrawn",
		Source: "indeed", Location: "Remote", LocationType: "remote",
		SalaryMin: 170000, SalaryMax: 230000, Interest: 3,
		MonthOffset: -3, DayOfMonth: 18, AppliedMonthOffset: -3, AppliedDayOfMonth: 20,
		JobType: "full_time", JobLevel: "senior", ExperienceRange: "5+ years",
		Tags: []string{"Remote"},
	},

	// --- 2 months ago: offers and late-stage interviews ---
	{
		Title: "Senior Software Engineer", CompanyName: "HashiCorp", StageName: "Offer",
		Source: "linkedin", Location: "San Francisco, CA", LocationType: "hybrid",
		SalaryMin: 195000, SalaryMax: 265000, Interest: 5,
		MonthOffset: -2, DayOfMonth: 3, AppliedMonthOffset: -2, AppliedDayOfMonth: 6,
		JobType: "full_time", JobLevel: "senior", ExperienceRange: "5-8 years",
		Tags:            []string{"Senior", "TypeScript"},
		OfferBaseSalary: 230000, OfferCurrency: "USD", OfferSalaryInterval: "annual",
		OfferSignOnBonus: 25000, OfferAnnualBonus: "15%",
		OfferEquity: "0.05% over 4 years", OfferEquityValue: 200000, OfferEquitySchedule: "4 years, 1 year cliff",
		OfferBonus: "$25,000 signing", OfferPtoDays: 25,
		OfferRemotePolicy: "hybrid", OfferRetirementMatch: "100% up to 6%",
		OfferRelocation: "$10,000 relocation stipend", OfferWorkLocation: "San Francisco, CA",
		OfferDeadlineDays: 14,
	},
	{
		Title: "Lead Frontend Engineer", CompanyName: "Slack", StageName: "Offer",
		Source: "company_website", Location: "Remote", LocationType: "remote",
		SalaryMin: 185000, SalaryMax: 255000, Interest: 4,
		MonthOffset: -2, DayOfMonth: 12, AppliedMonthOffset: -2, AppliedDayOfMonth: 15,
		JobType: "full_time", JobLevel: "lead", ExperienceRange: "6-10 years",
		Tags:            []string{"Remote", "React"},
		OfferBaseSalary: 220000, OfferCurrency: "USD", OfferSalaryInterval: "annual",
		OfferSignOnBonus: 20000, OfferAnnualBonus: "10%",
		OfferEquity: "0.03% over 4 years", OfferEquityValue: 150000, OfferEquitySchedule: "4 years, 1 year cliff",
		OfferBonus: "$20,000 signing", OfferPtoDays: 20,
		OfferRemotePolicy: "remote", OfferRetirementMatch: "50% up to 6%",
		OfferWorkLocation: "Remote",
		OfferDeadlineDays: 10,
	},
	{
		Title: "Staff Software Engineer", CompanyName: "Airbnb", StageName: "Interviewing",
		Source: "referral", Location: "San Francisco, CA", LocationType: "onsite",
		SalaryMin: 210000, SalaryMax: 290000, Interest: 5,
		MonthOffset: -2, DayOfMonth: 20, AppliedMonthOffset: -2, AppliedDayOfMonth: 22,
		JobType: "full_time", JobLevel: "senior", ExperienceRange: "8+ years",
		Tags: []string{"Senior", "FAANG"},
	},

	// --- 1 month ago: active applications and interviews ---
	{
		Title: "Senior Backend Engineer", CompanyName: "Twilio", StageName: "Interviewing",
		Source: "linkedin", Location: "Remote", LocationType: "remote",
		SalaryMin: 165000, SalaryMax: 220000, Interest: 4,
		MonthOffset: -1, DayOfMonth: 4, AppliedMonthOffset: -1, AppliedDayOfMonth: 7,
		JobType: "full_time", JobLevel: "senior", ExperienceRange: "5-7 years",
		Tags: []string{"Remote", "TypeScript"},
	},
	{
		Title: "Engineering Manager", CompanyName: "Atlassian", StageName: "Interviewing",
		Source: "referral", Location: "New York, NY", LocationType: "hybrid",
		SalaryMin: 200000, SalaryMax: 270000, Interest: 5,
		MonthOffset: -1, DayOfMonth: 10, AppliedMonthOffset: -1, AppliedDayOfMonth: 14, FollowUpDays: 5,
		JobType: "full_time", JobLevel: "manager", ExperienceRange: "8+ years",
		Tags: []string{"Senior"},
	},
	{
		Title: "Senior Software Engineer", CompanyName: "Stripe", StageName: "Applied",
		Source: "linkedin", Location: "San Francisco, CA", LocationType: "hybrid",
		SalaryMin: 190000, SalaryMax: 260000, Interest: 5,
		MonthOffset: -1, DayOfMonth: 18, AppliedMonthOffset: -1, AppliedDayOfMonth: 18,
		DeadlineDays: 14, JobType: "full_time", JobLevel: "senior", ExperienceRange: "5-8 years",
		ApplicationURL: "https://stripe.com/jobs/listing/senior-software-engineer",
		Tags: []string{"TypeScript", "Senior"},
	},
	{
		Title: "Frontend Engineer", CompanyName: "Figma", StageName: "Applied",
		Source: "linkedin", Location: "New York, NY", LocationType: "onsite",
		SalaryMin: 170000, SalaryMax: 230000, Interest: 4,
		MonthOffset: -1, DayOfMonth: 25, AppliedMonthOffset: -1, AppliedDayOfMonth: 26,
		JobType: "full_time", JobLevel: "mid", ExperienceRange: "3-5 years",
		Tags: []string{"React", "TypeScript"},
	},

	// --- Current month: recent activity ---
	{
		Title: "Software Engineer II", CompanyName: "Datadog", StageName: "Applied",
		Source: "indeed", Location: "Remote", LocationType: "remote",
		SalaryMin: 160000, SalaryMax: 210000, Interest: 3,
		MonthOffset: 0, DayOfMonth: 3, AppliedMonthOffset: 0, AppliedDayOfMonth: 5,
		DeadlineDays: 21, JobType: "full_time", JobLevel: "mid", ExperienceRange: "2-5 years",
		Tags: []string{"Remote"},
	},
	{
		Title: "Full Stack Engineer", CompanyName: "Cloudflare", StageName: "Applied",
		Source: "linkedin", Location: "Austin, TX", LocationType: "hybrid",
		SalaryMin: 150000, SalaryMax: 200000, Interest: 3,
		MonthOffset: 0, DayOfMonth: 8, AppliedMonthOffset: 0, AppliedDayOfMonth: 10,
		JobType: "full_time", JobLevel: "mid", ExperienceRange: "3-5 years",
		Tags: []string{"TypeScript"},
	},
	{
		Title: "Senior Platform Engineer", CompanyName: "Shopify", StageName: "Applied",
		Source: "company_website", Location: "Remote", LocationType: "remote",
		SalaryMin: 175000, SalaryMax: 240000, Interest: 4,
		MonthOffset: 0, DayOfMonth: 12, AppliedMonthOffset: 0, AppliedDayOfMonth: 14, FollowUpDays: 3,
		DeadlineDays: 10, JobType: "full_time", JobLevel: "senior", ExperienceRange: "5+ years",
		ApplicationURL: "https://shopify.com/careers/senior-platform-engineer",
		Tags: []string{"Remote", "Senior"},
	},

	// --- 1 month from now: upcoming targets ---
	{
		Title: "Staff Frontend Engineer", CompanyName: "Vercel", StageName: "Yet to Apply",
		Source: "linkedin", Location: "Remote", LocationType: "remote",
		SalaryMin: 200000, SalaryMax: 280000, Interest: 5,
		MonthOffset: 1, DayOfMonth: 5,
		DeadlineDays: 45, JobType: "full_time", JobLevel: "senior", ExperienceRange: "7+ years",
		ApplicationURL: "https://vercel.com/careers/staff-frontend-engineer",
		Tags: []string{"Remote", "React", "TypeScript"},
	},
	{
		Title: "Senior Full Stack Developer", CompanyName: "GitHub", StageName: "Yet to Apply",
		Source: "company_website", Location: "San Francisco, CA", LocationType: "onsite",
		SalaryMin: 180000, SalaryMax: 250000, Interest: 4,
		MonthOffset: 1, DayOfMonth: 18,
		DeadlineDays: 30, JobType: "full_time", JobLevel: "senior", ExperienceRange: "5-8 years",
		Tags: []string{"React", "TypeScript"},
	},

	// --- 2 months from now: future targets ---
	{
		Title: "Principal Engineer", CompanyName: "Linear", StageName: "Yet to Apply",
		Source: "referral", Location: "Remote", LocationType: "remote",
		SalaryMin: 220000, SalaryMax: 300000, Interest: 5,
		MonthOffset: 2, DayOfMonth: 10,
		JobType: "full_time", JobLevel: "lead", ExperienceRange: "10+ years",
		Tags: []string{"Remote", "Startup", "TypeScript"},
	},

	// --- Contract/non-standard jobs for variety ---
	{
		Title: "Contract React Developer", CompanyName: "Shopify", StageName: "Applied",
		Source: "linkedin", Location: "Remote", LocationType: "remote",
		SalaryMin: 85, SalaryMax: 120, SalaryInterval: "hourly", Interest: 3,
		MonthOffset: 0, DayOfMonth: 15, AppliedMonthOffset: 0, AppliedDayOfMonth: 16,
		DeadlineDays: 7, JobType: "contract", JobLevel: "senior", ExperienceRange: "5+ years",
		Tags: []string{"Remote", "React"},
	},
}

// dateInMonth returns a date in the month offset from now, on the given day (1-28).
func dateInMonth(now time.Time, monthOffset, day int) time.Time {
	return time.Date(now.Year(), now.Month()+time.Month(monthOffset), day, 9, 0, 0, 0, now.Location())
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

	// Check if demo data already exists by looking for demo jobs (not stages,
	// since default stages are auto-created on first ListStages call).
	var jobCount int
	checkTx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin check transaction: %w", err)
	}
	_, err = checkTx.Exec(ctx, fmt.Sprintf("SET LOCAL app.current_user_id = '%s'", demoUserID))
	if err != nil {
		_ = checkTx.Rollback(ctx)
		return fmt.Errorf("set current_user_id for check: %w", err)
	}
	err = checkTx.QueryRow(ctx, `SELECT COUNT(*) FROM jobs WHERE user_id = $1`, demoUserID).Scan(&jobCount)
	_ = checkTx.Rollback(ctx) // read-only, no need to commit
	if err != nil {
		return fmt.Errorf("check existing demo data: %w", err)
	}
	if jobCount > 0 {
		slog.Info("demo data already exists, skipping seed")
		return nil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Set the RLS context so INSERT policies (user_id = current_user_id()) pass.
	// The pool connects as jobtopbob_app which is subject to RLS.
	_, err = tx.Exec(ctx, fmt.Sprintf("SET LOCAL app.current_user_id = '%s'", demoUserID))
	if err != nil {
		return fmt.Errorf("set current_user_id for seed: %w", err)
	}

	now := time.Now()

	// 1. Collect existing stage IDs (stages may already exist from default seeding),
	//    then insert any missing ones.
	stageIDs := make(map[string]string) // name -> id
	rows, err := tx.Query(ctx, `SELECT id, name FROM stages WHERE user_id = $1`, demoUserID)
	if err != nil {
		return fmt.Errorf("query existing stages: %w", err)
	}
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			rows.Close()
			return fmt.Errorf("scan existing stage: %w", err)
		}
		stageIDs[name] = id
	}
	rows.Close()

	for _, s := range demoStages {
		if _, exists := stageIDs[s.Name]; exists {
			continue
		}
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

		// Extract domain from website for dedup index
		domain := extractDomainFromURL(c.Website)

		var id string
		err = tx.QueryRow(ctx, `
			INSERT INTO companies (user_id, name, domain, website, industry, size, logo_url, data_source, enrichment_status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', 'none', $8, $8)
			RETURNING id`,
			demoUserID, c.Name, domain, c.Website, c.Industry, c.Size, logoURL, now).Scan(&id)
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
		createdAt := dateInMonth(now, j.MonthOffset, j.DayOfMonth)

		var appliedAt *time.Time
		if j.AppliedDayOfMonth > 0 {
			t := dateInMonth(now, j.AppliedMonthOffset, j.AppliedDayOfMonth)
			appliedAt = &t
		}

		var followUpAt *time.Time
		if j.FollowUpDays > 0 {
			t := now.Add(time.Duration(j.FollowUpDays) * 24 * time.Hour)
			followUpAt = &t
		}

		var deadline *time.Time
		if j.DeadlineDays != 0 {
			t := now.Add(time.Duration(j.DeadlineDays) * 24 * time.Hour)
			deadline = &t
		}

		var closeReason *string
		if j.CloseReason != "" {
			closeReason = &j.CloseReason
		}

		salaryInterval := j.SalaryInterval
		if salaryInterval == "" {
			salaryInterval = "annual"
		}

		var jobType, jobLevel, applicationURL, experienceRange *string
		if j.JobType != "" {
			jobType = &j.JobType
		}
		if j.JobLevel != "" {
			jobLevel = &j.JobLevel
		}
		if j.ApplicationURL != "" {
			applicationURL = &j.ApplicationURL
		}
		if j.ExperienceRange != "" {
			experienceRange = &j.ExperienceRange
		}

		var jobID string
		err = tx.QueryRow(ctx, `
			INSERT INTO jobs (
				user_id, company_id, stage_id, title, close_reason,
				source, location, location_type,
				salary_min, salary_max, salary_currency, salary_interval,
				interest, applied_at, follow_up_at, deadline,
				job_type, job_level, application_url, experience_range,
				created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'USD', $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20)
			RETURNING id`,
			demoUserID, companyID, stageID, j.Title, closeReason,
			j.Source, j.Location, j.LocationType,
			j.SalaryMin, j.SalaryMax, salaryInterval,
			j.Interest, appliedAt, followUpAt, deadline,
			jobType, jobLevel, applicationURL, experienceRange,
			createdAt).Scan(&jobID)
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

		// Insert offer record for jobs in the Offer stage
		if j.OfferBaseSalary > 0 {
			var offerDeadline *time.Time
			if j.OfferDeadlineDays > 0 {
				t := now.Add(time.Duration(j.OfferDeadlineDays) * 24 * time.Hour)
				offerDeadline = &t
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO offers (
					user_id, job_id, base_salary, currency, salary_interval,
					sign_on_bonus, annual_bonus, equity, equity_value, equity_schedule,
					bonus, pto_days, remote_policy, retirement_match, relocation,
					work_location, deadline, created_at, updated_at
				) VALUES (
					$1, $2, $3, $4, $5,
					$6, $7, $8, $9, $10,
					$11, $12, $13, $14, $15,
					$16, $17, $18, $18
				)`,
				demoUserID, jobID, j.OfferBaseSalary, j.OfferCurrency, nilIfEmpty(j.OfferSalaryInterval),
				nilIfZero(j.OfferSignOnBonus), nilIfEmpty(j.OfferAnnualBonus), nilIfEmpty(j.OfferEquity), nilIfZero(j.OfferEquityValue), nilIfEmpty(j.OfferEquitySchedule),
				nilIfEmpty(j.OfferBonus), nilIfZero(j.OfferPtoDays), nilIfEmpty(j.OfferRemotePolicy), nilIfEmpty(j.OfferRetirementMatch), nilIfEmpty(j.OfferRelocation),
				nilIfEmpty(j.OfferWorkLocation), offerDeadline, createdAt)
			if err != nil {
				return fmt.Errorf("insert offer for job %s: %w", j.Title, err)
			}
		}
	}

	// 5. Insert contacts
	for _, c := range demoContacts {
		var companyID *string
		if c.CompanyName != "" {
			if id, ok := companyIDs[c.CompanyName]; ok {
				companyID = &id
			}
		}

		var lastContact *time.Time
		if c.DaysAgo > 0 {
			t := now.Add(-time.Duration(c.DaysAgo) * 24 * time.Hour)
			lastContact = &t
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO contacts (user_id, company_id, name, role, email, linkedin_url, source, status, notes, last_contact, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
			demoUserID, companyID, c.Name, nilIfEmpty(c.Role), nilIfEmpty(c.Email),
			nilIfEmpty(c.LinkedInURL), nilIfEmpty(c.Source), nilIfEmpty(c.Status),
			nilIfEmpty(c.Notes), lastContact, now)
		if err != nil {
			return fmt.Errorf("insert contact %s: %w", c.Name, err)
		}
	}

	// 6. Insert resources
	for _, r := range demoResources {
		_, err = tx.Exec(ctx, `
			INSERT INTO resources (user_id, title, url, type, category, description, content, pinned, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
			demoUserID, r.Title, nilIfEmpty(r.URL), r.Type, nilIfEmpty(r.Category),
			nilIfEmpty(r.Description), nilIfEmpty(r.Content), r.Pinned, now)
		if err != nil {
			return fmt.Errorf("insert resource %s: %w", r.Title, err)
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
		"contacts", len(demoContacts),
		"resources", len(demoResources),
	)
	return nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nilIfZero(n int) *int {
	if n == 0 {
		return nil
	}
	return &n
}

// extractDomainFromURL normalizes a URL to its bare domain (e.g. "https://www.stripe.com/" → "stripe.com").
func extractDomainFromURL(rawURL string) *string {
	if rawURL == "" {
		return nil
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil
	}
	host := u.Hostname()
	host = strings.ToLower(host)
	host = strings.TrimPrefix(host, "www.")
	if host == "" {
		return nil
	}
	return &host
}
