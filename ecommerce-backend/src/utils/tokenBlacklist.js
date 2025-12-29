// Simple in-memory token blacklist with expiry cleanup.
// Note: This is process-memory only. For multi-instance or persistent
// invalidation use Redis or a database table.

const blacklist = new Map(); // token -> expiryMillis

function _cleanup() {
  const now = Date.now();
  for (const [token, exp] of blacklist.entries()) {
    if (exp <= now) blacklist.delete(token);
  }
}

export function addToBlacklist(token, expSeconds) {
  // expSeconds is the `exp` claim from JWT (seconds since epoch)
  const expMillis = expSeconds ? expSeconds * 1000 : Date.now();
  blacklist.set(token, expMillis);
  // run a lightweight cleanup
  _cleanup();
}

export function isBlacklisted(token) {
  _cleanup();
  if (!blacklist.has(token)) return false;
  const exp = blacklist.get(token);
  return exp > Date.now();
}

export function clearBlacklist() {
  blacklist.clear();
}

export default { addToBlacklist, isBlacklisted, clearBlacklist };
