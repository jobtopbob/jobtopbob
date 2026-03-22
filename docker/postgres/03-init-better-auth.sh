#!/bin/bash
# Pre-creates Better Auth tables so the restricted jobtopbob_app role doesn't need CREATE privileges.
# Mounted into /docker-entrypoint-initdb.d/ — runs only on first container init.
# Runs AFTER 01-init-app-role.sh, so ALTER DEFAULT PRIVILEGES grants DML automatically.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Better Auth v1.5 core tables

    CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS session_userId_idx ON "session"("userId");

    CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS account_userId_idx ON "account"("userId");

    CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);

    -- Better Auth JWT plugin table
    CREATE TABLE IF NOT EXISTS "jwks" (
        id TEXT PRIMARY KEY,
        "publicKey" TEXT NOT NULL,
        "privateKey" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP WITH TIME ZONE
    );

    -- Better Auth OIDC Provider plugin tables
    CREATE TABLE IF NOT EXISTS "oauthApplication" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        metadata TEXT,
        "clientId" TEXT NOT NULL UNIQUE,
        "clientSecret" TEXT,
        "redirectUrls" TEXT NOT NULL,
        type TEXT NOT NULL,
        disabled BOOLEAN,
        "userId" TEXT REFERENCES "user"(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "oauthApplication_userId_idx" ON "oauthApplication"("userId");

    CREATE TABLE IF NOT EXISTS "oauthAccessToken" (
        id TEXT PRIMARY KEY,
        "accessToken" TEXT NOT NULL UNIQUE,
        "refreshToken" TEXT NOT NULL UNIQUE,
        "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "clientId" TEXT NOT NULL REFERENCES "oauthApplication"("clientId") ON DELETE CASCADE,
        "userId" TEXT REFERENCES "user"(id) ON DELETE CASCADE,
        scopes TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "oauthAccessToken_clientId_idx" ON "oauthAccessToken"("clientId");
    CREATE INDEX IF NOT EXISTS "oauthAccessToken_userId_idx" ON "oauthAccessToken"("userId");

    CREATE TABLE IF NOT EXISTS "oauthConsent" (
        id TEXT PRIMARY KEY,
        "clientId" TEXT NOT NULL REFERENCES "oauthApplication"("clientId") ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        scopes TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consentGiven" BOOLEAN NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "oauthConsent_clientId_idx" ON "oauthConsent"("clientId");
    CREATE INDEX IF NOT EXISTS "oauthConsent_userId_idx" ON "oauthConsent"("userId");

    -- Seed the RxResume OAuth client so the oauthAccessToken FK constraint is satisfied.
    -- trustedClients in Better Auth config is in-memory only; the DB row must exist.
    INSERT INTO "oauthApplication" (
        id, name, icon, metadata, "clientId", "clientSecret",
        "redirectUrls", type, disabled, "userId", "createdAt", "updatedAt"
    ) VALUES (
        'rxresume-oauth-app',
        'Resume Builder',
        NULL,
        NULL,
        'rxresume',
        'rxresume-secret',
        'http://localhost:3010/api/auth/oauth2/callback/custom',
        'web',
        FALSE,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT ("clientId") DO UPDATE SET
        "clientSecret" = EXCLUDED."clientSecret",
        "redirectUrls" = EXCLUDED."redirectUrls",
        "updatedAt" = CURRENT_TIMESTAMP;
EOSQL

echo "03-init-better-auth.sh: Better Auth tables ready."
