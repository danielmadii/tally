#!/usr/bin/env node
// Usage: node scripts/hash-pin.mjs 1234  → bcrypt hash for app_user.pin_hash
import bcrypt from "bcryptjs";

const pin = process.argv[2];
if (!pin || !/^\d{4,6}$/.test(pin)) {
  console.error("Usage: node scripts/hash-pin.mjs <4-6 digit PIN>");
  process.exit(1);
}
console.log(bcrypt.hashSync(pin, 10));
