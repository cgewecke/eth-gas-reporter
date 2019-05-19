/**
 * Configuration defaults
 */
class Config{
  constructor(options={}){
    this.blockLimit = 6718946;
    this.defaultGasPrice = 5;

    this.currency =      options.currency || 'eur'
    this.ethPrice =      options.ethPrice || null
    this.gasPrice =      options.gasPrice || null
    this.outputFile =    options.outputFile || null
    this.rst =           options.rst || false
    this.rstTitle =      options.rstTitle || '';
    this.showTimeSpent = options.showTimeSpent || false
    this.srcPath =       options.src || 'contracts';
    this.noColors =      options.noColors;


    this.onlyCalledMethods = (options.onlyCalledMethods === false)
      ? false
      : true;

    this.checkHost();
  }

  // TRUFFLE SPECIFIC
  checkHost(){
    if (!(web3.currentProvider.connection || web3.currentProvider.host)) {
      const message = `ERROR: ` +
                      `eth-gas-reporter was unable to resolve a client url ` +
                      `from the provider available in your test context. `
      log(message);
      process.exit(1);
    }
  }
}

module.exports = Config;