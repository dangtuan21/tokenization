pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract MyToken is ERC20Mintable, ERC20Detailed {
    string  public myStandard = "meta data 1";

    constructor(string memory _name, string memory _symbol, uint256 initialSupply, uint8 _decimals)
        ERC20Detailed(_name, _symbol, _decimals)
        public
    {
        mint(msg.sender, initialSupply);
    }
}
