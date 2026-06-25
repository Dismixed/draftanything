/**
 * No-op stub for the `server-only` package when running Node/tsx scripts.
 * The real package throws at import time outside Next.js server components.
 */
const Module = require("module");

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
