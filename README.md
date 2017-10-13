# eth-gas-reporter

![screen shot 2017-10-12 at 8 02 57 pm](https://user-images.githubusercontent.com/7332026/31528529-b0d52178-af88-11e7-9c58-004ba4a7b360.png)


### Install
```javascript
// Truffle/mocha installed globally
npm install -g eth-gas-reporter

// Truffle/mocha installed locally
npm install --save-dev eth-gas-reporter
```

### Configure for truffle
```javascript
module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter'
  }
};
```
