# eth-gas-reporter

A mocha reporter for Truffle.
+ Gas usage per unit test. 
+ Average gas usage per method. 
+ Contract deployment costs.
+ Real currency costs.

![screen shot 2017-10-22 at 4 03 57 pm](https://user-images.githubusercontent.com/7332026/31867351-c45a5a80-b742-11e7-98dd-49051684e5fd.png)


### Install
```
// Truffle installed globally
npm install -g eth-gas-reporter

// Truffle installed locally (ProTip: This always works.)
npm install --save-dev eth-gas-reporter
```

### Configure for truffle
```javascript
module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" 
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter'
  }
};
```

### Usage Notes
+ Euro/Eth rates are loaded at run-time from the `coinmarketcap` api
+ Gas prices are `safe-low` and loaded at run-time from the `blockcypher` api
+ Method calls that throw are filtered from the stats.
+ Contracts that link to libraries are not shown in the deployments table.

### Credits
All the ideas in this utility have been borrowed from elsewhere. Many thanks to:
+ [@maurelian](https://github.com/maurelian) - Mocha reporting gas instead of time is his idea.
+ [@cag](https://github.com/cag) - The table borrows from / is based his gas statistics work for the Gnosis contracts. 
+ [Neufund](https://github.com/Neufund/ico-contracts) - Block limit size ratios for contract deployments and euro pricing are borrowed from their `ico-contracts` test suite.
