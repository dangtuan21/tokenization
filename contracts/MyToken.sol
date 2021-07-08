pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract MyToken is ERC20Mintable, ERC20Detailed {
    string  public assetAddress = "";

    constructor(string memory _name, string memory _symbol, uint256 initialSupply, uint8 _decimals, string memory _assetAddress)
        ERC20Detailed(_name, _symbol, _decimals)
        public
    {
        assetAddress = _assetAddress;
        mint(msg.sender, initialSupply);
    }
    function balancesOf(address[] memory accountList) public view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](accountList.length);

        for (uint j = 0; j < accountList.length; j++) {
            address account = accountList[j];
            balances[j] = balanceOf(account);
        }          
        return balances;
    }    
}
