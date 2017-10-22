pragma solidity ^0.4.15;

import "./Wallets/Wallet.sol";

contract VariableCosts is Wallet {

  mapping(uint => address) map;

  function addToMap(uint[] adds) public {
    for(uint i = 0; i < adds.length; i++)
      map[adds[i]] = address(this);
  }

  function removeFromMap(uint[] dels) public {
    for(uint i = 0; i < dels.length; i++)
      delete map[dels[i]];
  }

  function unusedMethod(address a) public {
    map[1000] = a;
  }

  function methodThatThrows(bool err) public {
    require(!err);
  }
}
