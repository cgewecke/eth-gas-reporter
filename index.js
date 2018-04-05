const mocha = require('mocha')
const inherits = require('util').inherits
const stats = require('./gasStats.js')
const Base = mocha.reporters.Base
const color = Base.color
const log = console.log
const syncRequest = require('sync-request');

function request(method, params){
  var res = syncRequest('POST', web3.currentProvider.host, {
      json: {"jsonrpc":"2.0","method":method,"params":params,"id":1}
  });
  return JSON.parse(res.getBody('utf8')).result;
}

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
    const endBlockWhole = request('eth_getBlockByNumber', ["latest", false]);
    const endBlock = parseInt(endBlockWhole.number, 16);
    while (startBlock <= endBlock) {
      let block = request('eth_getBlockByNumber', [`0x${startBlock.toString(16)}`, false]);
      if (block) {
        // Add to running tally for this test
        gasUsed += parseInt(block.gasUsed, 16);

        // Compile per method stats
        methodMap && block.transactions.forEach(tx => {
          const transaction = request('eth_getTransactionByHash', [tx]);
          const receipt = request('eth_getTransactionReceipt', [tx]);
          const id = stats.getMethodID(transaction.input)
          // Pre/Post byzantium error filtering
          let threw = false
          if (receipt.status === 0){
            threw = true
          } else {
            threw = receipt.gasUsed === transaction.gas
          }

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
    const endBlockWhole = request('eth_getBlockByNumber', ["latest", false]);
    const endBlock = parseInt(endBlockWhole.number, 16);

    while (deployStartBlock <= endBlock) {
      let block = request('eth_getBlockByNumber', [`0x${deployStartBlock.toString(16)}`, false]);

      block && block.transactions.forEach(tx => {
        const transaction = request('eth_getTransactionByHash', [tx]);
        const receipt = request('eth_getTransactionReceipt', [tx]);
        const threw = receipt.gasUsed === transaction.gas  // Change this @ Byzantium
        if (receipt.contractAddress && !threw) {
          const match = deployMap.filter(contract => {
            return (transaction.input.indexOf(contract.binary) === 0)
          })[0]

          match && match.gasData.push(parseInt(receipt.gasUsed, 16))
        }
      })
      deployStartBlock++
    }
  }

  // ------------------------------------  Runners -------------------------------------------------
  runner.on('start', () => {
    ({ methodMap, deployMap } = stats.mapMethodsToContracts(artifacts))
    log()
    // const res = stats.mapMethodsToContracts(artifacts);
    // methodMap = res.methodMap;
    // deployMap = res.deployMap;
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

  runner.on('test', () => {
    const deployStartBlockWhole = request('eth_getBlockByNumber', ["latest", false]);
    deployStartBlock = parseInt(deployStartBlockWhole.number, 16);
  })
  runner.on('hook end', () => {
    const startBlockWhole = request('eth_getBlockByNumber', ["latest", false]);
    startBlock = parseInt(startBlockWhole.number, 16);
  })

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
