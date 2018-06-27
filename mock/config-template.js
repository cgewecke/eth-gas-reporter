module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      websockets: true
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: "chf",
      gasPrice: 21,
      onlyCalledMethods: true,
      noColors: true,
      rst: true,
      rstTitle: 'Gas Usage',
      showTimeSpent: true
    }
  }
}