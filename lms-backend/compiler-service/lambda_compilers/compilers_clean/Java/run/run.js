const fs = require("fs");
const path = require("path");
const compileAndRun = require("../java/index");

// Optional CLI argument
const inputFile = process.argv[2];

// Known legacy sample locations (checked in order)
const LEGACY_SAMPLES = [
  path.join(__dirname, "sample.java"),
  path.join(__dirname, "../sample.java"),
  path.join(__dirname, "../tests/v0.1/sample.java"),
  path.join(__dirname, "../java/run/sample.java")
];

let filePath;

if (inputFile) {
  // Explicit file given
  filePath = path.resolve(inputFile);
} else {
  // Auto-detect legacy sample
  filePath = LEGACY_SAMPLES.find(p => fs.existsSync(p));
  if (!filePath) {
    throw new Error(
      "No legacy sample.java found.\n" +
      "Checked:\n" +
      LEGACY_SAMPLES.map(p => "  - " + p).join("\n")
    );
  }
}

const source = fs.readFileSync(filePath, "utf8");
compileAndRun(source);
