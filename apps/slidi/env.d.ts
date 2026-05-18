// Environment variable type declarations for the Slidi Next.js app.
// Database is PostgreSQL, accessed via the pg client (src/lib/db.ts).

declare namespace NodeJS {
  interface ProcessEnv {
    /** PostgreSQL connection string. e.g. postgresql://slidi:pass@tools-slidi-db:5432/slidi */
    DATABASE_URL?: string;
    /** Shared bearer token for /api/admin/* endpoints. */
    WORKER_AUTH_TOKEN?: string;
    /** 64-char hex key (32 bytes) for AES-256-GCM encryption of usernames. */
    DATA_ENCRYPTION_KEY?: string;
    /** HMAC-SHA256 secret for hashing user UUIDs before DB storage. */
    USER_ID_HMAC_SECRET?: string;
    /** Optional base path for sub-path deployment (e.g. "/slidi"). */
    NEXT_BASE_PATH?: string;
  }
}
