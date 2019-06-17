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

  console.log("CIRCLE_PULL_REQUEST: " + process.env.CIRCLE_PULL_REQUEST);
  console.log("CIRCLE_SHA1: " + process.env.CIRCLE_SHA1);
  console.log("CIRCLE_PROJECT_USERNAME" + process.env.CIRCLE_PROJECT_USERNAME);
  console.log("CIRCLE_PROJECT_REPONAME" + process.env.CIRCLE_PROJECT_REPONAME);
  console.log("output.namespace --> " + output.namespace);

  // Save data on push hook?
  if (!codechecks.isPr()) {
    const report = new CodeChecksReport(output.config);
    report.generate(output.info);
    console.log("Saving report.newData --> " + JSON.stringify(report.newData, null, ' '));
    await codechecks.saveValue(output.namespace, report.newData);
    return;
  }

  output.config.previousData = ( await codechecks.getValue(output.namespace) ) || null;
  console.log("config.previousData --> " + JSON.stringify(output.config.previousData, null, " "));

  const report = new CodeChecksReport(output.config);
  const table = report.generate(output.info);
  const shortDescription = report.getShortDescription();

  console.log("Generated report " + table);

  await codechecks.success({
    name: "Gas Usage",
    shortDescription: shortDescription,
    longDescription: table
  });

  console.log("Reported success");
};

`;

module.exports = hook;
