const mocha = require('mocha')
const inherits = require('util').inherits
const sync = require('./sync')
const stats = require('./gasStats.js')
const reqCwd = require('req-cwd')
const Base = mocha.reporters.Base
const color = Base.color
const log = console.log

// Based on the 'Spec' reporter
function Gas (runner, options) {

  Base.call(this, runner)

  const self = this
  let indents = 0
  let n = 0
  let failed = false;
  let startBlock
  let deployStartBlock
  let methodMap
  let deployMap

  // Load config / keep .ethgas.js for backward compatibility
  let config;
  if (options && options.reporterOptions){
    config = options.reporterOptions
  } else {
    config = reqCwd.silent('./.ethgas.js') || {}
  }

  // Start getting this data when the reporter loads.
  stats.getGasAndPriceRates(config);

  // ------------------------------------  Helpers -------------------------------------------------
  const indent = () => Array(indents).join('  ')

  const methodAnalytics = (methodMap) => {
    let gasUsed = 0
    const endBlock = sync.blockNumber();

    while (startBlock <= endBlock) {
      let block = sync.getBlockByNumber(startBlock);

      if (block) {
        // Add to running tally for this test
        gasUsed += parseInt(block.gasUsed, 16);

        // Compile per method stats
        methodMap && block.transactions.forEach(tx => {
          const transaction = sync.getTransactionByHash(tx);
          const receipt = sync.getTransactionReceipt(tx);
          const id = stats.getMethodID(transaction.input)

          let threw = parseInt(receipt.status) === 0;

          if (methodMap[id] && !threw) {
            methodMap[id].gasData.push(parseInt(receipt.gasUsed, 16))
            methodMap[id].numberOfCalls++
          }
        })
      }
      startBlock++
    }
    return gasUsed
  }

  const deployAnalytics = (deployMap) => {
    const endBlock = sync.blockNumber();

    while (deployStartBlock <= endBlock) {
      let block = sync.getBlockByNumber(deployStartBlock);

      block && block.transactions.forEach(tx => {
        const receipt = sync.getTransactionReceipt(tx);
        const threw = parseInt(receipt.status) === 0;

        if (receipt.contractAddress && !threw) {
          const transaction = sync.getTransactionByHash(tx)

          const matches = deployMap.filter(contract => {
            return stats.matchBinaries(transaction.input, contract.binary);
          })

          if(matches && matches.length){
            const match = matches.find(item => item.binary !== '0x');
            match && match.gasData.push(parseInt(receipt.gasUsed, 16))
          }
        }
      })
      deployStartBlock++
    }
  }

  // ------------------------------------  Runners -------------------------------------------------
  runner.on('start', () => {
    ({ methodMap, deployMap } = stats.mapMethodsToContracts(artifacts))
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

  runner.on('test', () => { deployStartBlock = sync.blockNumber() })

  runner.on('hook end', () => { startBlock = sync.blockNumber() + 1 })

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
    stats.generateGasStatsReport(methodMap, deployMap)
    self.epilogue()
  });
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Gas, Base)

module.exports = Gas
