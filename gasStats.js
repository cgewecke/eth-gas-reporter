/**
 * Methods to generate gas data.
 */

const colors = require('colors/safe')
const _ = require('lodash')
const path = require('path')
const request = require('request-promise-native')
const shell = require('shelljs')
const Table = require('cli-table2')
const reqCwd = require('req-cwd')
const abiDecoder = require('abi-decoder')
const fs = require('fs');


/**
 * We fetch these async from remote sources / config when the reporter loads because
 * for unknown reasons mocha exits prematurely if any of the tests fail.
 */
let currency;
let gasPrice;
let ethPrice;

/**
 * block.gasLimit. Set to a default at declaration but set to the rpc's declared limit
 * at `mapMethodsToContracts`
 * @type {Number}
 */
let blockLimit = 6718946

/**
 * Expresses gas usage as a nation-state currency price
 * @param  {Number} gas      gas used
 * @param  {Number} ethPrice e.g chf/eth
 * @param  {Number} gasPrice in wei e.g 5000000000 (5 gwei)
 * @return {Number}          cost of gas used (0.00)
 */
function gasToCost (gas, ethPrice, gasPrice) {
  ethPrice = parseFloat(ethPrice)
  gasPrice = parseInt(gasPrice)
  return ((gasPrice / 1e9) * gas * ethPrice).toFixed(2)
}

/**
 * Expresses gas usage as a % of the block gasLimit. Source: NeuFund (see issues)
 * @param  {Number} gasUsed    gas value
 * @param  {Number} blockLimit gas limit of a block
 * @return {Number}            percent (0.0)
 */
function gasToPercentOfLimit (gasUsed) {
  return Math.round(1000 * gasUsed / blockLimit) / 10
}

/**
 * Extracts the method identifier from the input field of obj returned by web3.eth.getTransaction
 * @param  {String} code hex data
 * @return {String}      method identifier (used by abi-decoder)
 */
function getMethodID (code) {
  return code.slice(2, 10)
}

/**
 * Prints a gas stats table to stdout. Based on Alan Lu's stats for Gnosis
 * @param  {Object} methodMap methods and their gas usage (from mapMethodToContracts)
 */
