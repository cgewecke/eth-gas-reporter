pragma solidity ^0.4.23;

contract MultiContractFileA {
  uint x;

  function hello() public {
    x = 5;
  }
}

contract MultiContractFileB {
  uint x;

  function goodbye() public {
    x = 5;
  }
}