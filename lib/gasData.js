const utils = require('./utils');

class GasData {
  constructor(){
    this.methods;
    this.deployments;

    // Maps the sha1 hash of contract code obtained by `eth_getCode` to a contract name;
    this.codeHashMap;
  }

  trackNameByAddress(name, address){
    const code = sync.getCode(address);
    const hash = sha1(code);
    this.codeHashMap[hash] = name;
  }

  getNameByAddress(address){
    const code = sync.getCode(address);
    const hash = sha1(code);
    return this.codeHashMap[hash];
  }

  getContractByTransactionInput(input){
    const matches = this.deployments.filter(item => utils.matchBinaries(input, item.binary));

    // Filter interfaces
    return (matches && matches.length)
      ? matches.find(item => item.binary !== '0x')
      : null;
  }

  getAllContractsWithMethod(signature){
    return Object
      .values(this.methods)
      .filter(el => el.key === signature);
  }
}