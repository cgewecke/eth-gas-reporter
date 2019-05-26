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
    let deployed;
    let deployedBytecode;
    const contract = {};
    const artifact = artifacts.require(contractName);

    // Temporary (buidler)
    try {
      deployedBytecode = artifact.deployedBytecode;
    } catch (err) {
      //
    }

    contract.abi = artifact.abi;
    contract.bytecode = this._normalizeBytecode(artifact.bytecode);
    contract.deployedBytecode = this._normalizeBytecode(deployedBytecode);

    if (artifact.networks && artifact.networks.length) {
      deployed = artifact.networks[this.networkId];
    }

    // Migrations deployed data
    if (deployed) {
      contract.deployed = {
        address: deployed.address,
        transactionHash: deployed.transactionHash
      };
    }

    return contract;
  }

  _normalizeBytecode(code) {
    if (typeof code === "string" && code.length && !this._isHexPrefixed(code)) {
      return `0x${code}`;
    } else if (!code) {
      return `0x`;
    } else {
      return code;
    }
  }

  _isHexPrefixed(str) {
    return str.slice(0, 2) === "0x";
  }
}

module.exports = Artifactor;
