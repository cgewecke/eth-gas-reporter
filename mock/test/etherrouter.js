const EtherRouter = artifacts.require("EtherRouter");
const Resolver = artifacts.require("Resolver");
const VersionA = artifacts.require("VersionA");
const VersionB = artifacts.require("VersionB");

contract("EtherRouter Proxy", accounts => {
  let router;
  let resolver;
  let versionA;
  let versionB;

  beforeEach(async function() {
    router = await EtherRouter.new();
    resolver = await Resolver.new();
    versionA = await VersionA.new();
    versionB = await VersionB.new();
  });

  it("Resolves methods routed through an EtherRouter proxy", async function() {
    let options = {
      from: accounts[0],
      gas: 4000000,
      to: router.address,
      gasPrice: 20000000000
    };

    await router.setResolver(resolver.address);

    await resolver.register("setValue()", versionA.address);
    options.data = versionA.contract.methods.setValue().encodeABI();
    await web3.eth.sendTransaction(options);

    await resolver.register("setValue()", versionB.address);
    options.data = versionB.contract.methods.setValue().encodeABI();
    await web3.eth.sendTransaction(options);
  });
});
