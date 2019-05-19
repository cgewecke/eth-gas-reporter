const SyncRequest = require('./syncRequest');

/**
 * Provides translation logic between what the reporter needs to and
 * various artifact formats.
 * @example
 * ```
 * const artifactor = new Artifactor(config);
 * const contract = artifactor.require('Example');
 * {
 *   abi: [etc...],
 *   bytecode: "0x" + contract.evm.bytecode.object,
 *
 *   // Optional - pre-test contract deployments  e.g from `truffle migrate`
 *   deployed: {
 *     address: "0xabc..",
 *     transactionHash: "Oxabc"
 *   }
 * }
 */
class Artifactor {
  constructor(config){
    this.type = config.artifactType;
    this.sync = new SyncRequest(config.url);
    this.networkId = this.sync.getNetworkId();
  }

  /**
   * Selects artifact translation strategy
   * @param  {String} contractName
   * @return {Object}              egr artifact
   */
  require(contractName){
    switch(this.type){
      case 'truffle_v.5.0': return this._truffleArtifactor(contractName);
      case 'buidler':
      case 'ethpm':
      default: return this._truffleArtifactor(contractName);
    }
  }

  /**
   * Truffle artifact translator
   * @param  {String} contractName
   * @return {Object}              egr artifact
   */
  _truffleArtifactor(contractName){
    const contract = {};
    const truffleContract = artifacts.require(contractName);

    // Note: bytecode: "0x" + contract.evm.bytecode.object,
    contract.abi = truffleContract.abi;
    contract.bytecode = truffleContract.bytecode;

    const deployed = truffleContract.networks[this.networkId];

    // Migrations deployed data
    if (deployed){
      contract.deployed = {
        address: deployed.address,
        transactionHash: deployed.transactionHash
      }
    }

    return contract;
  }
}

module.exports = Artifactor;