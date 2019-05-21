const fs = require('fs')
const parser = require('solidity-parser-antlr');
const request = require('request-promise-native')

const utils = {
  /**
   * Expresses gas usage as a nation-state currency price
   * @param  {Number} gas      gas used
   * @param  {Number} ethPrice e.g chf/eth
   * @param  {Number} gasPrice in wei e.g 5000000000 (5 gwei)
   * @return {Number}          cost of gas used (0.00)
   */
  gasToCost: function(gas, ethPrice, gasPrice) {
    ethPrice = parseFloat(ethPrice)
    gasPrice = parseInt(gasPrice)
    return ((gasPrice / 1e9) * gas * ethPrice).toFixed(2)
  },

  /**
   * Expresses gas usage as a % of the block gasLimit. Source: NeuFund (see issues)
   * @param  {Number} gasUsed    gas value
   * @param  {Number} blockLimit gas limit of a block
   * @return {Number}            percent (0.0)
   */
  gasToPercentOfLimit: function (gasUsed, blockLimit) {
    return Math.round(1000 * gasUsed / blockLimit) / 10
  },

  /**
   * Generates id for a GasData.methods entry from the input of a web3.eth.getTransaction
   * and a contract name
   * @param  {String} code hex data
   * @return {String}      id
   */
  getMethodID: function (contractName, code) {
    return contractName + '_' + code.slice(2, 10)
  },

  /**
   * Return true if transaction input and bytecode are same, ignoring library link code.
   * @param  {String} code
   * @return {Bool}
   */
  matchBinaries: function (input, bytecode) {
    const regExp = utils.bytecodeToBytecodeRegex(bytecode);
    return (input.match(regExp) !== null);
  },

  /**
   * Generate a regular expression string which is library link agnostic so we can match
   * linked bytecode deployment transaction inputs to the evm.bytecode solc output.
   * @param  {String} bytecode
   * @return {String}
   */
  bytecodeToBytecodeRegex: function (bytecode) {
    const bytecodeRegex = bytecode
      .replace(/__.{38}/g, ".{40}")
      .replace(/73f{40}/g, ".{42}");

    // HACK: Node regexes can't be longer that 32767 characters.
    // Contracts bytecode can. We just truncate the regexes. It's safe in practice.
    const MAX_REGEX_LENGTH = 32767;
    const truncatedBytecodeRegex = bytecodeRegex.slice(0, MAX_REGEX_LENGTH);
    return truncatedBytecodeRegex;
  },

  /**
   * Parses files for contract names
   * @param  {String} filePath path to file
   * @return {String[]}        contract names
  */
  getContractNames: function (filePath){
    const names = [];
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parser.parse(code, {tolerant: true});

    parser.visit(ast, {
      ContractDefinition: function(node) {
        names.push(node.name);
      }
    });

    return names;
  },

  /**
   * Converts hex gas to decimal
   * @param  {Number} val hex gas returned by RPC
   * @return {Number}     decimal gas consumed by human eyes.
   */
  gas: function (val){
    return parseInt(val, 16);
  },

  /**
   * Fetches gasPrices from ethgasstation (defaults to the lowest safe gas price)
   * and current market value of eth in currency specified by the config from
   * coinmarketcap (defaults to euros). Sets config.ethPrice, config.gasPrice unless these
   * are already set as constants in the reporter options
   * @param  {Object} config
  */
  setGasAndPriceRates: async function (config) {
    const ethgasstation = `https://ethgasstation.info/json/ethgasAPI.json`
    const coinmarketcap = `https://api.coinmarketcap.com/v1/ticker/ethereum/?convert=`

    const currencyPath = `${coinmarketcap}${config.currency.toUpperCase()}`
    const currencyKey = `price_${config.currency.toLowerCase()}`

    // Currency market data: coinmarketcap
    if (!config.ethPrice) {
      try {
        let response = await request.get(currencyPath)
        response = JSON.parse(response)
        config.ethPrice = response[0][currencyKey]
      } catch (error) {
        config.ethPrice = null
      }
    }

    // Gas price data: ethgasstation
    if (!config.gasPrice) {
      try {
        let response = await request.get(ethgasstation)
        response = JSON.parse(response)
        config.gasPrice = Math.round(response.safeLow / 10);
      } catch (error) {
        config.gasPrice = config.defaultGasPrice
      }
    }
  },

  // Debugging helper
  pretty: function (msg, obj) {
    console.log(`<------ ${msg} ------>\n` + JSON.stringify(obj, null, ' '))
    console.log(`<------- END -------->\n`)
  }
}

module.exports = utils;

