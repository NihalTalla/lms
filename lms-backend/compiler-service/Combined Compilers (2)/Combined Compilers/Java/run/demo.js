const { execSync } = require("child_process");
const fs = require("fs");

const tests = fs.readdirSync("./tests/v0.8.1");

for (const t of tests) {
  console.log("\n==============================");
  console.log("TEST:", t);
  console.log("==============================");
  execSync(`node ./run/run.js ./tests/v0.8.1/${t}`, {
    stdio: "inherit"
  });
}
