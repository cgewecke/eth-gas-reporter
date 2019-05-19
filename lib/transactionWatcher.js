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
    this.itStartBlock = 0;     // Tracks within `it` block transactions (methods & deploys)
    this.beforeStartBlock = 0; // Tracks from `before/beforeEach` transactions (deploys only)
    this.data = new GasData();
    this.sync = new SyncRequest(config.url)
  }

  /**
   * Tracks intra-test (it block) method calls.
   * @return {Number} Total gas usage for the `it` block
   */
  methods(){
    let gasUsed = 0
    const self = this
    const endBlock = this.sync.blockNumber();

    while (this.itStartBlock <= endBlock) {
      let block = this.sync.getBlockByNumber(this.itStartBlock);

      if (block) {
        // Add to running tally for this test
        gasUsed += utils.gas(block.gasUsed);

        // Compile per method stats
        block.transactions.forEach(tx => {

          const transaction = self.sync.getTransactionByHash(tx);
          const receipt = self.sync.getTransactionReceipt(tx);

          // Omit methods that throw or deployments
          if (parseInt(receipt.status) === 0 || receipt.contractAddress) return;

          let isProxied = false;
          let contractName = self.data.getNameByAddress(transaction.to);

          if (contractName) {
            let candidateId = utils.getMethodID(contractName, transaction.input)
            isProxied = !self.data.methods[candidateId]
          }

          // If unfound, search by method signature alone. These often shadow
          // each other so this is isn't accurate.
          if (!contractName || isProxied ) {
            const signature = transaction.input.slice(2, 10);
            const matches = self.data.getAllContractsWithMethod(signature);

            if (matches.length >= 1) {
              contractName = matches[0].contract;
            }
          }

          const id = utils.getMethodID(contractName, transaction.input)

          if (self.data.methods[id]) {
            self.data.methods[id].gasData.push(utils.gas(receipt.gasUsed));
            self.data.methods[id].numberOfCalls++;
          }

        })
      }
      this.itStartBlock++
    }
    return gasUsed
  }

  /**
   * Tracks deployments, including those executed in a before/beforeEach block
   */
  deployments(){
    const self = this;
    const endBlock = this.sync.blockNumber();

    while (this.beforeStartBlock <= endBlock) {
      let block = this.sync.getBlockByNumber(this.beforeStartBlock);

      block && block.transactions.forEach(tx => {
        const receipt = self.sync.getTransactionReceipt(tx);

        if (receipt.contractAddress) {
          const transaction = self.sync.getTransactionByHash(tx)
          const match = self.data.getContractByDeploymentInput(transaction.input);

          if (match) {
            self.data.trackNameByAddress(match.name, receipt.contractAddress);
            match.gasData.push(utils.gas(receipt.gasUsed));
          }
        }
      })
      this.beforeStartBlock++
    }
  }
}

module.exports = TransactionWatcher;

