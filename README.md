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
npm install --save-dev eth-gas-reporter
```

### Truffle config
```javascript
module.exports = {
  networks: {
    ...etc...
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'CHF',
      gasPrice: 21
    }
  }
};
```

### Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| currency | *String* | 'EUR' | National currency to represent gas costs in. Exchange rates loaded at runtime from the `coinmarketcap` api. Available currency codes can be found [here](https://coinmarketcap.com/api/). |
| gasPrice | *Number* | (varies) | Denominated in `gwei`. Default is loaded at runtime from the `eth gas station` api |
| outputFile | *String* | stdout | File path to write report output to |
| noColors | *Boolean* | false | Suppress report color. Useful if you are printing to file b/c terminal colorization corrupts the text. |
| onlyCalledMethods | *Boolean* | false | Omit methods that are never called from report. |
| rst | *Boolean* | false | Output with a reStructured text code-block directive. Useful if you want to include report in RTD |
| rstTitle | *String* | "" | Title for reStructured text header (See Travis for example output) |
| showTimeSpent | *Boolean* | false | Show the amount of time spent as well as the gas consumed |


### Examples
+ [gnosis/gnosis-contracts](https://github.com/cgewecke/eth-gas-reporter/blob/master/docs/gnosis.md)
+ [windingtree/LifToken](https://github.com/cgewecke/eth-gas-reporter/blob/master/docs/lifToken.md)

### Usage Notes
+ Requires Node >= 8.
+ Method calls that throw are filtered from the stats.
+ Not currently shown in the `deployments` table:
  + Contracts that never get instantiated within the tests (e.g: only deployed in migrations)
  + Contracts that are only ever created by other contracts within Solidity.
+ Your ethereum client has to be run in separate process (e.g. reporter will not work if you connect 
  to `ganache` through a `provider` in your `truffle.js`). This because mocha's reporter is sync
  and we have to collect gas data synchronously from the client as your tests run. Sync requests 
  fail with an in memory provider because they block the thread and prevent a 
  response. (Pro-tip courtesy of [@fosgate29](https://github.com/fosgate29)).

### Contributions
Please feel free to open a PR (or an issue) for anything. The units are an integration test and one of them is expected to fail, verifying that the table prints at the end of a suite even when there are errors. If you're adding an option, you can vaildate it in CI by adding it to the mock options config located [here](https://github.com/cgewecke/eth-gas-reporter/blob/master/mock/config-template.js#L13-L19). 

### Credits
All the ideas in this utility have been borrowed from elsewhere. Many thanks to:
+ [@maurelian](https://github.com/maurelian) - Mocha reporting gas instead of time is his idea.
+ [@cag](https://github.com/cag) - The table borrows from / is based his gas statistics work for the Gnosis contracts.
+ [Neufund](https://github.com/Neufund/ico-contracts) - Block limit size ratios for contract deployments and euro pricing are borrowed from their `ico-contracts` test suite.

### Contributors
+ [@cgewecke](https://github.com/cgewecke)
+ [@rmuslimov](https://github.com/rmuslimov)
+ [@area](https://github.com/area)
+ [@ldub](https://github.com/ldub)
