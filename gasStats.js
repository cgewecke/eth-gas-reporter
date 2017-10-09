const colors = require('colors')
const _ = require('lodash')
const path = require('path')
const request = require('request-promise-native')
const shell = require('shelljs')
const Table = require('cli-table2')
const reqCwd = require('req-cwd')
const abiDecoder = require('abi-decoder')

function pretty (msg, obj) {
  console.log(`<------ ${msg} ------>\n` + JSON.stringify(obj, null, ' '))
  console.log(`<------- END -------->\n`)
}

function gasToCost (gas, price, gwei) {
  return (((gwei * 1e-9) * gas) * price).toFixed(2)
}

function gasToPercentOfLimit(gasUsed, blockLimit = 6718946){
  return Math.round(1000 * gasUsed / blockLimit) / 10;
}

async function generateGasStatsReport (methodMap) {
  /*const {
    currency,
    ethPrice,
    gasPrice
  } = getGasAndPriceRates()*/
  let currency = 'eur';

  const table = new Table({
    head: [
      '✜✜✜ GAS STATS ✜✜✜'.bold,
      'Method',
      'Min',
      'Max',
      'Avg',
      `${currency} (avg)`
    ]
  })

  let section = {}

  _.forEach(methodMap, (data, methodId) => {
    //pretty('data', data);
    //pretty('methodId', methodId);

    if (!data) return

    if (!section[data.contract]){
      section[data.contract] = []
    }

    let stats = {};
    stats.averageGasUsed = data.gasData.reduce((acc, datum) => acc + datum, 0) / data.gasData.length
    const sortedData = data.gasData.sort();
    stats.min = sortedData[0]
    stats.max = sortedData[sortedData.length - 1]
    stats.median = sortedData[(sortedData.length / 2) | 0]
    section[data.contract].push(data.method)
    section[data.contract].push(stats.min)
    section[data.contract].push(stats.max)
    section[data.contract].push(stats.averageGasUsed)
    section[data.contract].push(0)

    table.push(section)
  })
  console.log(table.toString())
}

async function getGasAndPriceRates () {
  let ethPrice
  let gasPrice
  const defaultGasPrice = 5000000000

  // Load config
  const config = reqCwd.silent('.ethgas.js') || {}
  const currency = config.currency || 'eur'

  ethPrice = config.ethPrice || null
  gasPrice = config.gasPrice || null

  // Currency market data: coinmarketcap
  if (!ethPrice) {
    try {
      const ethPrices = await request.get('https://coinmarketcap-nexuist.rhcloud.com/api/eth');
      (!ethPrices.error)
        ? ethPrice = ethPrices.price[currency]
        : ethPrice = null
    } catch (error) {
      ethPrice = null
    }
  }

  // Gas price data: blockcypher
  if (!gasPrice) {
    try {
      const gasPrices = await request.get('https://api.blockcypher.com/v1/eth/main');
      (!gasPrices.error)
        ? gasPrice = gasPrices['low_gas_price']
        : gasPrice = defaultGasPrice
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

function getMethodID (code) {
  return code.slice(2, 10)
}

function mapMethodsToContracts (truffleArtifacts) {
  const methodMap = {}
  const abis = []

  const names = shell.ls('./contracts/**/*.sol')
  names.sort();

  names.forEach(name => {
    name = path.basename(name);

    if (name === 'Migrations.sol') return

    const contract = truffleArtifacts.require(name)
    abis.push(contract._json.abi)

    // Decode, getMethodIDs
    abiDecoder.addABI(contract._json.abi)
    const methodIDs = abiDecoder.getMethodIDs()

    // Create Map;
    Object.keys(methodIDs).forEach(key => {
      const isConstant = methodIDs[key].constant
      const isEvent = methodIDs[key].type === 'event'
      const hasName = methodIDs[key].name

      if (hasName && !isConstant && !isEvent){
        methodMap[key] = {
          contract: name.split('.sol')[0],
          method: methodIDs[key].name,
          gasData: []
        }
      }
    })
    abiDecoder.removeABI(contract._json.abi)
  })

  abis.forEach(abi => abiDecoder.addABI(abi))
  return methodMap
}

module.exports = {
  mapMethodsToContracts: mapMethodsToContracts,
  getMethodID: getMethodID,
  getGasAndPriceRates: getGasAndPriceRates,
  gasToPercentOfLimit: gasToPercentOfLimit,
  generateGasStatsReport: generateGasStatsReport,
  pretty: pretty
}

