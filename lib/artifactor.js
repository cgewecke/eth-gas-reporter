const SyncRequest = require("./syncRequest");

/**
 * Extracts assets the reporter consumes (abi, bytecode) from supported artifact formats
 * @example
 * ```
 * const artifactor = new Artifactor(config);
 * const contract = artifactor.require('Example');
 * {
 *   abi: [etc...],
 *   bytecode: "0x" + contract.evm.bytecode.object,                // (solc key name)
 *   deployedBytecode: "0x" + contract.evm.deployedBytecode.object // (solc key name)
 *
 *   // Optional - pre-test contract deployments  e.g from `truffle migrate`
 *   // TODO: We don't need the address if we have the tx hash.
 *   deployed: {
 *     address: "0xabc..",
 *     transactionHash: "Oxabc"
 *   }
 * }
 */
class Artifactor {
  constructor(config) {
    this.type = config.artifactType;
    this.sync = new SyncRequest(config.url);
    this.networkId = this.sync.getNetworkId();
  }

  /**
   * Selects artifact translation strategy
   * @param  {String} contractName
   * @return {Object}              egr artifact
   */
  require(contractName) {
    switch (this.type) {
      case "truffle_v.5.0":
        return this._truffleArtifactor(contractName);
      case "buidler":
      case "ethpm":
      default:
        return this._truffleArtifactor(contractName);
    }
  }

  /**
   * Truffle artifact translator
   * @param  {String} contractName
   * @return {Object}              egr artifact
   */
  _truffleArtifactor(contractName) {
    const contract = {};
    const truffleContract = artifacts.require(contractName);

    contract.abi = truffleContract.abi;
    contract.bytecode = truffleContract.bytecode;
    contract.deployedBytecode = truffleContract.deployedBytecode;

    const deployed = truffleContract.networks[this.networkId];

    // Migrations deployed data
    if (deployed) {
      contract.deployed = {
        address: deployed.address,
        transactionHash: deployed.transactionHash
      };
    }

    return contract;
  }
}

module.exports = Artifactor;
