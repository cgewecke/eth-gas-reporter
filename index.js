const mocha = require('mocha')
const inherits = require('util').inherits
const Base = mocha.reporters.Base
const color = Base.color
const log = console.log
const SyncRequest = require('./lib/syncRequest');
const utils = require('./lib/utils');
const Config = require('./lib/config');
const TransactionWatcher = require('./lib/TransactionWatcher');
//const Table = require('./lib/table');

/**
 * Based on the Mocha 'Spec' reporter. Watches an Ethereum test suite run
 * and collects data about method & deployments gas usage. Mocha executes the hooks
 * in this reporter synchronously so any client calls here should be executed
 * via low-level RPC interface using sync-request. (see /lib/syncRequest)
 * An exception is made for fetching current gas & currency price data
 * (we assume that single call will complete by the time the tests finish running)
 *
 * @param {Object} runner  mocha's runner
 * @param {Object} options reporter.options (see README example usage)
 */
function Gas (runner, options) {
  // Spec reporter
  Base.call(this, runner);
  const self = this;

  let indents = 0
  let n = 0
  let failed = false;
  let indent = () => Array(indents).join('  ')

  // Gas reporter setup
  const config = new Config(options.reporterOptions);
  const sync = new SyncRequest(config.url);
  const watch = new TransactionWatcher(config);

  // This is async, calls the cloud. Start running it.
  utils.setGasAndPriceRates(config);

  // ------------------------------------  Runners -------------------------------------------------

  runner.on('start', () => watch.data.initialize(artifacts, config))

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

  runner.on('test', () => watch.beforeStartBlock = sync.blockNumber() )

  runner.on('hook end', () => watch.itStartBlock = sync.blockNumber() + 1 )

  runner.on('pass', test => {
    let fmt
    let fmtArgs
    let gasUsedString
    let consumptionString
    let timeSpentString = color(test.speed, '%dms')

    const gasUsed = watch.methods();
    watch.deployments();

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
        consumptionString;

    } else {
      if (config.showTimeSpent) {
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
    table.generate(watch.data, config)
    self.epilogue()
  });
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Gas, Base)

module.exports = Gas
