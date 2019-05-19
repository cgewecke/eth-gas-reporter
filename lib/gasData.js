const abiDecoder = require('abi-decoder');
const sha1 = require('sha1');
const shell = require('shelljs');
const utils = require('./utils');
const SyncRequest = require('./syncRequest');


class GasData {
  constructor(){
    this.methods = {};
    this.deployments = [];
    this.codeHashMap = {};
    this.abis = [];
    this.blockLimit;
    this.sync;
  }

  initialize(truffleArtifacts, config) {
    this.sync = new SyncRequest(config.url);

    const networkId = this.sync.getNetworkId();
    const block = this.sync.getLatestBlock()
    const files = shell.ls(`./${config.srcPath}/**/*.sol`) // Assume shell normalizes?

    // Get the current blockLimit;
    this.blockLimit = utils.gas(block.gasLimit);

    files.forEach(file => {
      utils.getContractNames(file).forEach(name => {
        // TRUFFLE SPECIFIC
        if (name === 'Migrations') return

        // Create Deploy Map:
        let contract

        // TRUFFLE SPECIFIC
        try { contract = truffleArtifacts.require(name) } catch (error) { return }

        const contractInfo = {
          name: name,
          binary: contract.bytecode, // TRUFFLE SPECIFIC
          gasData: []
        }
        this.deployments.push(contractInfo)

        // Report the gas used during initial truffle migration too :
        // TRUFFLE SPECIFIC
        const deployed = contract.networks[networkId]
        if (deployed && deployed.transactionHash) {
          this.trackNameByAddress(name, deployed.address)
          const receipt = this.sync.getTransactionReceipt(deployed.transactionHash);
          contractInfo.gasData.push(utils.gas(receipt.gasUsed));
        }

        // TRUFFLE SPECIFIC
        this.abis.push(contract._json.abi)

        // Decode, getMethodIDs
        // TRUFFLE SPECIFIC
        abiDecoder.addABI(contract._json.abi)
        const methodIDs = abiDecoder.getMethodIDs()

        // Create Method Map;
        // bytecode: "0x" + contract.evm.bytecode.object,
        Object.keys(methodIDs).forEach(key => {
          const isInterface = contract.bytecode === '0x'; // TRUFFLE SPECIFIC
          const isConstant = methodIDs[key].constant
          const isEvent = methodIDs[key].type === 'event'
          const hasName = methodIDs[key].name

          if (hasName && !isConstant && !isEvent && !isInterface) {
            this.methods[name + '_' + key] = {
              key: key,
              contract: name,
              method: methodIDs[key].name,
              gasData: [],
              numberOfCalls: 0
            }
          }
        })
        abiDecoder.removeABI(contract._json.abi)
      })
    });

    this.abis.forEach(abi => abiDecoder.addABI(abi))
  }

  /**
   * Map a contract name to the sha1 hash of the code stored at an address
   * @param  {String} name    contract name
   * @param  {String} address contract address
   */
  trackNameByAddress(name, address){
    const code = this.sync.getCode(address);
    const hash = sha1(code);
    this.codeHashMap[hash] = name;
  }

  /**
   * Get the name of the contract stored at contract address
   * @param  {String} address contract address
   * @return {String}         contract name
   */
  getNameByAddress(address){
    const code = this.sync.getCode(address);
    const hash = sha1(code);
    return this.codeHashMap[hash];
  }

  /**
   * Compares existing contract binaries to the input code for a
   * new deployment transaction and returns the relevant contract.
   * Ignores interfaces.
   * @param  {String} input tx.input
   * @return {Object}       this.deployments entry
   */
  getContractByDeploymentInput(input){
    const matches = this.deployments.filter(item => utils.matchBinaries(input, item.binary));

    // Filter interfaces
    return (matches && matches.length)
      ? matches.find(item => item.binary !== '0x')
      : null;
  }

  /**
   * Returns all contracts with a method matching the requested signature
   * @param  {String}   signature method signature hash
   * @return {Object[]}           this.method entries array
   */
  getAllContractsWithMethod(signature){
    return Object
      .values(this.methods)
      .filter(el => el.key === signature);
  }
}

module.exports = GasData;
