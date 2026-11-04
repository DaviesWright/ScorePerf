// Local development only: mint a bearer token for apps/hr-api from AUTH_JWT_SECRET in .dev.vars.
// Production tokens come from the identity provider (open question: BUILD.md / HANDOVER.md).
//
//   npm run token --workspace=apps/hr-api -- --role hr_director --company 1 --user 1 --ttl 3600
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith("--") ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []),
);
const company = Number(args.company ?? 1);
const user = Number(args.user ?? 1);
const role = args.role ?? "employee";
const ttl = Number(args.ttl ?? 3600);

const devVars = readFileSync(fileURLToPath(new URL("../.dev.vars", import.meta.url)), "utf8");
const secret = /^AUTH_JWT_SECRET=(.+)$/m.exec(devVars)?.[1]?.trim();
if (!secret || secret.length < 32) {
  console.error("AUTH_JWT_SECRET missing or shorter than 32 characters in apps/hr-api/.dev.vars");
  process.exit(1);
}
if (![company, user, ttl].every((n) => Number.isSafeInteger(n) && n > 0)) {
  console.error("--company, --user and --ttl must be positive integers");
  process.exit(1);
}
if (!["employee", "line_manager", "hr_admin", "hr_director"].includes(role)) {
  console.error("--role must be employee, line_manager, hr_admin or hr_director");
  process.exit(1);
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
  sub: String(user),
  company_id: company,
  role,
  iss: "scoreview-auth",
  aud: "hr-api",
  iat: now,
  exp: now + ttl,
})}`;
console.log(`${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`);
