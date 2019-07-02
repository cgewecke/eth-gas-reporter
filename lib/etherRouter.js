const ethers = require("ethers");

/**
 * Example of a method that resolves the contract
 * names of method calls routed through an EtherRouter style contract. This function
 * gets bound to the `this` property of eth-gas-reporter's ProxyResolver class and
 * inherits its resources including helpers to match methods to contracts and a way
 * of making synchronous calls to the client.
 *
 * Queries EtherRouter for address of resolver.
 * Queries Resolver for contract address w/ method signature.
 * Returns contract name matching the resolved address.
 * @param  {Object} transaction result of web3.eth.getTransaction
 * @return {String}             contract name
 */
function etherRouter(transaction) {
  let contractAddress;
  let contractName;

  try {
    const ABI = ["function resolver()", "function lookup(bytes4 sig)"];
    const iface = new ethers.utils.Interface(ABI);
    const signature = transaction.input.slice(0, 10);

    // EtherRouter.resolver
    const resolverAddress = this.sync.call(
      {
        to: transaction.to,
        data: iface.functions.resolver.encode([])
      },
      transaction.blockNumber
    );

    // Resolver.lookup(sig)
    contractAddress = this.sync.call(
      {
        to: ethers.utils.hexStripZeros(resolverAddress),
        data: iface.functions.lookup.encode([signature])
      },
      transaction.blockNumber
    );
  } catch (err) {
    this.unresolvedCalls++;
    return;
  }

  // Geth returns `undefined` for Truffle's solidity tests here.
  if (contractAddress) {
    contractAddress = ethers.utils.hexStripZeros(contractAddress);
    contractName = this.data.getNameByAddress(contractAddress);

    // Try to resolve by deployedBytecode
    if (contractName) return contractName;
    else return this.resolveByDeployedBytecode(contractAddress);
  }
}

module.exports = etherRouter;
