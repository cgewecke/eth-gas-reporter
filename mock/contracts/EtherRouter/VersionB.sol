pragma solidity ^0.5.0;

contract VersionB {

  uint value;
  uint counter;

  constructor() public{
  }

  function setValue(uint val) public {
    value = val;
    counter = counter + 1;
  }
}
