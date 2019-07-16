## Guide to using Codechecks

This reporter comes with a [codechecks](http://codechecks.io) CI integration that
displays a pull request's gas consumption changes relative to its target branch in the Github UI.
It's like coveralls for gas. The codechecks service is free for open source and maintained by MakerDao engineer [@krzkaczor](https://github.com/krzkaczor).

![Screen Shot 2019-06-18 at 12 25 49 PM](https://user-images.githubusercontent.com/7332026/59713894-47298900-91c5-11e9-8083-233572787cfa.png)

## Setup

- Enable your project on [codechecks.io](https://codechecks.io/). Check out the
[getting started guide](https://github.com/codechecks/docs/blob/master/getting-started.md). (All
you really have to do is toggle your repo 'on' and copy-paste a token into your CI environment
variables settings.)

- Install the codechecks client library as a dev dependency:

```
npm install --save-dev @codechecks/client
```

- Add a `codechecks.yml` to your project's root directory as below:

```yml
checks:
  - name: eth-gas-reporter/codechecks
```

- Run `codechecks` as a step in your build

```yml
# CircleCI Example
steps:
  - checkout
  - run: npm install
  - run: npm test
  - run: npx codechecks

# Travis
script:
  - npm test
  - npx codechecks
```

- You're done! :elephant:

### Codechecks is new :wrench:

Codechecks is new and some of its quirks are still being ironed out:
+ If you're using CircleCI and the report seems to be missing from the first
build of a pull request, you can [configure your codechecks.yml's branch setting](https://github.com/codechecks/docs/blob/master/configuration.md#settings) to make it work as expected.
+ Both Travis and Circle must be configured to run on commit/push
(this is true by default and will only be a problem if you've turned those builds off to save resources.)

### Diff Report Example

Something like this will be displayed in the `checks` tab of your GitHub pull request.
Increases in gas usage relative to the PR's target branch are highlighted in red, decreases are
highlighted in green.

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

The gas reporter now writes the data it collects as JSON to a file at `./gasReporterOutput.json` whenever the environment variable `CI` is set to true. You can see an example of this output [here](https://github.com/cgewecke/eth-gas-reporter/blob/master/docs/gasReporterOutput.md).
You may find it useful as a base to generate more complex or long running gas analyses, develop CI integrations with, or make nicer tables.
