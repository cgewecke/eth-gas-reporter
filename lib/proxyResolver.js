const ethers = require("ethers");
const SyncRequest = require("./syncRequest");

class ProxyResolver {
  constructor(data, config) {
    this.unresolvedCalls = 0;
    this.data = data;
    this.sync = new SyncRequest(config.url);

    if (typeof config.proxyResolver === "function") {
      this.resolve = config.proxyResolver.bind(this);
    } else if (config.proxyResolver === "EtherRouter") {
      this.resolve = this._etherRouter;
    } else if (config.proxyResolver === "ZOS@2") {
      this.resolve = this._zos2;
    } else {
      this.resolve = this._default;
    }
  }

  /**
   * Searches all known contracts for the method signature and returns the first
   * found (if any). Undefined if none
   * @param  {Object} transaction result of web3.eth.getTransaction
   * @return {String}             contract name
   */
  _default(transaction) {
    const signature = transaction.input.slice(2, 10);
    const matches = this.data.getAllContractsWithMethod(signature);

    if (matches.length >= 1) return matches[0].contract;
  }

  /**
   * Queries EtherRouter for address of resolver.
   * Queries Resolver for contract address w/ method signature.
   * Returns contract name matching the resolved address.
   * @param  {Object} transaction result of web3.eth.getTransaction
   * @return {String}             contract name
   */
  _etherRouter(transaction) {
    let contractAddress;
    try {
      const ABI = ["function resolver()", "function lookup(bytes4 sig)"];

      const iface = new ethers.utils.Interface(ABI);
      const signature = transaction.input.slice(0, 10);

      // EtherRouter.resolver
      const resolverAddress = this.sync.call(
        {
          to: transaction.to,
          data: iface.functions.resolver.encode([])
        },
        transaction.blockNumber
      );

      // Resolver.lookup(sig)
      contractAddress = this.sync.call(
        {
          to: ethers.utils.hexStripZeros(resolverAddress),
          data: iface.functions.lookup.encode([signature])
        },
        transaction.blockNumber
      );
    } catch (err) {
      this.unresolvedCalls++;
      return this._default(transaction);
    }

    // Geth returns `undefined` for Truffle's solidity tests here.
    if (contractAddress) {
      return ethers.utils.hexStripZeros(contractAddress);
    }
  }
}

module.exports = ProxyResolver;
