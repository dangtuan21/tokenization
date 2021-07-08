var MyToken = artifacts.require("MyToken.sol");
var MyTokenSale = artifacts.require("MyTokenSale");
var MyKycContract = artifacts.require("KycContract");
require("dotenv").config({ path: "../.env" });

module.exports = async function (deployer) {
  let addr = await web3.eth.getAccounts();
  await deployer.deploy(
    MyToken,
    process.env.TOKEN_NAME,
    process.env.TOKEN_SYMBOL,
    process.env.INITIAL_TOKENS,
    process.env.TOKEN_DECIMALS,
    process.env.ASSET_ADDRESS
  );

  await deployer.deploy(MyKycContract);
  await deployer.deploy(
    MyTokenSale,
    1,
    addr[0], //currently no use!!!
    MyToken.address,
    MyKycContract.address
  );
  let instance = await MyToken.deployed();
  await instance.transfer(MyTokenSale.address, process.env.INITIAL_TOKENS);
};
