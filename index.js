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

  // ------------------------------------  Helpers -------------------------------------------------
  const indent = () => Array(indents).join('  ')

  const calculateGasUsed = () => {
    let gasUsed = 0
    const endBlock = web3.eth.blockNumber
    while (startBlock <= endBlock) {
      let block = web3.eth.getBlock(startBlock)
      if (block) {
        gasUsed += block.gasUsed
      }

      startBlock++
    }
    return gasUsed
  }

  // ------------------------------------  Runners -------------------------------------------------
  runner.on('start', () => {
    const mapping = stats.mapMethodsToContracts(artifacts)
    stats.pretty('Mapping', mapping)
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
    let gasUsed = calculateGasUsed()
    //let percent = 0
    let percent = stats.gasToPercentOfLimit(gasUsed);

    if (percent >= 100)
      limitString = color('fail', ' (%d% of limit) ')
    else
      limitString = color('pass', ' (%d% of limit) ')

    fmt = indent() +
      color('checkmark', '  ' + Base.symbols.ok) +
      color('pass', ' %s') +
      color('checkmark', ' (%d gas)') +
      limitString

    log(fmt, test.title, gasUsed, percent)
  })

  runner.on('fail', test => {
    let gasUsed = calculateGasUsed()
    let fmt = indent() +
      color('fail', '  %d) %s') +
      color('pass', ' (%d gas)')
    log()
    log(fmt, ++n, test.title, gasUsed)
  })

  runner.on('end', () => {
    self.epilogue.bind(self)
  })
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Gas, Base)
