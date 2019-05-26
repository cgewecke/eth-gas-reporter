const utils = require("./utils");
const GasData = require("./gasData");
const SyncRequest = require("./syncRequest");
const ProxyResolver = require("./proxyResolver");

/**
 * Tracks blocks and cycles across them, extracting gas usage data and
 * associating it with the relevant contracts, methods.
 */
class TransactionWatcher {
  constructor(config) {
    this.itStartBlock = 0; // Tracks within `it` block transactions (gas usage per test)
    this.beforeStartBlock = 0; // Tracks from `before/beforeEach` transactions (methods & deploys)
    this.data = new GasData();
    this.sync = new SyncRequest(config.url);
    this.resolver = new ProxyResolver(this.data, config);
  }

  /**
   * Cycles across a range of blocks, from beforeStartBlock set in the reporter's
   * `test` hook to current block when it's called. Collect deployments and methods
   * gas usage data.
   * @return {Number} Total gas usage for the `it` block
   */
  blocks() {
    let gasUsed = 0;
    const endBlock = this.sync.blockNumber();

    while (this.beforeStartBlock <= endBlock) {
      let block = this.sync.getBlockByNumber(this.beforeStartBlock);

      if (block) {
        // Track gas used within `it` blocks
        if (this.itStartBlock <= this.beforeStartBlock) {
          gasUsed += utils.gas(block.gasUsed);
        }

        // Collect methods and deployments data
        block.transactions.forEach(tx => {
          const transaction = this.sync.getTransactionByHash(tx);
          const receipt = this.sync.getTransactionReceipt(tx);

          // Omit transactions that throw
          if (parseInt(receipt.status) === 0) return;

          receipt.contractAddress
            ? this._collectDeploymentsData(transaction, receipt)
            : this._collectMethodsData(transaction, receipt);
        });
      }
      this.beforeStartBlock++;
    }
    return gasUsed;
  }

  /**
   * Extracts and stores deployments gas usage data for a tx
   * @param  {Object} transaction return value of `getTransactionByHash`
   * @param  {Object} receipt
   */
  _collectDeploymentsData(transaction, receipt) {
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
  _collectMethodsData(transaction, receipt) {
    let address;
    let contractName = this.data.getNameByAddress(transaction.to);

    // Case: proxied call
    // We have a known contract-name-to-address match & an unknown method ID
    if (this._isProxied(contractName, transaction.input)) {
      contractName = null;
      address = this.resolver.resolve(transaction);

      // Try to match address to known deployment & default to
      // the transaction address if resolver failed.
      address
        ? (contractName = this.data.getNameByAddress(address))
        : (address = transaction.to);
    }

    // Case: unknown contract address
    // Try to create a new deployment record
    if (!contractName) {
      const code = this.sync.getCode(address);
      const match = this.data.getContractByDeploymentInput(code);

      if (match) {
        contractName = match.name;
        this.data.trackNameByAddress(match.name, address);
      }
    }

    const id = utils.getMethodID(contractName, transaction.input);

    if (this.data.methods[id]) {
      this.data.methods[id].gasData.push(utils.gas(receipt.gasUsed));
      this.data.methods[id].numberOfCalls++;
    } else {
      this.resolver.unresolvedCalls++;
    }
  }

  /**
   * Returns true if there is a contract name associated with an address
   * but method can't be matched to it
   * @param  {String}  name  contract name
   * @param  {String}  input code
   * @return {Boolean}
   */
  _isProxied(name, input) {
    return name && !this.data.methods[utils.getMethodID(name, input)];
  }
}

module.exports = TransactionWatcher;
