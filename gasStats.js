/**
 * Methods to generate gas data.
 */

const colors = require('colors/safe')
const _ = require('lodash')
const path = require('path')
const fs = require('fs')
const request = require('request-promise-native')
const shell = require('shelljs')
const abiDecoder = require('abi-decoder')
const sync = require('./lib/syncRequest');
const sha1 = require('sha1')

/**
 * We fetch these async from remote sources / config when the reporter loads because
 * for unknown reasons mocha exits prematurely if any of the tests fail.
 */
let currency;
let gasPrice;
let ethPrice;
let onlyCalledMethods;
let outputFile;
let rst;
let rstTitle;

/**
 * block.gasLimit. Set to a default at declaration but set to the rpc's declared limit
 * at `mapMethodsToContracts`
 * @type {Number}
 */
let blockLimit = 6718946

/**
 * Formats and prints a gas statistics table. Optionally writes to a file.
 * Based on Alan Lu's stats for Gnosis
 * @param {Object} @extension_for [class]
 */


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
async function getGasAndPriceRates (config={}) {

  const defaultGasPrice = 5

  // Global to this file...
  currency = config.currency || 'eur'
  ethPrice = config.ethPrice || null
  gasPrice = config.gasPrice || null
  onlyCalledMethods = (config.onlyCalledMethods === false) ? false : true;
  outputFile = config.outputFile || null
  rst = config.rst || false
  rstTitle = config.rstTitle || '';
  colors.enabled = !config.noColors || false

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
function mapMethodsToContracts (truffleArtifacts, srcPath) {
  const methodMap = {}
  const deployMap = []
  const contractNameFromCodeHash = {}
  const abis = []

  const block = sync.getLatestBlock()
  blockLimit = parseInt(block.gasLimit, 16);

  const networkId = sync.getNetworkId();

  const files = shell.ls('./' + srcPath + '/**/*.sol')

  // For each file
  files.forEach(file => {
    names = getContractNames(file);

    // For each contract in file
    names.forEach(name => {
      if (name === 'Migrations') return

      // Create Deploy Map:
      let contract
      try { contract = truffleArtifacts.require(name) } catch (error) { return }

      const contractInfo = {
        name: name,
        binary: contract.unlinked_binary,
        gasData: []
      }
      deployMap.push(contractInfo)

      // Report the gas used during initial truffle migration too :
      const networkDeployment = contract.networks[networkId]
      if (networkDeployment && networkDeployment.transactionHash) {
        const code = sync.getCode(networkDeployment.address);
        const hash = sha1(code);
        contractNameFromCodeHash[hash] = name;
        const receipt = sync.getTransactionReceipt(networkDeployment.transactionHash);
        contractInfo.gasData.push(parseInt(receipt.gasUsed, 16));
      }

      abis.push(contract._json.abi)

      // Decode, getMethodIDs
      abiDecoder.addABI(contract._json.abi)
      const methodIDs = abiDecoder.getMethodIDs()

      // Create Method Map;
      Object.keys(methodIDs).forEach(key => {
        const isInterface = contract.unlinked_binary === '0x';
        const isConstant = methodIDs[key].constant
        const isEvent = methodIDs[key].type === 'event'
        const hasName = methodIDs[key].name

        if (hasName && !isConstant && !isEvent && !isInterface) {
          methodMap[name + '_' + key] = {
            key: key,
            contract: name,
            method: methodIDs[key].name,
            gasData: [],
            numberOfCalls: 0
          }
        }
      })
      abiDecoder.removeABI(contract._json.abi)
    })
  });

  abis.forEach(abi => abiDecoder.addABI(abi))
  return {
    methodMap: methodMap,
    deployMap: deployMap,
    contractNameFromCodeHash: contractNameFromCodeHash
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
  matchBinaries: matchBinaries,
  pretty: pretty
}
