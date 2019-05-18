const mocha = require('mocha')
const inherits = require('util').inherits
const sync = require('./lib/syncRequest');
const stats = require('./gasStats.js')
const reqCwd = require('req-cwd')
const sha1 = require('sha1')
const Base = mocha.reporters.Base
const color = Base.color
const log = console.log

/**
 * Based on the Mocha 'Spec' reporter. Watches an Ethereum test suite run
 * and collects data about method / deployments gas usage. Mocha executes the hooks
 * in this reporter synchronously so any client calls here have to be executed
 * via the low-level RPC interface using sync-request.
 * @param {Object} runner  mocha's runner
 * @param {Object} options reporter.options (see README example usage)
 */
function Gas (runner, options) {

  if (!(web3.currentProvider.connection || web3.currentProvider.host)) {
    const message = `eth-gas-reporter was unable to resolve a client url ` +
                    `from the provider injected into your test context. ` +
                    `Defaulting to mocha spec reporter. `;

    log(message);
    mocha.reporters.Spec.call(this, runner);
    return;
  }

  // Spec reporter
  Base.call(this, runner);

  const self = this;

  let indents = 0
  let n = 0
  let failed = false;
  let indent = () => Array(indents).join('  ')

  // Gas reporter
  let methodMap
  let deployMap
  let contractNameFromCodeHash;

  config.src = config.src || 'contracts'; // default contracts folder

  // Setup
  stats.getGasAndPriceRates(config);
  const watch = new TransactionWatcher(config);
  // ------------------------------------  Helpers -------------------------------------------------


  // ------------------------------------  Runners -------------------------------------------------
  runner.on('start', () => {
    ({
      methodMap,
      deployMap,
      contractNameFromCodeHash } = stats.mapMethodsToContracts(artifacts, config.src))
  })

  runner.on('suite', suite => {
    ++indents
    log(color('suite', '%s%s'), indent(), suite.title)
  })

  runner.on('suite end', () => {
    --indents
    if (indents === 1) {
      log()
    }
  })

  runner.on('pending', test => {
    let fmt = indent() + color('pending', '  - %s')
    log(fmt, test.title)
  })

  runner.on('test', () => { watch.beforeStartBlock = sync.blockNumber() })

  runner.on('hook end', () => { watch.itStartBlock = sync.blockNumber() + 1 })

  runner.on('pass', test => {
    let fmt
    let fmtArgs
    let gasUsedString
    deployAnalytics(deployMap)
    let gasUsed = methodAnalytics(methodMap)
    let showTimeSpent = config.showTimeSpent || false
    let timeSpentString = color(test.speed, '%dms')
    let consumptionString
    if (gasUsed) {
      gasUsedString = color('checkmark', '%d gas')

      if (showTimeSpent) {
        consumptionString = ' (' + timeSpentString + ', ' + gasUsedString + ')'
        fmtArgs = [test.title, test.duration, gasUsed]
      } else {
        consumptionString = ' (' + gasUsedString + ')'
        fmtArgs = [test.title, gasUsed]
      }

      fmt = indent() +
      color('checkmark', '  ' + Base.symbols.ok) +
      color('pass', ' %s') +
      consumptionString
    } else {
      if (showTimeSpent) {
        consumptionString = ' (' + timeSpentString + ')'
        fmtArgs = [test.title, test.duration]
      } else {
        consumptionString = ''
        fmtArgs = [test.title]
      }

      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s') +
        consumptionString
    }
    log.apply(null, [fmt, ...fmtArgs])
  })

  runner.on('fail', test => {
    failed = true;
    let fmt = indent() + color('fail', '  %d) %s')
    log()
    log(fmt, ++n, test.title)
  })

  runner.on('end', () => {
    stats.generateGasStatsReport(methodMap, deployMap, contractNameFromCodeHash)
    self.epilogue()
  });
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Gas, Base)

module.exports = Gas
