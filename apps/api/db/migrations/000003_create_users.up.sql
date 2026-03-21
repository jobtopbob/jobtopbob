-- Better Auth tables — pre-created by migrations so Better Auth only needs DML.
-- Uses IF NOT EXISTS to handle the case where Better Auth starts before migrations.
-- Schema matches Better Auth v1.5 defaults (camelCase columns).
-- DO NOT rename columns or add triggers — Better Auth owns these tables.

CREATE TABLE IF NOT EXISTS "user" (
    id              text PRIMARY KEY,
    name            text NOT NULL,
    email           varchar(255) UNIQUE NOT NULL,
    "emailVerified" boolean NOT NULL DEFAULT false,
    image           text,
    "createdAt"     timestamptz NOT NULL DEFAULT now(),
    "updatedAt"     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session (
    id          text PRIMARY KEY,
    "expiresAt" timestamptz NOT NULL,
    token       text UNIQUE NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    "ipAddress" text,
    "userAgent" text,
    "userId"    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_userid_idx ON session("userId");
CREATE INDEX IF NOT EXISTS session_token_idx ON session(token);

CREATE TABLE IF NOT EXISTS account (
    id                      text PRIMARY KEY,
    "accountId"             text NOT NULL,
    "providerId"            text NOT NULL,
    "userId"                text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken"           text,
    "refreshToken"          text,
    "idToken"               text,
    "accessTokenExpiresAt"  timestamptz,
    "refreshTokenExpiresAt" timestamptz,
    scope                   text,
    password                text,
    "createdAt"             timestamptz NOT NULL DEFAULT now(),
    "updatedAt"             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_userid_idx ON account("userId");

CREATE TABLE IF NOT EXISTS verification (
    id          text PRIMARY KEY,
    identifier  text NOT NULL,
    value       text NOT NULL,
    "expiresAt" timestamptz NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);

CREATE TABLE IF NOT EXISTS jwks (
    id           text PRIMARY KEY,
    "publicKey"  text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt"  timestamptz NOT NULL DEFAULT now(),
    "expiresAt"  timestamptz
);
