// Stub for `server-only` package in test environments.
// The real package throws at import time if used in a non-server context;
// this no-op stub lets vitest (which runs in Node.js) import server-side
// modules without triggering that guard.
export {};
