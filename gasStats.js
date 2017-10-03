const fs = require('fs');
const _ = require('lodash');
var request = require('request-promise-native');
const shell = require('shelljs');
const colors = require('colors');
const gasStatsFile = 'gas-stats.json'
const Table = require('cli-table2');
let abiDecoder = require('abi-decoder');


function getPrice(data){
  return data.price.usd;
}

function gasToCost(gas, price, gwei){
  return (((gwei * 1e-9) * gas) * price).toFixed(2);
}

async function generateGasStatsReport(){
  
  try {
    marketData = await request.get('https://coinmarketcap-nexuist.rhcloud.com/api/eth');
    (!marketData.error)
      ? price = getPrice(marketData)
      : price = null;
  
  } catch (error) {
    price = null;
  }

  let gasStats;

  try {
    gasStats = JSON.parse(fs.readFileSync(gasStatsFile))
  } catch (e) {
    return;
  }

  var table = new Table({ head: ["✜✜✜ GAS STATS ✜✜✜".bold, 'Method', 'Min', 'Max', 'Avg', 'USD (avg)']});
  
  _.forEach(gasStats, (contractData, contractName) => {
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

function pretty(msg, obj){
  console.log(`<------ ${msg} ------>\n` + JSON.stringify(obj, null, ' '));
  console.log(`<------- END -------->\n`);
}

/**
 * Procedure:
 * 1. List all the contracts in the project and artifact.require them into an array;
 * produces an array that looks like:
    [{
      name: "MetaCoin"
      ids: {
       "7bd703e8": {
        "constant": false,
        "inputs": [
         {
          "name": "addr",
          "type": "address"
         }
        ],
        "name": "getBalanceInEth",
        "outputs": [
         {
          "name": "",
          "type": "uint256"
         }
        ],
        "payable": false,
        "type": "function"
       },
       "90b98a11": {
        ...etc...
       },
       ...etc
    }]
 *
 */
function mapMethodsToContracts(truffleArtifacts){

  const names = shell.ls('./contracts/**/*.sol');
  const contractMethodMap = [];
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
    const methodMap = {};
    Object.keys(methodIDs).forEach(key => {
       if (key.name){
         methodMap[key] = {
           contract: name,
           method: key.name,
           gasData: []
         }
       }
    };
    
    // Cleanup
    abiDecoder.removeABI(contract._json.abi);
  };

  abis.forEach(abi => abiDecoder.addABI(abi));
  return contractMethodMap;
}

function getContractAndMethodName(code){
  const id = code.slice(2, 10);
}
