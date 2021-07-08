pragma solidity ^0.5.0;

import "./KycContract.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract MyTokenSale is Crowdsale, Ownable {

    KycContract kyc;

    constructor(
        uint256 rate,    // rate in TKNbits
        address payable wallet,
        IERC20 token,
        KycContract _kyc
    )
        Crowdsale(rate, wallet, token)
        public
    {
        kyc = _kyc;

    }

    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view  {
        super._preValidatePurchase(beneficiary, weiAmount);
        require(kyc.kycCompleted(msg.sender), "KYC Not completed, purchase not allowed");
    }
    function deliverTokens(address beneficiary, uint256 tokenAmount) external payable onlyOwner {
        require(kyc.kycCompleted(beneficiary), "KYC of this beneficiary not completed, deliver not allowed");
        super._deliverTokens(beneficiary, tokenAmount);
    }         
    function bulkDeliverTokens(address[] calldata beneficiaryList, uint256[] calldata amountList) external payable onlyOwner {
        require(beneficiaryList.length == amountList.length, "Array sizes of beneficiary and tokenAmount should be the same");
        for (uint j = 0; j < beneficiaryList.length; j++) {
            address beneficiary = beneficiaryList[j];
            uint256 tokenAmount = amountList[j];
            require(kyc.kycCompleted(beneficiary), "KYC of this beneficiary not completed, deliver not allowed");
            super._deliverTokens(beneficiary, tokenAmount);
        }        
    } 
    function kycCompletedOf(address[] memory accountList) public view returns (bool[] memory) {
        bool[] memory kycCompleteds = new bool[](accountList.length);

        for (uint j = 0; j < accountList.length; j++) {
            address account = accountList[j];
            kycCompleteds[j] = kyc.kycCompleted(account);
        }          
        return kycCompleteds;
    }    
}