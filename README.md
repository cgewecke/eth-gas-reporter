# eth-gas-reporter

[![npm version](https://badge.fury.io/js/eth-gas-reporter.svg)](https://badge.fury.io/js/eth-gas-reporter)
[![Build Status](https://travis-ci.org/cgewecke/eth-gas-reporter.svg?branch=master)](https://travis-ci.org/cgewecke/eth-gas-reporter)

A mocha reporter for Truffle.
+ Gas usage per unit test.
+ Average gas usage per method.
+ Contract deployment costs.
+ Real currency costs.

![screen shot 2017-10-28 at 1 29 52 pm](https://user-images.githubusercontent.com/7332026/32138588-db1d56e0-bbe9-11e7-820e-511d6e36c846.png)



### Install
```javascript
// Truffle installed globally
npm install -g eth-gas-reporter

// Truffle installed locally (ProTip: This always works.)
npm install --save-dev eth-gas-reporter
```

### Truffle config
```javascript
module.exports = {
  networks: {
    ...etc...
  },
  mocha: {
    reporter: 'eth-gas-reporter'
  }
};
```

### Options

You can also create a `.ethgas.js` config in the root directory of your project to set
`gasPrice` and `currency` options. Available currency codes can be found [here](https://coinmarketcap.com/api/).

```javascript
module.exports = {
  currency: "CHF",    // Default: "EUR" (loaded at run-time from the `coinmarketcap` api)
  gasPrice: 21 * 1e9  // Default: (~5 gwei, loaded at run-time from the `blockcypher` api)
}
```

### Examples
+ [gnosis/gnosis-contracts](https://github.com/cgewecke/eth-gas-reporter/blob/master/docs/gnosis.md)
+ [windingtree/LifToken](https://github.com/cgewecke/eth-gas-reporter/blob/master/docs/lifToken.md)

### Usage Notes
+ Table will not print if any tests fail (this is a bug, possibly rooted in `truffle`).
+ Method calls that throw are filtered from the stats.
+ Not currently shown in the `deployments` table:
  + Contracts that link to libraries
  + Contracts that never get instantiated within the tests (e.g: only deployed in migrations)
+ Tests that make assumptions about the value of `block.timestamp` sometimes fail using this utility.
+ Tests run slower.

### Credits
All the ideas in this utility have been borrowed from elsewhere. Many thanks to:
+ [@maurelian](https://github.com/maurelian) - Mocha reporting gas instead of time is his idea.
+ [@cag](https://github.com/cag) - The table borrows from / is based his gas statistics work for the Gnosis contracts.
+ [Neufund](https://github.com/Neufund/ico-contracts) - Block limit size ratios for contract deployments and euro pricing are borrowed from their `ico-contracts` test suite.
