pragma solidity ^0.4.23;

contract DuplicateFunctionA {
    string x;

    function dupFunc() public {
        x = "hello world";
    }
}

contract DuplicateFunctionB {
    uint x;

    function dupFunc() public {
        x = 5;
    }
}