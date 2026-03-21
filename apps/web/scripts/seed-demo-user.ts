/**
 * Creates the demo user via Better Auth's internal API.
 * This ensures the password is hashed with the correct algorithm (scrypt by default).
 *
 * Usage: pnpm --filter @jobtopbob/web seed:demo
 *
 * Requires DATABASE_URL to be set (same DB as the web app).
 * Idempotent — skips if the demo user already exists with an account.
 */

import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

const DEMO_EMAIL = "demo@jobtopbob.com";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Demo User";

// Seed needs superuser (Better Auth may create tables).
// Prefer MIGRATION_DATABASE_URL, fall back to DATABASE_URL, then dev default.
const databaseURL =
  process.env.MIGRATION_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgres://postgres:changeme@localhost:5432/jobtopbob?sslmode=disable";

const pool = new Pool({ connectionString: databaseURL });

const auth = betterAuth({
  baseURL: "http://localhost:3000",
  database: pool,
  emailAndPassword: { enabled: true },
  plugins: [jwt()],
});

async function main() {
  // Check if the demo account (with password hash) already exists.
  // A user row alone isn't enough for login — Better Auth needs the account row.
  const { rows: accountRows } = await pool.query(
    `SELECT a.id FROM "account" a JOIN "user" u ON u.id = a."userId"
     WHERE u.email = $1 AND a."providerId" = 'credential'`,
    [DEMO_EMAIL]
  );

  if (accountRows.length > 0) {
    console.log("Demo user account already exists, skipping.");
    await pool.end();
    return;
  }

  // Remove any orphaned user row (e.g. from Go seed) so signUpEmail can
  // create both user + account cleanly. CASCADE removes related app data,
  // which the Go seed will re-create.
  await pool.query(`DELETE FROM "user" WHERE email = $1`, [DEMO_EMAIL]);

  // Create demo user via Better Auth (handles password hashing correctly).
  // Better Auth generates its own user ID — the Go seed looks up by email.
  const result = await auth.api.signUpEmail({
    body: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: DEMO_NAME,
    },
  });

  if (!result?.user) {
    console.error("Failed to create demo user:", result);
    process.exit(1);
  }

  console.log(`Demo user created (id: ${result.user.id}): ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
