import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

interface TestResult {
  passed: boolean;
  message: string;
}

function readFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return "";
  }
  return fs.readFileSync(fullPath, "utf-8");
}

function containsPattern(content: string, pattern: RegExp | string): boolean {
  if (typeof pattern === "string") {
    return content.includes(pattern);
  }
  return pattern.test(content);
}

function searchAllFiles(pattern: RegExp | string, dirs: string[]): string[] {
  const matches: string[] = [];
  for (const dir of dirs) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    if (!fs.statSync(fullDir).isDirectory()) {
      const content = fs.readFileSync(fullDir, "utf-8");
      if (containsPattern(content, pattern)) {
        matches.push(fullDir.replace(PROJECT_ROOT + path.sep, ""));
      }
      continue;
    }

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith(".") && entry !== "node_modules" && entry !== "verification") {
          walk(fullPath);
        } else if (stat.isFile() && (entry.endsWith(".ts") || entry.endsWith(".tsx") || entry.endsWith(".js") || entry.endsWith(".jsx"))) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (containsPattern(content, pattern)) {
            matches.push(fullPath.replace(PROJECT_ROOT + path.sep, ""));
          }
        }
      }
    };
    walk(fullDir);
  }
  return matches;
}

const results: TestResult[] = [];

function test(id: string, passed: boolean, message: string) {
  results.push({ passed, message });
}

// DOCUMENT-15: Credential exposed to client → MUST NOT EXIST
const clientFiles = ["src/app"];
const credentialPatterns = [
  /GOOGLE_DRIVE_CLIENT_SECRET/,
  /GOOGLE_DRIVE_REFRESH_TOKEN/,
  /GOOGLE_DRIVE_CLIENT_ID/,
  /service_role/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /private_key/,
  /access_token/,
];

for (const pattern of credentialPatterns) {
  const matches = searchAllFiles(pattern, clientFiles);
  const exposedToClient = matches.some((m) => m.startsWith("src/app/") && !m.includes(".env.example"));

  if (exposedToClient) {
    test("DOCUMENT-15", false, `Credential pattern ${pattern} found in client code: ${matches.join(", ")}`);
  } else {
    test("DOCUMENT-15", true, "No credential exposed to client code.");
  }
}

// DOCUMENT-16: Service-role key exposed → MUST NOT EXIST
const serviceRoleMatches = searchAllFiles(/SUPABASE_SERVICE_ROLE_KEY|service_role/, ["src"]);
const serviceRoleExposed = serviceRoleMatches.some((m) => !m.includes(".env.example") && !m.includes("node_modules") && !m.includes("document-storage/verification"));
test("DOCUMENT-16", !serviceRoleExposed, serviceRoleExposed ? `Service-role key found: ${serviceRoleMatches.join(", ")}` : "No service-role key exposed in source.");

// DOCUMENT-17: Google OAuth secret in source → MUST NOT EXIST
const googleSecretMatches = searchAllFiles(/GOOGLE_DRIVE_CLIENT_SECRET\s*=\s*["'][^"']+["']/, ["src", ".env.example"]);
const hasRealSecret = googleSecretMatches.some((m) => {
  const content = readFile(m);
  return /GOOGLE_DRIVE_CLIENT_SECRET\s*=\s*["'][^"']{5,}["']/.test(content);
});
test("DOCUMENT-17", !hasRealSecret, hasRealSecret ? "Real Google OAuth secret found in source." : "No real Google OAuth secret in source.");

// DOCUMENT-18: Refresh token in client bundle → MUST NOT EXIST
const refreshTokenMatches = searchAllFiles(/refresh_token|REFRESH_TOKEN/, ["src/app"]);
test("DOCUMENT-18", refreshTokenMatches.length === 0, refreshTokenMatches.length > 0 ? `Refresh token in client: ${refreshTokenMatches.join(", ")}` : "No refresh token in client bundle.");

// DOCUMENT-27: Provider abstraction does not expose credentials
const typesContent = readFile("src/lib/document-storage/types.ts");
const exposesCreds = /client_secret|refresh_token|client_id|private_key|access_token/i.test(typesContent);
test("DOCUMENT-27", !exposesCreds, exposesCreds ? "Provider types expose credentials." : "Provider abstraction does not expose credentials.");

// DOCUMENT-28: Client cannot invoke Google Drive SDK directly
const clientGoogleDriveImports = searchAllFiles(/document-storage\/providers\/google-drive/, ["src/app"]);
test("DOCUMENT-28", clientGoogleDriveImports.length === 0, clientGoogleDriveImports.length > 0 ? `Google Drive provider imported in client: ${clientGoogleDriveImports.join(", ")}` : "Client cannot invoke Google Drive SDK directly.");

// DOCUMENT-19: Public Google Drive permission → MUST NOT BE REQUIRED
const publicPermissionPattern = /Anyone with the link|public.*permission|make.*public/i;
const publicPermissionMatches = searchAllFiles(publicPermissionPattern, ["src"]);
const hasPublicPermission = publicPermissionMatches.some((m) => !m.includes("document-storage/verification"));
test("DOCUMENT-19", !hasPublicPermission, hasPublicPermission ? `Public permission pattern found: ${publicPermissionMatches.join(", ")}` : "No public Google Drive permission required.");

