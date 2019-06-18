/**
 * String written to `codechecks.js` in CI after the reporter is finished. Loads compiled
 * data and passes it to codechecks service. (Source: krzkaczor/truffle-codechecks)
 * @type {String}
 */
const hook = `

const { join } = require("path");
const fs = require("fs");
const { codechecks } = require("@codechecks/client");
const CodeChecksReport = require("eth-gas-reporter/lib/codechecksReport");

module.exports.main = async function main() {

  const output = JSON.parse(fs.readFileSync("gasReporterOutput.json", "utf-8"));

  // Save data on push hook, e.g. the merge commit
  if (!codechecks.isPr()) {
    const report = new CodeChecksReport(output.config);
    report.generate(output.info);
    await codechecks.saveValue(output.namespace, report.newData);
    return;
  }

  output.config.previousData = ( await codechecks.getValue(output.namespace) ) || null;

  const report = new CodeChecksReport(output.config);
  const table = report.generate(output.info);
  const shortDescription = report.getShortDescription();

  await codechecks.success({
    name: "Gas Usage",
    shortDescription: shortDescription,
    longDescription: table
  });
};

`;

module.exports = hook;
