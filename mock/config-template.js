module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      websockets: process.env.TEST === "integration" ? true : false
    }
  },
  mocha: {
    reporter: "eth-gas-reporter",
    reporterOptions: {
      currency: "chf",
      gasPrice: 21,
      token: "ETH",
      gasPriceApi:
        "https://api-cn.etherscan.com/api?module=proxy&action=eth_gasPrice&apikey=YourApiKeyToken",
      onlyCalledMethods: false,
      noColors: true,
      rst: true,
      rstTitle: "Gas Usage",
      showTimeSpent: true,
      excludeContracts: ["Migrations"],
      proxyResolver: "EtherRouter",
      codechecks: true,
      showMethodSig: true
    }
  }
};
