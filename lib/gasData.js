const abiDecoder = require("abi-decoder");
const sha1 = require("sha1");
const utils = require("./utils");
const SyncRequest = require("./syncRequest");
const Artifactor = require("./artifactor");

/**
 * Data store written to by TransactionWatcher and consumed by the GasTable.
 */
class GasData {
  constructor() {
    this.methods = {};
    this.deployments = [];
    this.codeHashMap = {};
    this.abis = [];
    this.blockLimit;
    this.sync;
  }

  /**
   * + Parses the .sol files in the config.srcPath directory to obtain contract names.
   * + Gets abis & bytecode for those assets via Artifactor.
   * + Compiles pre-test gas usage (e.g. from `truffle migrate`)
   * + Sets up data structures to store deployments and methods gas usage
   * + Called in the mocha `start` hook to guarantee it's run later than pre-test deployments
   * @param  {Object} config
   */
  initialize(config) {
    this.sync = new SyncRequest(config.url);
    const artifactor = new Artifactor(config);

    const files = utils.listSolidityFiles(config.srcPath);

    // Get the current blockLimit;
    // TODO: This shouldn't be here - should be on the config object &
    // fetched when the table is written or something.
    const block = this.sync.getLatestBlock();
    this.blockLimit = utils.gas(block.gasLimit);

    files.forEach(file => {
      utils
        .getContractNames(file)
        .filter(name => !config.excludeContracts.includes(name))
        .forEach(name => {
          let contract;
          try {
            contract = artifactor.require(name);
          } catch (error) {
            return;
          }

          const contractInfo = {
            name: name,
            bytecode: contract.bytecode,
            deployedBytecode: contract.deployedBytecode,
            gasData: []
          };
          this.deployments.push(contractInfo);

          // Report gas used during pre-test deployments (ex: truffle migrate)
          if (contract.deployed && contract.deployed.transactionHash) {
            this.trackNameByAddress(name, contract.deployed.address);
            const receipt = this.sync.getTransactionReceipt(
              contract.deployed.transactionHash
            );
            contractInfo.gasData.push(utils.gas(receipt.gasUsed));
          }

          this.abis.push(contract.abi);

          // Decode, getMethodIDs
          abiDecoder.addABI(contract.abi);
          const methodIDs = abiDecoder.getMethodIDs();

          // Create Method Map;
          Object.keys(methodIDs).forEach(key => {
            const isInterface = contract.bytecode === "0x";
            const isConstant = methodIDs[key].constant;
            const isEvent = methodIDs[key].type === "event";
            const hasName = methodIDs[key].name;

            if (hasName && !isConstant && !isEvent && !isInterface) {
              this.methods[name + "_" + key] = {
                key: key,
                contract: name,
                method: methodIDs[key].name,
                gasData: [],
                numberOfCalls: 0
              };
            }
          });
          abiDecoder.removeABI(contract.abi);
        });
    });

    this.abis.forEach(abi => abiDecoder.addABI(abi));
  }

  /**
   * Map a contract name to the sha1 hash of the code stored at an address
   * @param  {String} name    contract name
   * @param  {String} address contract address
   */
  trackNameByAddress(name, address) {
    const code = this.sync.getCode(address);
    const hash = code ? sha1(code) : null;
    this.codeHashMap[hash] = name;
  }

  /**
   * Get the name of the contract stored at contract address
   * @param  {String} address contract address
   * @return {String}         contract name
   */
  getNameByAddress(address) {
    const code = this.sync.getCode(address);
    const hash = code ? sha1(code) : null;
    return this.codeHashMap[hash];
  }

  /**
   * Compares existing contract binaries to the input code for a
   * new deployment transaction and returns the relevant contract.
   * Ignores interfaces.
   * @param  {String} input tx.input
   * @return {Object}       this.deployments entry
   */
  getContractByDeploymentInput(input) {
    if (!input) return null;

    const matches = this.deployments.filter(item =>
      utils.matchBinaries(input, item.bytecode)
    );

    // Filter interfaces
    return matches && matches.length
      ? matches.find(item => item.bytecode !== "0x")
      : null;
  }

  /**
   * Compares code at an address to the deployedBytecode for all
   * compiled contracts and returns the relevant item.
   * Ignores interfaces.
   * @param  {String} code  result of web3.eth.getCode
   * @return {Object}       this.deployments entry
   */
  getContractByDeployedBytecode(code) {
    if (!code) return null;

    const matches = this.deployments.filter(item =>
      utils.matchBinaries(code, item.deployedBytecode)
    );

    // Filter interfaces
    return matches && matches.length
      ? matches.find(item => item.deployedBytecode !== "0x")
      : null;
  }

  /**
   * Returns all contracts with a method matching the requested signature
   * @param  {String}   signature method signature hash
   * @return {Object[]}           this.method entries array
   */
  getAllContractsWithMethod(signature) {
    return Object.values(this.methods).filter(el => el.key === signature);
  }
}

module.exports = GasData;
