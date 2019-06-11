usePlugin("@nomiclabs/buidler-truffle5");

module.exports = {
  solc: { version: "0.5.5" },
  networks: {
    development: {
      gas: 7000000,
      url: "http://localhost:8545"
    }
  },
  mocha: {
    reporter: "eth-gas-reporter"
  }
};
