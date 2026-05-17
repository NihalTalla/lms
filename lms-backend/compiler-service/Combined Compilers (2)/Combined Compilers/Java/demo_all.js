const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/* ========================================
   LEGACY NOTICE
   ======================================== */

console.log("\n========================================");
console.log(" LEGACY SAMPLES SKIPPED");
console.log("========================================");
console.log(
  "Old unversioned samples are skipped.\n" +
  "Only versioned tests under /tests are executed.\n"
);

/* ========================================
   RUN VERSIONED TESTS ONLY
   ======================================== */

const baseDir = path.join(__dirname, "tests");

if (!fs.existsSync(baseDir)) {
  console.log("\n(no versioned tests found)");
  process.exit(0);
}

/*
  Sort versions numerically:
  v0.1 < v0.2 < v0.3 < v0.4 < v0.7 < v0.7.1 < v1.2 < v1.4
*/
const versions = fs.readdirSync(baseDir)
  .filter(d => /^v\d+(\.\d+)+$/.test(d))
  .sort((a, b) => {
    const pa = a.slice(1).split(".").map(Number);
    const pb = b.slice(1).split(".").map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) return da - db;
    }
    return 0;
  });

for (const version of versions) {
  const dir = path.join(baseDir, version);
  if (!fs.statSync(dir).isDirectory()) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".java"));
  if (files.length === 0) continue;

  console.log("\n========================================");
  console.log(` RUNNING TESTS FOR ${version}`);
  console.log("========================================");

  for (const file of files) {
    console.log(`\n▶ ${version}/${file}`);
    
    // For trap.java test, suppress error output from PowerShell
    const isTraptTest = file === "trap.java";
    
    try {
      if (isTraptTest) {
        // Run trap test with stderr redirected to null to suppress PowerShell error display
        execSync(`node run/run.js ${path.join(dir, file)} 2>$null`, {
          stdio: "inherit",
          shell: "powershell.exe"
        });
      } else {
        execSync(`node run/run.js ${path.join(dir, file)}`, {
          stdio: "inherit"
        });
      }
    } catch (e) {
      // Expected for trap.java - it intentionally triggers a runtime error
      if (!isTraptTest) {
        throw e;
      }
    }
  }
}
