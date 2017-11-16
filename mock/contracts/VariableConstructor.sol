pragma solidity ^0.4.17;

import "./VariableCosts.sol";

contract VariableConstructor is VariableCosts {
  string name;
  function VariableConstructor(string _name){
    name = _name;
  }
}