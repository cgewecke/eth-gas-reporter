/**
 * Synchronizing RPC wrapper. Necessary because truffle reverts between contract suites,
 * mocha doesn't support async methods in the reporter, and web3 / other JS interfaces to
 * the client are moving away from sync methods.
 *
 * @author: Alex Rea, <github.com/area>
 */

const syncRequest = require('sync-request');

const sync = {
  getNetworkId: () => {
    return sync.request('net_version', []);
  },

  getCode: (address) => {
    return sync.request('eth_getCode', [address, 'latest'])
  },

  getLatestBlock: () => {
    return sync.request('eth_getBlockByNumber', ['latest', false]);
  },

  getBlockByNumber: (number) => {
    const hexNumber = `0x${number.toString(16)}`
    return sync.request('eth_getBlockByNumber', [hexNumber, false]);
  },

  blockNumber: () => {
    const block = sync.getLatestBlock();
    return parseInt(block.number, 16);
  },

  getTransactionByHash(tx){
    return sync.request('eth_getTransactionByHash', [tx]);
  },

  getTransactionReceipt(tx){
    return sync.request('eth_getTransactionReceipt', [tx]);
  },

  request: (method, params) => {
    const payload = {
      json: {
        "jsonrpc":"2.0",
        "method":method,
        "params":params,
        "id":1
      }
    };

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
