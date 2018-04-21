pragma solidity ^0.4.17;

import "./VariableCosts.sol";

contract VariableConstructor is VariableCosts {
  string name;
  constructor(string _name) public {
    name = _name;
  }
}