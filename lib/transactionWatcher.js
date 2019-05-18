const sync = require('./syncRequests');
const utils = require('./utils');
const GasData = require('./gasData');

/**
 * Tracks blocks and cycles across them, extracting gas usage data and
 * associating it with the relevant contracts, methods.
 */
class TransactionWatcher {
  constructor(config){
    this.itStartBlock = 0;     // Tracks within `it` block transactions (methods & deploys)
    this.beforeStartBlock = 0; // Tracks from `before/beforeEach` transactions (deploys only)
    this.data = new GasData();
  }

  gas(val){
    return parseInt(val, 16);
  }

  methods(){
    let gasUsed = 0
    const endBlock = sync.blockNumber();

    while (this.itStartBlock <= endBlock) {
      let block = sync.getBlockByNumber(this.itStartBlock);

      if (block) {
        // Add to running tally for this test
        gasUsed += this.gas(block.gasUsed);

        // Compile per method stats
        this.data.methods && block.transactions.forEach(tx => {
          const transaction = sync.getTransactionByHash(tx);
          const receipt = sync.getTransactionReceipt(tx);

          // Omit methods that throw or deployments
          if (parseInt(receipt.status) === 0 || receipt.contractAddress) return;

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
            this.data.methods[id].gasData.push(this.gas(receipt.gasUsed));
            this.data.methods[id].numberOfCalls++;
          }
        })
      }
      this.itStartBlock++
    }
    return gasUsed
  }

  deployments(){
    const endBlock = sync.blockNumber();

    while (this.beforeStartBlock <= endBlock) {
      let block = sync.getBlockByNumber(this.beforeStartBlock);

      block && block.transactions.forEach(tx => {
        const receipt = sync.getTransactionReceipt(tx);

        if (receipt.contractAddress) {
          const transaction = sync.getTransactionByHash(tx)
          const match = this.data.getContractByTransactionInput(transaction.input);

          if (match) {
            this.data.trackNameByAddress(match.name, receipt.contractAddress);
            match.gasData.push(this.gas(receipt.gasUsed));
          }
        }
      })
      this.beforeStartBlock++
    }
  }
}

