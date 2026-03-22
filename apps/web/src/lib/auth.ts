import { betterAuth } from "better-auth";
import { jwt, oidcProvider } from "better-auth/plugins";
import { Pool } from "pg";

const resumeBuilderPublicURL =
  process.env.RESUME_BUILDER_PUBLIC_URL ?? "http://localhost:3010";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: { enabled: true },
  plugins: [
    jwt(),
    oidcProvider({
      useJWTPlugin: true,
      loginPage: "/login",
      trustedClients: [
        {
          clientId:
            process.env.RXRESUME_OAUTH_CLIENT_ID || "rxresume",
          clientSecret:
            process.env.RXRESUME_OAUTH_CLIENT_SECRET || "rxresume-secret",
          name: "Resume Builder",
          type: "web",
          redirectUrls: [
            `${resumeBuilderPublicURL}/api/auth/oauth2/callback/custom`,
          ],
          disabled: false,
          skipConsent: true,
          metadata: null,
        },
      ],
    }),
  ],
});
