## Guide to using Codechecks in CircleCI

This reporter integrates with the [codechecks](http://codechecks.io) service to generate CI reports which track changes in gas consumption between PRs. It's like coveralls for gas. Codechecks is free for open source projects and maintained by MakerDao engineer [@krzkaczor](https://github.com/krzkaczor).

![Screen Shot 2019-06-18 at 12 25 49 PM](https://user-images.githubusercontent.com/7332026/59713894-47298900-91c5-11e9-8083-233572787cfa.png)

### Codechecks is in beta

Codechecks is a new service and some of its kinks are still being worked out. We've had issues
getting a CI report on the first commit of an open PR, although subsequent pushes always work as
expected. You can also re-run your build from the CircleCI web app to generate the report if it goes missing. Additionally, CircleCI must be configured to run on commit/push
(this is true by default, and will only be an issue if you've turned those builds off to save resources.)

### Setup

- Enable your project on [codechecks.io](https://codechecks.io/).

- Install the codechecks client library as a dev dependency:

```
npm install --save-dev @codechecks/client
```

- Add a `codechecks.yml` to your project's root directory as below:

```yml
checks:
  - name: eth-gas-reporter/codechecks
```

- Run `codechecks` as a step in your CircleCI build

```yml
steps:
  - checkout
  - run: yarn install
  - run: yarn test
  - run: yarn codechecks
```

### Diff Report

This will be displayed in the `checks` tab of your GitHub pull request. You can also reach it
by clicking on details link of your Gas Usage PR notification in the Github UI.

```diff
......................|..................................|.............|............................·
    Solc: v0.5.0      ·        Optimized: false          ·  Runs: 200  ·    Block: 8000000 gas
······················|··································|·············|·····························
  METHODS             ·                  1 gwei/gas                    ·      237.80 eur/eth
················|·····|·······················|··········|·············|··············|··············
  Contract      ·     ·  Method               ·   Gas    ·    Diff     ·  # calls     ·  eur (avg)
················|·····|·······················|··········|·············|··············|··············
  EtherRouter         ·  setResolver          ·   43192  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
  Factory             ·  deployVersionB       ·  107123  ·          0  ·           1  ·       0.03
······················|·······················|··········|·············|··············|··············
  MetaCoin            ·  sendCoin             ·   51019  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
  Migrations          ·  setCompleted         ·   27034  ·          0  ·           6  ·       0.01
······················|·······················|··········|·············|··············|··············
  MultiContractFileA  ·  hello                ·   41419  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
  MultiContractFileB  ·  goodbye              ·   41419  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
- Resolver            ·  register             ·   37633  ·         32  ·           2  ·       0.01
······················|·······················|··········|·············|··············|··············
  VariableCosts       ·  addToMap             ·   90341  ·          0  ·           7  ·       0.02
······················|·······················|··········|·············|··············|··············
  VariableCosts       ·  methodThatThrows     ·   41599  ·          0  ·           2  ·       0.01
······················|·······················|··········|·············|··············|··············
  VariableCosts       ·  otherContractMethod  ·   57407  ·          0  ·           2  ·       0.01
······················|·······················|··········|·············|··············|··············
  VariableCosts       ·  removeFromMap        ·   36481  ·          0  ·           8  ·       0.01
······················|·······················|··········|·············|··············|··············
  VariableCosts       ·  sendPayment          ·   32335  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
- VariableCosts       ·  setString            ·   86198  ·        768  ·           2  ·       0.02
······················|·······················|··········|·············|··············|··············
  VariableCosts       ·  transferPayment      ·   32186  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
  VersionA            ·  setValue             ·   25674  ·          0  ·           2  ·       0.01
······················|·······················|··········|·············|··············|··············
  Wallet              ·  sendPayment          ·   32181  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
  Wallet              ·  transferPayment      ·   32164  ·          0  ·           1  ·       0.01
······················|·······················|··········|·············|··············|··············
  DEPLOYMENTS         ·                                                ·  % of limit  ·
······················|·······················|··········|·············|··············|··············
  ConvertLib                                  ·  111791  ·          0  ·       1.7 %  ·       0.03
··············································|··········|·············|··············|··············
  EtherRouter                                 ·  278020  ·          0  ·       4.1 %  ·       0.07
··············································|··········|·············|··············|··············
  Factory                                     ·  324331  ·          0  ·       4.8 %  ·       0.08
··············································|··········|·············|··············|··············
+ MetaCoin                                    ·  358508  ·        -64  ·       5.3 %  ·       0.09
··············································|··········|·············|··············|··············
  Migrations                                  ·  284908  ·          0  ·       4.2 %  ·       0.07
··············································|··········|·············|··············|··············
  MultiContractFileA                          ·   90745  ·          0  ·       1.4 %  ·       0.02
··············································|··········|·············|··············|··············
  MultiContractFileB                          ·   90745  ·          0  ·       1.4 %  ·       0.02
··············································|··········|·············|··············|··············
  Resolver                                    ·  430644  ·          0  ·       6.4 %  ·       0.10
··············································|··········|·············|··············|··············
- VariableConstructor                         ·  987116  ·      14096  ·      14.7 %  ·       0.23
··············································|··········|·············|··············|··············
  VariableCosts                               ·  930528  ·          0  ·      13.8 %  ·       0.22
··············································|··········|·············|··············|··············
  VersionA                                    ·   88665  ·          0  ·       1.3 %  ·       0.02
··············································|··········|·············|··············|··············
  Wallet                                      ·  217795  ·          0  ·       3.2 %  ·       0.05
..............................................|..........|.............|..............|.............·
```

### Gas Reporter JSON output

The gas reporter has now writes the data it collects as JSON to a file at `./gasReporterOutput.json` whenever the environment variable CI is set to true. You can see an example of this output [here]().
You may find it useful as a base to generate more complex or long running gas analyses, develop CI integrations with, makes nicer tables, etc.
