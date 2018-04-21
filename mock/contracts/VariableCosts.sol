pragma solidity ^0.4.23;

import "./Wallets/Wallet.sol";

contract VariableCosts is Wallet {
  uint q;
  mapping(uint => address) map;

  function pureFn(uint x) public pure returns (uint){
    return x;
  }

  function viewFn(uint x) public view returns (address){
    return map[x];
  }

  function constantFn(uint x) public constant returns (address){
    return map[x];
  }

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
    q = 5;
  }
}
