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
      this.resolve = this.resolveByMethodSignature;
    }
  }

  /**
   * Searches all known contracts for the method signature and returns the first
   * found (if any). Undefined if none
   * @param  {Object} transaction result of web3.eth.getTransaction
   * @return {String}             contract name
   */
  resolveByMethodSignature(transaction) {
    const signature = transaction.input.slice(2, 10);
    const matches = this.data.getAllContractsWithMethod(signature);

    if (matches.length >= 1) return matches[0].contract;
  }

  /**
   * Tries to match bytecode deployed at address to deployedBytecode listed
   * in artifacts. If found, adds this to the code-hash name mapping and
   * returns name.
   * @param  {String} address contract address
   * @return {String}         contract name
   */
  resolveByDeployedBytecode(address) {
    const code = this.sync.getCode(address);
    const match = this.data.getContractByDeployedBytecode(code);

    if (match) {
      this.data.trackNameByAddress(match.name, address);
      console.log("resolving by deployedBytecode: " + match.name);
      return match.name;
    }
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
    let contractName;

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
      return;
    }

    // Geth returns `undefined` for Truffle's solidity tests here.
    if (contractAddress) {
      contractAddress = ethers.utils.hexStripZeros(contractAddress);
      contractName = this.data.getNameByAddress(contractAddress);

      // Try to resolve by deployedBytecode
      if (contractName) return contractName;
      else return this.resolveByDeployedBytecode(contractAddress);
    }
  }
}

module.exports = ProxyResolver;