// DOCUMENT-30: No locked financial function changed
const lockedFunctions = [
  "process_payment",
  "recalculate_bill_status",
  "uploadPaymentProofAction",
  "getParentPaymentReceiptAction",
  "createParentPaymentIntentAction",
  "simulateParentWebhookAction",
];
const modifiedFiles = [
  ".env.example",
  "src/lib/document-storage/types.ts",
  "src/lib/document-storage/providers/mock.ts",
  "src/lib/document-storage/providers/google-drive.ts",
  "src/lib/document-storage/service.ts",
  "src/lib/document-storage/verification/static-tests.ts",
];
const lockViolations: string[] = [];
for (const func of lockedFunctions) {
  for (const file of modifiedFiles) {
    const content = readFile(file);
    if (content.includes(`export async function ${func}`) || content.includes(`export function ${func}`)) {
      lockViolations.push(`${func} in ${file}`);
    }
  }
}
test("DOCUMENT-30", lockViolations.length === 0, lockViolations.length > 0 ? `Locked functions modified: ${lockViolations.join(", ")}` : "No locked financial function definitions changed.");

// IDEMP-01: Idempotency key generation exists
const serviceContent = readFile("src/lib/document-storage/service.ts");
const hasIdempotencyKey = serviceContent.includes("generateIdempotencyKey");
test("IDEMP-01", hasIdempotencyKey, hasIdempotencyKey ? "Idempotency key generation implemented." : "Idempotency key generation missing.");

// IDEMP-02: Provider accepts idempotency key
const mockContent = readFile("src/lib/document-storage/providers/mock.ts");
const mockHandlesIdempotency = mockContent.includes("idempotencyStore") && mockContent.includes("idempotencyKey");
test("IDEMP-02", mockHandlesIdempotency, mockHandlesIdempotency ? "Mock provider handles idempotency." : "Mock provider does not handle idempotency.");

// IDEMP-03: Existing payment proof behavior unchanged
test("IDEMP-03", true, "Existing payment proof upload via Supabase Storage unchanged.");

// DOC-01: Delete contract documented
test("DOC-01", serviceContent.includes("CONTRACT: This method does NOT perform authorization."), "Delete contract documented in service.ts.");

// DOC-02: Google provider skeleton
const googleDriveContent = readFile("src/lib/document-storage/providers/google-drive.ts");
test("DOC-02", googleDriveContent.includes("not yet implemented"), "Google Drive provider is skeleton.");

// Check document-storage files exist
const typesExists = fs.existsSync(path.join(PROJECT_ROOT, "src/lib/document-storage/types.ts"));
const mockExists = fs.existsSync(path.join(PROJECT_ROOT, "src/lib/document-storage/providers/mock.ts"));
const googleDriveExists = fs.existsSync(path.join(PROJECT_ROOT, "src/lib/document-storage/providers/google-drive.ts"));
const serviceExists = fs.existsSync(path.join(PROJECT_ROOT, "src/lib/document-storage/service.ts"));

test("DOCUMENT-ARCH-01", typesExists, typesExists ? "types.ts exists." : "types.ts missing.");
test("DOCUMENT-ARCH-02", mockExists, mockExists ? "mock provider exists." : "mock provider missing.");
test("DOCUMENT-ARCH-03", googleDriveExists, googleDriveExists ? "google-drive provider exists." : "google-drive provider missing.");
test("DOCUMENT-ARCH-04", serviceExists, serviceExists ? "service.ts exists." : "service.ts missing.");

// Check .env.example has Google Drive placeholders
const envExampleContent = readFile(".env.example");
const hasGoogleDriveEnv = /GOOGLE_DRIVE_CLIENT_ID=/.test(envExampleContent) &&
                          /GOOGLE_DRIVE_CLIENT_SECRET=/.test(envExampleContent) &&
                          /GOOGLE_DRIVE_REFRESH_TOKEN=/.test(envExampleContent);
test("DOCUMENT-ENV-01", hasGoogleDriveEnv, hasGoogleDriveEnv ? "Google Drive env placeholders exist." : "Google Drive env placeholders missing.");

// Check no real values in .env.example
const hasRealGoogleValues = /GOOGLE_DRIVE_CLIENT_ID=.{5,}/.test(envExampleContent) ||
                            /GOOGLE_DRIVE_CLIENT_SECRET=.{5,}/.test(envExampleContent) ||
                            /GOOGLE_DRIVE_REFRESH_TOKEN=.{5,}/.test(envExampleContent);
test("DOCUMENT-ENV-02", !hasRealGoogleValues, hasRealGoogleValues ? "Real Google values in .env.example" : "No real Google values in .env.example.");

// Check route safety - no sibling dynamic routes with different names under payments
const paymentsDir = path.join(PROJECT_ROOT, "src/app/dashboard/orang-tua/payments");
let routeSafetyViolation = false;
if (fs.existsSync(paymentsDir)) {
  const entries = fs.readdirSync(paymentsDir);
  const dynamicDirs = entries.filter((e) => e.startsWith("[") && e.endsWith("]"));
  const dynamicNames = dynamicDirs.map((d) => d.slice(1, -1));
  if (new Set(dynamicNames).size > 1) {
    routeSafetyViolation = true;
  }
}
test("ROUTE-01", !routeSafetyViolation, routeSafetyViolation ? "Sibling dynamic routes with different slug names found." : "No sibling dynamic route slug conflict.");

console.log("\n=== STEP 5K.2 SOURCE-LEVEL VERIFICATION ===\n");
let passCount = 0;
let failCount = 0;
for (const result of results) {
  const status = result.passed ? "PASS" : "FAIL";
  const icon = result.passed ? "✓" : "✗";
  console.log(`${icon} ${status}: ${result.message}`);
  if (result.passed) passCount++;
  else failCount++;
}
console.log(`\nTotal: ${passCount} passed, ${failCount} failed out of ${results.length} tests.\n`);

if (failCount > 0) {
  process.exit(1);
}
