import { betterAuth } from "better-auth";
import { jwt, oidcProvider } from "better-auth/plugins";
import { Pool } from "pg";

const resumeBuilderPublicURL =
  process.env.RESUME_BUILDER_PUBLIC_URL ?? "http://localhost:3010";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [resumeBuilderPublicURL],
  advanced: {
    // Unique prefix prevents cookie collision with RxResume on the same
    // localhost domain (browsers share cookies across ports).
    cookiePrefix: "jobtopbob",
    useSecureCookies: false, // localhost is HTTP; flip to true in production
  },
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
