## Advanced Topics

### Configuration for non-buidler, non-truffle projects

The reporter's only strict requirements are that it's run with mocha and that the
ethereum client it connects to is _in a separate process_ / accepts calls over
http. You cannot (for example) use ganache-core directly as a provider when running
your tests.

Apart from that, it should be possible run the reporter in any environment by configuring
the following:

- The root directory to begin searching for `.sol` files in. By default this is
  set to `contracts` but can be configured using the `src` option.

- The client `url` the reporter uses to send calls. By default the reporter resolves
  this from Truffle or Buidler's execution context.

- The method the reporter uses to acquire necessary info from solc compilation artifacts.
  Truffle and Buidler are supported out of the box but you can also use the `artifactType`
  reporter option to define a function which meets your special use case. This method
  receives a contract name (e.g. `MetaCoin`) and must return an object as below:

```js
{
  // Required
  abi: []
  bytecode: "0xabc.." // solc: "0x" + contract.evm.bytecode.object

  // Optional
  deployedBytecode: "0xabc.." // solc: "0x" + contract.evm.deployedBytecode.object
  metadata: {
    compiler: {
      version: "0.5.8"
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 500
      }
    }
  }
}
```

Some example implementations can be found [here]().

### Resolving method identities when using proxy contracts

Many production Solidity projects use a proxy contract like [EtherRouter] or [ZOS] to make
their contract systems upgradeable. In practice this means method calls are routed to the
proxy's fallback function and forwarded to the contract system's current implementation.
The reporter has a hard time matching methods to contracts in
these cases. However, you _can_ define a helper method for the `proxyResolver` option
which makes this possible. The reporter automatically detects proxy use when
it sees methods being called on a contract whose ABI does not include their signature. It then
invokes `proxyResolver` to make additional calls to the router contract and establish the true
identity of the transaction target.

An example implementation (for EtherRouter) can be seen [here](). The code which consumes the
proxyResolver can be seen [here]().

PRs are welcome if you have a proxy strategy you'd like supported by default.

###
