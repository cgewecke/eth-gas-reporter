/**
 * Configuration defaults
 */

class Config {
  constructor(options = {}) {
    this.blockLimit = 6718946;
    this.defaultGasPrice = 5;

    this.currency = options.currency || "eur";
    this.ethPrice = options.ethPrice || null;
    this.gasPrice = options.gasPrice || null;
    this.outputFile = options.outputFile || null;
    this.rst = options.rst || false;
    this.rstTitle = options.rstTitle || "";
    this.showTimeSpent = options.showTimeSpent || false;
    this.srcPath = options.src || "contracts";
    this.artifactType = options.artifactType || "truffle-v5";
    this.noColors = options.noColors;
    this.proxyResolver = options.proxyResolver || null;
    this.codechecks = options.codechecks || false;

    this.excludeContracts = Array.isArray(options.excludeContracts)
      ? options.excludeContracts
      : [];

    this.onlyCalledMethods = options.onlyCalledMethods === false ? false : true;

    this.url = options.url || this.resolveClientUrl(options);
  }

  /**
   * Tries to obtain the client url reporter's sync-requests will
   * target. If url is ws://, http:// must be substituted.
   * @param  {Object} options mocha's reporterOptions
   * @return {String}         url e.g http://localhost:8545
   */
  resolveClientUrl(options) {
    // Case: web3 globally available in mocha test context
    try {
      if (web3 && web3.currentProvider) {
        const cp = web3.currentProvider;

        // Truffle/Web3 http
        if (cp.host) return cp.host;

        // Truffle/Web3 websockets
        if (cp.connection) return cp.connection.url.replace("ws://", "http://");

        // Buildler web3 plugin
        // Per #116 another possibility is
        // `config.networks[buidlerArguments.network].url`
        if (cp._provider && cp._provider.provider && cp._provider.provider.host)
          return cp._provider.provider.host;
      }
    } catch (err) {
      // Web3 undefined
    }

    // Case: Failure
    const msg =
      `ERROR: eth-gas-reporter was unable to resolve a client url ` +
      `from the provider available in your test context. Try setting the ` +
      `url as a mocha reporter option (ex: url='http://localhost:8545')`;

    log(message);
    process.exit(1);
  }
}

module.exports = Config;
