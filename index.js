const mocha = require('mocha')
const inherits = require('util').inherits
const stats = require('./gasStats.js')
const Base = mocha.reporters.Base
const color = Base.color
const log = console.log
module.exports = Gas

// Based on the 'Spec' reporter
function Gas (runner) {
  Base.call(this, runner)

  const self = this
  let indents = 0
  let n = 0
  let startBlock
  let methodMap

  // ------------------------------------  Helpers -------------------------------------------------
  const indent = () => Array(indents).join('  ')

  const gasAnalytics = (methodMap) => {
    let gasUsed = 0
    const endBlock = web3.eth.blockNumber
    while (startBlock <= endBlock) {
      let block = web3.eth.getBlock(startBlock)
      if (block) {
        // Add to running tally for this test
        gasUsed += block.gasUsed

        // Compile per method stats
        methodMap && block.transactions.forEach(tx => {
          const input = web3.eth.getTransaction(tx).input;
          const receipt = web3.eth.getTransactionReceipt(tx);
          const id = stats.getMethodID( input );
          if (methodMap[id]){
            methodMap[id].gasData.push(receipt.gasUsed);
          }
        })
      }
      startBlock++
    }
    return gasUsed
  }

  // ------------------------------------  Runners -------------------------------------------------
  runner.on('start', () => {
    methodMap = stats.mapMethodsToContracts(artifacts)
    log()
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

  runner.on('hook end', () => { startBlock = web3.eth.blockNumber + 1 })

  runner.on('pass', test => {
    let fmt
    let limitString
    let gasUsedString
    let gasUsed = gasAnalytics(methodMap)
    let percent = stats.gasToPercentOfLimit(gasUsed);

    if (gasUsed){
      gasUsedString = color('checkmark', ' (%d gas)');
      if (percent >= 100){
        limitString = color('fail', ' (%d% of limit) ')
      } else {
        limitString = ' (%d% of limit) '
      }
      fmt = indent() +
      color('checkmark', '  ' + Base.symbols.ok) +
      color('pass', ' %s') +
      gasUsedString +
      limitString

      log(fmt, test.title, gasUsed, percent)
    } else {

      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s')

      log(fmt, test.title)
    }
  })

  runner.on('fail', test => {
    let gasUsed = gasAnalytics()
    let fmt = indent() + color('fail', '  %d) %s')
    log()
    log(fmt, ++n, test.title)
  })

  runner.on('end', () => {
    stats.generateGasStatsReport (methodMap)
    self.epilogue()
  })
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Gas, Base)
