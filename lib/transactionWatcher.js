const utils = require('./utils');
const GasData = require('./gasData');
const SyncRequest = require('./syncRequest');

/**
 * Tracks blocks and cycles across them, extracting gas usage data and
 * associating it with the relevant contracts, methods.
 *
 * TO DO: At the moment this runs separate sweeps for deployments and
 * methods (at twice the time cost) because it's stupid. The only thing
 * that has to be kept separate is the per-it-block total gas usage.
 * COLLAPSE THESE
 */
class TransactionWatcher {
  constructor(config){
    this.itStartBlock = 0;     // Tracks within `it` block transactions (gas usage per test)
    this.beforeStartBlock = 0; // Tracks from `before/beforeEach` transactions (methods & deploys)
    this.data = new GasData();
    this.sync = new SyncRequest(config.url)
  }

  /**
   * Cycles across a range of blocks, from beforeStartBlock set in the reporter's
   * `test` hook to current block when it's called. Collect deployments and methods
   * gas usage data.
   * @return {Number} Total gas usage for the `it` block
   */
  blocks(){
    let gasUsed = 0;
    const self = this;
    const endBlock = this.sync.blockNumber();

    while (this.beforeStartBlock <= endBlock) {
      let block = this.sync.getBlockByNumber(this.beforeStartBlock);

      if (block) {
        // Track gas used within `it` blocks
        if (this.itStartBlock <= this.beforeStartBlock){
          gasUsed += utils.gas(block.gasUsed);
        }

        // Collect methods and deployments data
        block.transactions.forEach(tx => {
          const transaction = self.sync.getTransactionByHash(tx);
          const receipt = self.sync.getTransactionReceipt(tx);

          // Omit transactions that throw
          if (parseInt(receipt.status) === 0) return;

          (receipt.contractAddress)
            ? self._collectDeploymentsData(transaction, receipt)
            : self._collectMethodsData(transaction, receipt);
        })
      }
      this.beforeStartBlock++
    }
    return gasUsed
  }

  /**
   * Extracts and stores deployments gas usage data for a tx
   * @param  {Object} transaction return value of `getTransactionByHash`
   * @param  {Object} receipt
   */
  _collectDeploymentsData(transaction, receipt){
    const match = this.data.getContractByDeploymentInput(transaction.input);

    if (match) {
      this.data.trackNameByAddress(match.name, receipt.contractAddress);
      match.gasData.push(utils.gas(receipt.gasUsed));
    }
  }

  /**
   * Extracts and stores methods gas usage data for a tx
   * @param  {Object} transaction return value of `getTransactionByHash`
   * @param  {Object} receipt
   */
  _collectMethodsData(transaction, receipt){
    let isProxied = false;
    let contractName = this.data.getNameByAddress(transaction.to);

    if (contractName) {
      let candidateId = utils.getMethodID(contractName, transaction.input)
      isProxied = !this.data.methods[candidateId]
    }

    // If unfound, search by method signature alone. These often shadow
    // each other so this is isn't accurate.
    if (!contractName || isProxied ) {
      const signature = transaction.input.slice(2, 10);
      const matches = this.data.getAllContractsWithMethod(signature);

      if (matches.length >= 1) {
        contractName = matches[0].contract;
      }
    }

    const id = utils.getMethodID(contractName, transaction.input)

    if (this.data.methods[id]) {
      this.data.methods[id].gasData.push(utils.gas(receipt.gasUsed));
      this.data.methods[id].numberOfCalls++;
    }
  }
}

module.exports = TransactionWatcher;

