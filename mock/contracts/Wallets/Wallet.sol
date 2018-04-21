pragma solidity ^0.4.17;

contract Wallet {

    event Deposit(address indexed _sender, uint _value);

    function transferPayment(uint payment, address recipient) public {
        recipient.transfer(payment);
    }

    function sendPayment(uint payment, address recipient) public {
        if (!recipient.send(payment))
            revert();
    }

    function getBalance() public view returns(uint){
        return address(this).balance;
    }

    function() public payable
    {
        if (msg.value > 0)
            emit Deposit(msg.sender, msg.value);
    }
}
