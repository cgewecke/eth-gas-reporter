pragma solidity ^0.4.15;

import "./VariableCosts.sol";

contract VariableConstructor is VariableCosts {
  string name;
  function VariableConstructor(string _name){
    name = _name;
  }
}