function generateGasStatsReport (methodMap, deployMap) {
  const methodRows = []

  _.forEach(methodMap, (data, methodId) => {
    if (!data) return

    let stats = {}

    if (data.gasData.length) {
      const total = data.gasData.reduce((acc, datum) => acc + datum, 0)
      stats.average = Math.round(total / data.gasData.length)
      stats.cost = (ethPrice && gasPrice) ? gasToCost(stats.average, ethPrice, gasPrice) : colors.grey('-')
    } else {
      stats.average = colors.grey('-')
      stats.cost = colors.grey('-')
    }

    const sortedData = data.gasData.sort((a, b) => a - b)
    stats.min = sortedData[0]
    stats.max = sortedData[sortedData.length - 1]

    const uniform = (stats.min === stats.max)
    stats.min = (uniform) ? '-' : colors.cyan(stats.min.toString())
    stats.max = (uniform) ? '-' : colors.red(stats.max.toString())

    stats.numberOfCalls = colors.grey(data.numberOfCalls.toString())

    const section = []
    section.push(colors.grey(data.contract))
    section.push(data.method)
    section.push({hAlign: 'right', content: stats.min})
    section.push({hAlign: 'right', content: stats.max})
    section.push({hAlign: 'right', content: stats.average})
    section.push({hAlign: 'right', content: stats.numberOfCalls})
    section.push({hAlign: 'right', content: colors.green(stats.cost.toString())})

    methodRows.push(section)
  })

  const deployRows = []

  deployMap.sort((a, b) => a.name.localeCompare(b.name))

  deployMap.forEach(contract => {
    let stats = {}
    if (!contract.gasData.length) return

    const total = contract.gasData.reduce((acc, datum) => acc + datum, 0)
    stats.average = Math.round(total / contract.gasData.length)
    stats.percent = gasToPercentOfLimit(stats.average)
    stats.cost = (ethPrice && gasPrice) ? gasToCost(stats.average, ethPrice, gasPrice) : colors.grey('-')

    const sortedData = contract.gasData.sort((a, b) => a - b)
    stats.min = sortedData[0]
    stats.max = sortedData[sortedData.length - 1]

    const uniform = (stats.min === stats.max)
    stats.min = (uniform) ? '-' : colors.cyan(stats.min.toString())
    stats.max = (uniform) ? '-' : colors.red(stats.max.toString())

    const section = []
    section.push({hAlign: 'left', colSpan: 2, content: contract.name})
    section.push({hAlign: 'right', content: stats.min})
    section.push({hAlign: 'right', content: stats.max})
    section.push({hAlign: 'right', content: stats.average})
    section.push({hAlign: 'right', content: colors.grey(`${stats.percent} %`)})
    section.push({hAlign: 'right', content: colors.green(stats.cost.toString())})

    deployRows.push(section)
  })

  // Format table
  const table = new Table({
    style: {head: [], border: [], 'padding-left': 2, 'padding-right': 2},
    chars: {
      'mid': '·', 'top-mid': '|', 'left-mid': '·', 'mid-mid': '|', 'right-mid': '·',
      'top-left': '·', 'top-right': '·', 'bottom-left': '·', 'bottom-right': '·',
      'middle': '·', 'top': '-', 'bottom': '-', 'bottom-mid': '|'
    }
  })

  // Format and load methods metrics
  let title = [
    {hAlign: 'center', colSpan: 5, content: colors.green.bold('Gas')},
    {hAlign: 'center', colSpan: 2, content: colors.grey(`Block limit: ${blockLimit} gas`)}
  ]

  let methodSubtitle
  if (ethPrice && gasPrice) {
    const gwei = parseInt(gasPrice)
    const rate = parseFloat(ethPrice).toFixed(2)

    methodSubtitle = [
      {hAlign: 'left', colSpan: 2, content: colors.green.bold('Methods')},
      {hAlign: 'center', colSpan: 3, content: colors.grey(`${gwei} gwei/gas`)},
      {hAlign: 'center', colSpan: 2, content: colors.red(`${rate} ${currency.toLowerCase()}/eth`)}
    ]
  } else {
    methodSubtitle = [{hAlign: 'left', colSpan: 7, content: colors.green.bold('Methods')}]
  }

  const header = [
    colors.bold('Contract'),
    colors.bold('Method'),
    colors.green('Min'),
    colors.green('Max'),
    colors.green('Avg'),
    colors.bold('# calls'),
    colors.bold(`${currency.toLowerCase()} (avg)`)
  ]

  table.push(title)
  table.push(methodSubtitle)
  table.push(header)

  // Sort rows by contract, then method and push
  methodRows.sort((a, b) => {
    const contractName = a[0].localeCompare(b[0])
    const methodName = a[1].localeCompare(b[1])
    return contractName || methodName
  })

  methodRows.forEach(row => table.push(row))

  if (deployRows.length) {
    const deploymentsSubtitle = [
      {hAlign: 'left', colSpan: 2, content: colors.green.bold('Deployments')},
      {hAlign: 'right', colSpan: 3, content: '' },
      {hAlign: 'left', colSpan: 1, content: colors.bold(`% of limit`)}
    ]
    table.push(deploymentsSubtitle)
    deployRows.forEach(row => table.push(row))
  }

  // export to preferred output
  if (outputFile) {
    fs.writeFile(outputFile, table.toString(), (err) => {
      if (err) {
        console.log('Writing to %s failed', outputFile);
        console.log(table.toString());
      }
    });
  } else {
    console.log(table.toString())
  }
}

/**
 * Async method that fetches gasPrices from blockcypher.com (default to the lowest safe
 * gas price) and current market value of eth in currency specified by the config from
 * coinmarketcap (defaults to euros).
 * @return {Object}
 * @example
 *   const {
 *     currency, // 'eur'
 *     gasPrice, // '5000000000'
 *     ethPrice, // '212.02'
 *   } = await getGasAndPriceRates()
 *
 */
