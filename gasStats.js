const fs = require('fs');
const _ = require('lodash');
const request = require('request-promise-native');
const shell = require('shelljs');
const colors = require('colors');
const gasStatsFile = 'gas-stats.json'
const Table = require('cli-table2');
const reqCwd = require('req-cwd');
const abiDecoder = require('abi-decoder');

function pretty(msg, obj){
  console.log(`<------ ${msg} ------>\n` + JSON.stringify(obj, null, ' '));
  console.log(`<------- END -------->\n`);
}

function getPrice(data,){
  return data.price.usd;
}

function gasToCost(gas, price, gwei){
  return (((gwei * 1e-9) * gas) * price).toFixed(2);
}

async function generateGasStatsReport(methodMap){
  const {
    currency,
    ethPrice,
    gasPrice
  } = getGasAndPriceRates();

  const table = new Table({
    head: [
      '✜✜✜ GAS STATS ✜✜✜'.bold,
      'Method',
      'Min',
      'Max',
      'Avg',
      `${currency} (avg)`
    ]
  });

  _.forEach(methodMap, (contractData, contractName) => {
    if(!contractData) return
    let section = {};
    section[contractName] = [];

    _.forEach(contractData, (fnData, fnName) => {
      fnData.averageGasUsed = fnData.data.reduce((acc, datum) => acc + datum.gasUsed, 0) / fnData.data.length
      const sortedData = _.sortBy(fnData.data, 'gasUsed')
      fnData.min = sortedData[0]
      fnData.max = sortedData[sortedData.length - 1]
      fnData.median = sortedData[(sortedData.length / 2) | 0]
      section[contractName].push(fnName);
      section[contractName].push(fnData.min.gasUsed);
      section[contractName].push(fnData.max.gasUsed);
      section[contractName].push(fnData.averageGasUsed);
      section[contractName].push(0);
    })
    table.push(section);

  })
  shell.rm(gasStatsFile);
  console.log(table.toString());
}

async function getGasAndPriceRates(){
  let ethPrice;
  let gasPrice;
  const defaultGasPrice = 5000000000;

  // Load config
  const config = reqCwd.silent('.ethgas.js') || {}
  const currency = config.currency || 'eur';

  ethPrice = config.ethPrice || null;
  gasPrice = config.gasPrice || null;

  // Currency market data: coinmarketcap
  if (!ethPrice){
    try {
      const ethPrices = await request.get('https://coinmarketcap-nexuist.rhcloud.com/api/eth');
      (!ethPrices.error)
        ? ethPrice = ethPrices.price[currency]
        : ethPrice = null;

    } catch (error) {
      ethPrice = null;
    }
  }

  // Gas price data: blockcypher
  if (!gasPrice){
    try {
      const gasPrices = await request.get('https://api.blockcypher.com/v1/eth/main');
      (!gasPrices.error)
        ? gasPrice = getPrice(marketData)
        : gasPrice = defaultGasPrice;
    } catch (error) {
      gasPrice = defaultGasPrice;
    }
  }

  return {
    currency: currency,
    ethPrice: ethPrice,
    gasPrice: gasPrice
  }
}

function mapMethodsToContracts(truffleArtifacts){
  const names = shell.ls('./contracts/**/*.sol');
  const methodMap = {};
  const abis = [];

  names.forEach(name => {
    // Get all artifacts, make a list of abi s
    name = name.split('.sol')[0];
    const contract = truffleArtifacts.require(name);
    abis.push(contract._json.abi);

    // Decode, getMethodIDs
    abiDecoder.addABI(contract._json.abi);
    const methodIDs = abiDecoder.getMethodIDs();

    // Create Map;
    Object.keys(methodIDs).forEach(key => {
       if (key.name){
         methodMap[key] = {
           contract: name,
           method: key.name,
           gasData: []
         }
       }
    };
    abiDecoder.removeABI(contract._json.abi);
  };

  abis.forEach(abi => abiDecoder.addABI(abi));
  // TODO: Sort alphabetically by contract name.
  return methodMap;
}

function getContractAndMethodName(code){
  const id = code.slice(2, 10);
}
