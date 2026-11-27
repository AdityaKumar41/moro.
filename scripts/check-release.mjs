import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const files = execFileSync("git", ["ls-files", "--cached", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const examples = new Set([".env.example", ".env.integration.example"]);
const privatePath =
  /(^|\/)(?:node_modules|\.next|\.vercel|tmp|backups|output|coverage|test-results|playwright-report)(\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:pem|key|p12|pfx|log|tsbuildinfo|pdf)$/i;
const credentialPatterns = [
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g,
  /\bwhsec_[A-Za-z0-9]{20,}\b/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/g,
];
const failures = [];
for (const file of files) {
  if (privatePath.test(file) && !examples.has(file)) {
    failures.push(`${file}: private/generated file in source release`);
    continue;
  }
  const bytes = execFileSync("git", ["show", ":" + file], {
    maxBuffer: 16 * 1024 * 1024,
  });
  if (bytes.length > 8 * 1024 * 1024)
    failures.push(`${file}: exceeds 8 MiB source asset budget`);
  if (
    !/\.(?:[cm]?[jt]sx?|json|md|ya?ml|sql|css|html|toml|txt)$/.test(file) &&
    !examples.has(file)
  )
    continue;
  const source = bytes.toString("utf8");
  for (const rule of credentialPatterns) {
    rule.lastIndex = 0;
    if (rule.test(source))
      failures.push(`${file}: credential-like value (redacted)`);
  }
  if (/\/Users\/[^/\s]+\//.test(source))
    failures.push(`${file}: private machine path`);
}
for (const file of [
  "LICENSE",
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "THIRD_PARTY_NOTICES.md",
  ".env.example",
  ".github/workflows/ci.yml",
  ".github/workflows/security.yml",
])
  if (!files.includes(file))
    failures.push(`${file}: required release file missing`);
const pkg = JSON.parse(
  execFileSync("git", ["show", ":package.json"], { encoding: "utf8" }),
);
const lock = JSON.parse(
  execFileSync("git", ["show", ":package-lock.json"], { encoding: "utf8" }),
);
assert.equal(pkg.name, lock.name, "Lockfile root name must match package");
assert.equal(pkg.license, "MIT");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Release guard passed: ${files.length} source files; no private/generated paths or credential-like values.`,
  );
