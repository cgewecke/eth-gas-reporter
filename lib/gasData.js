const utils = require('./utils');

class GasData {
  constructor(){
    this.methods;
    this.deployments;
    this.codeHashMap;
  }

  /**
   * Map a contract name to the sha1 hash of the code stored at an address
   * @param  {String} name    contract name
   * @param  {String} address contract address
   */
  trackNameByAddress(name, address){
    const code = sync.getCode(address);
    const hash = sha1(code);
    this.codeHashMap[hash] = name;
  }

  /**
   * Get the name of the contract stored at contract address
   * @param  {String} address contract address
   * @return {String}         contract name
   */
  getNameByAddress(address){
    const code = sync.getCode(address);
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