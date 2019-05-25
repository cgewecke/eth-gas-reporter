const EtherRouter = artifacts.require("EtherRouter");
const Resolver = artifacts.require("Resolver");
const VersionA = artifacts.require("VersionA");
const VersionB = artifacts.require("VersionB");

contract("EtherRouter Proxy", accounts => {
  let router;
  let resolver;
  let versionA;
  let versionB;

  before(async function() {
    router = await EtherRouter.new();
    resolver = await resolver.new();
    versionA = await versionA.new();
    versionB = await versionB.new();
  });

  it("Disambiguates methods routed through a proxy", async function() {
    await router.setResolver(resolver.address);
  });
});
