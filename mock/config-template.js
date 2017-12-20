module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*' // Match any network id
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: "chf",
      gasPrice: 21,
      onlyCalledMethods: true,
      noColors: true
    }
  }
}