# eth-gas-reporter

Gas....

### Install
```
npm install --save-dev eth-gas-reporter
```

### Configure
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

### Outside of truffle
```
mocha --reporter eth-gas-reporter
```

