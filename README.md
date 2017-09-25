# eth-gas-reporter


![metacoingas2](https://user-images.githubusercontent.com/7332026/30790579-874eccc6-a161-11e7-90f9-3a08de72b1c7.png)


### Install
```javascript
// Mocha installed globally
npm install -g eth-gas-reporter

// Mocha installed locally
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

### Run without truffle
```
mocha --reporter eth-gas-reporter
```

