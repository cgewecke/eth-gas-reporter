const mocha = require('mocha')
const inherits = require('util').inherits
const stats = require('./gasStats.js')
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

  // Start getting this data when the reporter loads.
  stats.getGasAndPriceRates(options);

  // ------------------------------------  Helpers -------------------------------------------------
  const indent = () => Array(indents).join('  ')

  const methodAnalytics = (methodMap) => {
    let gasUsed = 0
    const endBlock = web3.eth.blockNumber
    while (startBlock <= endBlock) {
      let block = web3.eth.getBlock(startBlock)
      if (block) {
        // Add to running tally for this test
        gasUsed += block.gasUsed

        // Compile per method stats
        methodMap && block.transactions.forEach(tx => {
          const transaction = web3.eth.getTransaction(tx)
          const receipt = web3.eth.getTransactionReceipt(tx)

          const id = stats.getMethodID(transaction.input)

          // Pre/Post byzantium error filtering
          let threw = false
          if (receipt.status === 0){
            threw = true
          } else {
            threw = receipt.gasUsed === transaction.gas
          }

          if (methodMap[id] && !threw) {
            methodMap[id].gasData.push(receipt.gasUsed)
            methodMap[id].numberOfCalls++
          }
        })
      }
      startBlock++
    }
    return gasUsed
  }

  const deployAnalytics = (deployMap) => {
    const endBlock = web3.eth.blockNumber

    while (deployStartBlock <= endBlock) {
      const block = web3.eth.getBlock(deployStartBlock)

      block && block.transactions.forEach(tx => {
        const transaction = web3.eth.getTransaction(tx)
        const receipt = web3.eth.getTransactionReceipt(tx)
        const threw = receipt.gasUsed === transaction.gas  // Change this @ Byzantium

        if (receipt.contractAddress && !threw) {
          const match = deployMap.filter(contract => {
            return (transaction.input.indexOf(contract.binary) === 0)
          })[0]

          match && match.gasData.push(receipt.gasUsed)
        }
      })
      deployStartBlock++
    }
  }

  // ------------------------------------  Runners -------------------------------------------------
  runner.on('start', () => {
    ({ methodMap, deployMap } = stats.mapMethodsToContracts(artifacts))
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

  runner.on('test', () => { deployStartBlock = web3.eth.blockNumber })
  runner.on('hook end', () => { startBlock = web3.eth.blockNumber + 1 })

  runner.on('pass', test => {
    let fmt
    let gasUsedString

    deployAnalytics(deployMap)
    let gasUsed = methodAnalytics(methodMap)

    if (gasUsed) {
      gasUsedString = color('checkmark', ' (%d gas)')

      fmt = indent() +
      color('checkmark', '  ' + Base.symbols.ok) +
      color('pass', ' %s') +
      gasUsedString

      log(fmt, test.title, gasUsed)
    } else {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s')

      log(fmt, test.title)
    }
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