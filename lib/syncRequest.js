const syncRequest = require('sync-request');
/**
 * An extensible set of sync RPC calls. Synchronicity is necessary to handle build tools that
 * revert between contract suites, among other things. Mocha doesn't support async methods
 * in the reporter hook. No modern ethereum providers (web3, ethers) support synchronous methods
 * either so we need to execute them ourselves
 *
 * @author: Alex Rea, <github.com/area>
 */

class Sync {

  getNetworkId(){
    return this.request('net_version', []);
  }

  getCode(address){
    return this.request('eth_getCode', [address, 'latest'])
  }

  getLatestBlock(){
    return this.request('eth_getBlockByNumber', ['latest', false]);
  }

  getBlockByNumber(number){
    const hexNumber = `0x${number.toString(16)}`
    return this.request('eth_getBlockByNumber', [hexNumber, false]);
  }

  blockNumber(){
    const block = this.getLatestBlock();
    return parseInt(block.number, 16);
  }

  getTransactionByHash(tx){
    return this.request('eth_getTransactionByHash', [tx]);
  }

  getTransactionReceipt(tx){
    return this.request('eth_getTransactionReceipt', [tx]);
  }

  request(method, params){
    const payload = {
      json: {
        "jsonrpc":"2.0",
        "method":method,
        "params":params,
        "id":1
      }
    };

    // FIX THIS FOR BUIDLER >>> externalize, constructor whatever.
    let host = web3.currentProvider.host;
    if (!host){
      host = web3
        .currentProvider
        .connection
        .url
        .replace('ws://', 'http://')
    }

    const res = syncRequest('POST', host, payload);
    return JSON.parse(res.getBody('utf8')).result;
  }
}

module.exports = sync;
