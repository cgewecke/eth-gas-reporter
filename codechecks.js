const { join } = require("path");
const fs = require("fs");
const { codechecks } = require("@codechecks/client");
const CodeChecksReport = require("eth-gas-reporter/lib/codechecksReport");

/**
 * Consumed by codecheck command when user's .yml lists
 * `eth-gas-reporter/codechecks`. The reporter dumps collected
 * data to the project root whenever `process.env.CI` is true. This
 * file processes it and runs the relevant codechecks routines.
 * >
 * > Source: krzkaczor/truffle-codechecks.
 * >
 */
module.exports.default = async function gasReporter() {
  let output;
  let file = "gasReporterOutput.json";

  // Load gas reporter output
  try {
    output = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    const message =
      `Error: Couldn't load data from "${file}".\n` +
      `If you're using codechecks locally make sure you set ` +
      `the environment variable "CI" to "true" before running ` +
      `your tests. ( ex: CI=true npm test )`;

    console.err(message);
    return;
  }

  // Save new data on the merge commit / push build
  if (!codechecks.isPr()) {
    const report = new CodeChecksReport(output.config);
    report.generate(output.info);
    await codechecks.saveValue(output.namespace, report.newData);
    return;
  }

  // Get historical data for each pr commit
  output.config.previousData =
    (await codechecks.getValue(output.namespace)) || null;

  const report = new CodeChecksReport(output.config);
  const table = report.generate(output.info);
  const shortDescription = report.getShortDescription();

  // Submit report
  await codechecks.success({
    name: "Gas Usage",
    shortDescription: shortDescription,
    longDescription: table
  });
};
