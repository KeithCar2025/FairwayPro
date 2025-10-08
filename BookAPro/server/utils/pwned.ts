import crypto from "crypto";
import fetch from "node-fetch";

/**
 * checkPwnedCount(password)
 * Uses HaveIBeenPwned Pwned Passwords k-anonymity API.
 * Returns the number of times the password was seen in breaches (0 = not found).
 */
export async function checkPwnedCount(password: string): Promise<number> {
  if (!password) return 0;
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "User-Agent": "FairwayPro" },
  });

  if (!res.ok) {
    // Fail-open: if HIBP is unavailable, we return 0 but log and optionally treat as configurable
    console.warn("HIBP request failed:", res.statusText);
    return 0;
  }

  const body = await res.text();
  for (const line of body.split("\n")) {
    const [hashSuffix, countStr] = line.split(":");
    if (!hashSuffix) continue;
    if (hashSuffix.trim() === suffix) {
      return parseInt((countStr || "0").trim(), 10);
    }
  }

  return 0;
}