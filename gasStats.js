/**
 * Methods to generate gas data.
 */

const colors = require('colors')
const _ = require('lodash')
const path = require('path')
const request = require('request-promise-native')
const shell = require('shelljs')
const Table = require('cli-table2')
const reqCwd = require('req-cwd')
const abiDecoder = require('abi-decoder')

const blockLimit = 6718946;
/**
 * Expresses gas usage as a nation-state currency price
 * @param  {Number} gas      gas used
 * @param  {Number} ethPrice e.g chf/eth
 * @param  {Number} gasPrice in wei e.g 5000000000 (5 gwei)
 * @return {Number}          cost of gas used (0.00)
 */
function gasToCost (gas, ethPrice, gasPrice) {
  ethPrice = parseFloat(ethPrice);
  gasPrice = parseInt(gasPrice);
  return ((gasPrice / 1e18) * gas * ethPrice).toFixed(2)
}

/**
 * Expresses gas usage as a % of the block gasLimit. Source: NeuFund (see issues)
 * @param  {Number} gasUsed    gas value
 * @param  {Number} blockLimit gas limit of a block
 * @return {Number}            percent (0.0)
 */
function gasToPercentOfLimit(gasUsed){
  return Math.round(1000 * gasUsed / blockLimit) / 10;
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
async function generateGasStatsReport (methodMap, deployMap) {
  const {
    currency,
    ethPrice,
    gasPrice
  } = await getGasAndPriceRates()

  // Compose rows
  const methodRows = [];

  _.forEach(methodMap, (data, methodId) => {
    if (!data) return

    let stats = {};

    if (data.gasData.length){
      const total = data.gasData.reduce((acc, datum) => acc + datum, 0)
      stats.average =  Math.round(total / data.gasData.length)
      stats.cost = (ethPrice && gasPrice) ? gasToCost(stats.average, ethPrice, gasPrice) : '-'.grey
    } else {
      stats.average = '-'.grey;
      stats.cost = '-'.grey;
    }

    const sortedData = data.gasData.sort((a,b) => a - b);
    stats.min = sortedData[0]
    stats.max = sortedData[sortedData.length - 1]

    const uniform = (stats.min === stats.max);
    stats.min = (uniform) ? '-' : stats.min.toString().yellow;
    stats.max = (uniform) ? '-' : stats.max.toString().red;

    stats.numberOfCalls = data.numberOfCalls.toString().grey;

    const section = [];
    section.push(data.contract.grey);
    section.push(data.method)
    section.push({hAlign: 'right', content: stats.min})
    section.push({hAlign: 'right', content: stats.max})
    section.push({hAlign: 'right', content: stats.average})
    section.push({hAlign: 'right', content: stats.numberOfCalls})
    section.push({hAlign: 'right', content: stats.cost.toString().green})

    methodRows.push(section);
  })

  const deployRows = [];

  deployMap.sort((a,b) => a.name.localeCompare(b.name));

  deployMap.forEach(contract => {
    let stats = {};
    if (!contract.gasData.length) return;

    const total = contract.gasData.reduce((acc, datum) => acc + datum, 0)
    stats.average =  Math.round(total / contract.gasData.length)
    stats.percent = gasToPercentOfLimit(stats.average);
    stats.cost = (ethPrice && gasPrice) ? gasToCost(stats.average, ethPrice, gasPrice) : '-'.grey;


    const sortedData = contract.gasData.sort((a,b) => a - b);
    stats.min = sortedData[0]
    stats.max = sortedData[sortedData.length - 1]

    const uniform = (stats.min === stats.max);
    stats.min = (uniform) ? '-' : stats.min.toString().yellow;
    stats.max = (uniform) ? '-' : stats.max.toString().red;

    section = [];
    section.push({hAlign: 'left', colSpan: 2, content: contract.name});
    section.push({hAlign: 'right', content: stats.min})
    section.push({hAlign: 'right', content: stats.max})
    section.push({hAlign: 'right', content: stats.average})
    section.push({hAlign: 'right', content: `${stats.percent} %`.grey})
    section.push({hAlign: 'right', content: stats.cost.toString().green})

    deployRows.push(section);
  });

  // Format table
  const table = new Table({
    style:{head:[], border:[], 'padding-left': 2, 'padding-right': 2},
    chars: {'mid': '·', 'top-mid': '·', 'left-mid': '·', 'mid-mid': '·', 'right-mid': '·',
            'top-left': '·', 'top-right': '·', 'bottom-left': '·', 'bottom-right': '·',
            'middle': '·', 'top': '-', 'bottom': '-', 'bottom-mid': '-'}
  });

  // Format and load methods metrics
  let title = [
    {hAlign: 'center', colSpan: 5, content: 'Gas Usage Metrics'.green.bold},
    {hAlign: 'center', colSpan: 2, content: `Block limit: ${blockLimit} gas`.grey }
  ];

  let methodSubtitle;
  if (ethPrice && gasPrice){
    const gwei = parseInt(gasPrice) * 1e-9;
    const rate = parseFloat(ethPrice).toFixed(2);

    methodSubtitle = [
      {hAlign: 'left', colSpan: 2, content: 'Methods'.green.bold},
      {hAlign: 'center', colSpan: 3, content: `${gwei} gwei/gas`.grey},
      {hAlign: 'center', colSpan: 2, content: `${rate} ${currency.toLowerCase()}/eth`.red},
    ];
  } else {
    methodSubtitle = [{hAlign: 'left', colSpan: 7, content: 'Methods'.green.bold}];
  }

  const header = [
    'Contract'.bold,
    'Method'.bold,
    'Min'.green,
    'Max'.green,
    'Avg'.green,
    '# calls'.bold,
    `${currency.toLowerCase()} (avg)`.bold
  ]

  table.push(title);
  table.push(methodSubtitle);
  table.push(header);

  // Sort rows by contract, then method and push
  methodRows.sort((a,b) => {
    const contractName = a[0].localeCompare(b[0]);
    const methodName = a[1].localeCompare(b[1]);
    return contractName || methodName;
  });

  methodRows.forEach(row => table.push(row));

  if (deployRows.length){
    const deploymentsSubtitle = [
      {hAlign: 'left', colSpan: 2, content: 'Deployments'.green.bold},
      {hAlign: 'right', colSpan: 3, content: '' },
      {hAlign: 'left', colSpan: 1, content: `% of limit`.bold}
    ];
    table.push(deploymentsSubtitle);
    deployRows.forEach(row => table.push(row));
  }

  // Print
  console.log(table.toString())
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
  let ethPrice
  let gasPrice
  const defaultGasPrice = 5000000000

  // Load config
  const config = reqCwd.silent('.ethgas.js') || {}
  const currency = config.currency || 'eur'

  ethPrice = config.ethPrice || null
  gasPrice = config.gasPrice || null

  const currencyPath = `https://api.coinmarketcap.com/v1/ticker/ethereum/?convert=${currency.toUpperCase()}`
  const currencyKey = `price_${currency.toLowerCase()}`
  const gasPricePath = `https://api.blockcypher.com/v1/eth/main`

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
      gasPrice = response['low_gas_price']
    } catch (error) {
      gasPrice = defaultGasPrice
    }
  }

  return {
    currency: currency,
    ethPrice: ethPrice,
    gasPrice: gasPrice
  }
}

/**
 * Generates a complete mapping of method data ids to their contract and method names.
 * Map also initialised w/ an empty `gasData` array that the gas value of each matched transaction
 * is pushed to. Expects a`contracts` folder in the cwd.
 * @param  {Object} truffleArtifacts the `artifacts` of `artifacts.require('MetaCoin.sol')
 * @return {Object}                  mapping
 * @example output
 *   {
 *    "90b98a11": {
 *     "contract": "MetaCoin",
 *     "method": "sendCoin",
 *     "gasData": []
 *    },
 *   }
 */
function mapMethodsToContracts (truffleArtifacts) {
  const methodMap = {}
  const deployMap = []
  const abis = []

  const names = shell.ls('./contracts/**/*.sol')
  names.sort();

  names.forEach(name => {
    name = path.basename(name);

    if (name === 'Migrations.sol') return

    // Create Deploy Map:
    const contract = truffleArtifacts.require(name)
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

      if (hasName && !isConstant && !isEvent){
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


