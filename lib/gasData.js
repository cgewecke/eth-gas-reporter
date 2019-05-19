const abiDecoder = require('abi-decoder');
const sha1 = require('sha1');
const shell = require('shelljs');
const utils = require('./utils');
const SyncRequest = require('./syncRequest');
const Artifactor = require('./artifactor');


class GasData {
  constructor(){
    this.methods = {};
    this.deployments = [];
    this.codeHashMap = {};
    this.abis = [];
    this.blockLimit;
    this.sync;
  }

  initialize(config) {
    console.log('running initialize')
    this.sync = new SyncRequest(config.url);
    const artifactor = new Artifactor(config);

    const block = this.sync.getLatestBlock()
    const files = shell.ls(`./${config.srcPath}/**/*.sol`) // Assume shell normalizes?

    // Get the current blockLimit;
    this.blockLimit = utils.gas(block.gasLimit);

    files.forEach(file => {
      utils.getContractNames(file).forEach(name => {
        let contract;

        if (name === 'Migrations') return

        try { contract = artifactor.require(name) } catch (error) {
          console.log(error)
          return
        }

        const contractInfo = {
          name: name,
          binary: contract.bytecode,
          gasData: []
        }
        this.deployments.push(contractInfo)

        // Report gas used during pre-test deployments (ex: truffle migrate)
        if (contract.deployed && contract.deployed.transactionHash) {
          this.trackNameByAddress(name, contract.deployed.address)
          const receipt = this.sync.getTransactionReceipt(contract.deployed.transactionHash);
          contractInfo.gasData.push(utils.gas(receipt.gasUsed));
        }

        this.abis.push(contract.abi)

        // Decode, getMethodIDs
        abiDecoder.addABI(contract.abi)
        const methodIDs = abiDecoder.getMethodIDs()

        // Create Method Map;
        Object.keys(methodIDs).forEach(key => {
          const isInterface = contract.bytecode === '0x';
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
        abiDecoder.removeABI(contract.abi)
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