async function getGasAndPriceRates () {

  const defaultGasPrice = 5

  // Load config
  const config = reqCwd.silent('./.ethgas.js') || {}

  // Global to this file...
  currency = config.currency || 'eur'
  ethPrice = config.ethPrice || null
  gasPrice = config.gasPrice || null
  outputFile = config.outputFile || null

  const currencyPath = `https://api.coinmarketcap.com/v1/ticker/ethereum/?convert=${currency.toUpperCase()}`
  const currencyKey = `price_${currency.toLowerCase()}`
  const gasPricePath = `https://ethgasstation.info/json/ethgasAPI.json`

  // Currency market data: coinmarketcap
  if (!ethPrice) {
    try {
      let response = await request.get(currencyPath)
      response = JSON.parse(response)
      ethPrice = response[0][currencyKey]
    } catch (error) {
      ethPrice = null
    }
  }

  // Gas price data: blockcypher
  if (!gasPrice) {
    try {
      let response = await request.get(gasPricePath)
      response = JSON.parse(response)
      gasPrice = Math.round(response.safeLow / 10);
    } catch (error) {
      gasPrice = defaultGasPrice
    }
  }
}

/**
 * Generates a complete mapping of method data ids to their contract and method names.
 * Map also initialised w/ an empty `gasData` array that the gas value of each matched transaction
 * is pushed to. Expects a`contracts` folder in the cwd.
 * @param  {Object} truffleArtifacts the `artifacts` of `artifacts.require('MetaCoin.sol')
 * @return {Object}                  { methodMap: <Object>, deployMap: <array> }
 * @example output
 * methodMap {
 *   {
 *    "90b98a11": {
 *     "contract": "MetaCoin",
 *     "method": "sendCoin",
 *     "gasData": []
 *    },
 *   }
 *   ...
 * },
 * deployMap [
 *   {
 *    name: "Metacoin",
 *    binary: "0x56484152.......",
 *    gasData: []
 *   },
 *   ....
 * ]
 */
function mapMethodsToContracts (truffleArtifacts) {
  const methodMap = {}
  const deployMap = []
  const abis = []

  const block = web3.eth.getBlock('latest');
  blockLimit = block.gasLimit;

  const names = shell.ls('./contracts/**/*.sol')
  names.forEach(name => {
    name = path.basename(name)

    if (name === 'Migrations.sol') return

    // Create Deploy Map:
    let contract
    try { contract = truffleArtifacts.require(name) } catch (error) { return }

    const contractInfo = {
      name: name.split('.sol')[0],
      binary: contract.unlinked_binary,
      gasData: []
    }
    deployMap.push(contractInfo)
    abis.push(contract._json.abi)

    // Decode, getMethodIDs
    abiDecoder.addABI(contract._json.abi)
    const methodIDs = abiDecoder.getMethodIDs()

    // Create Method Map;
    Object.keys(methodIDs).forEach(key => {
      const isConstant = methodIDs[key].constant
      const isEvent = methodIDs[key].type === 'event'
      const hasName = methodIDs[key].name

      if (hasName && !isConstant && !isEvent) {
        methodMap[key] = {
          contract: name.split('.sol')[0],
          method: methodIDs[key].name,
          gasData: [],
          numberOfCalls: 0
        }
      }
    })
    abiDecoder.removeABI(contract._json.abi)
  })

  abis.forEach(abi => abiDecoder.addABI(abi))

  return {
    methodMap: methodMap,
    deployMap: deployMap
  }
}

// Debugging helper
function pretty (msg, obj) {
  console.log(`<------ ${msg} ------>\n` + JSON.stringify(obj, null, ' '))
  console.log(`<------- END -------->\n`)
}

module.exports = {
  gasToPercentOfLimit: gasToPercentOfLimit,
  generateGasStatsReport: generateGasStatsReport,
  getGasAndPriceRates: getGasAndPriceRates,
  getMethodID: getMethodID,
  mapMethodsToContracts: mapMethodsToContracts,
  pretty: pretty
}
