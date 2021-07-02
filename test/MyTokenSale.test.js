const TokenSale = artifacts.require("MyTokenSale");
const Token = artifacts.require("MyToken");
const KycContract = artifacts.require("KycContract");

const chai = require("./setupchai.js");
const BN = web3.utils.BN;
const expect = chai.expect;

require("dotenv").config({ path: "../.env" });

contract("TokenSale Test", async (accounts) => {
  const [deployerAccount, recipient, investor, anotherInvestor] = accounts;

  //  FOR REF!!!
  // it("should create crowdsale with correct parameters", async function () {
  //   const NAME = "SimpleToken";
  //   const SYMBOL = "SIM";
  //   const TOTAL_SUPPLY = new BN("10000000000000000000000");
  //   const RATE = new BN(10);

  //   this.crowdsale = await TokenSale.new(
  //     RATE,
  //     deployerAccount,
  //     this.token.address,
  //     kyc
  //   );

  //   expect(await this.crowdsale.rate()).to.be.bignumber.equal(RATE);
  //   expect(await this.crowdsale.wallet()).to.be.equal(wallet);
  //   expect(await this.crowdsale.token()).to.be.equal(this.token.address);
  // });
  beforeEach(async () => {
    // this.MyToken = await Token.new(process.env.INITIAL_TOKENS);
    this.MyToken = await Token.deployed();
  });
  it("should not have any tokens in my deployerAccount", async () => {
    // let instance = await Token.deployed();
    let instance = this.MyToken;
    return expect(
      await instance.balanceOf(deployerAccount)
    ).to.be.a.bignumber.equal(new BN(0));
  });
  it("all tokens should be in the TokenSale Smart Contract by default", async () => {
    // let instance = await Token.deployed();
    let instance = this.MyToken;
    let balanceOfTokenSaleSmartContract = await instance.balanceOf(
      TokenSale.address
    );
    let totalSupply = await instance.totalSupply();
    return expect(balanceOfTokenSaleSmartContract).to.be.a.bignumber.equal(
      totalSupply
    );
  });
  it("should accept payments", async () => {
    // let instance = await Token.deployed();
    let instance = this.MyToken;
    const investmentAmount = new BN(5);
    const expectedTokenAmount = new BN(1).mul(investmentAmount); // mul with rate
    let kycInstance = await KycContract.deployed();
    let tokenSaleInstance = await TokenSale.deployed();

    await kycInstance.setKycCompleted(investor, {
      from: deployerAccount,
    });

    let supplyBefore = await instance.totalSupply();
    await tokenSaleInstance.buyTokens(investor, {
      value: investmentAmount,
      from: investor,
    });

    expect(await instance.balanceOf(investor)).to.be.bignumber.equal(
      expectedTokenAmount
    );

    const newSupply = supplyBefore.sub(investmentAmount);

    expect(await instance.balanceOf(TokenSale.address)).to.be.bignumber.equal(
      newSupply
    );
  });

  it("should deliver tokens", async () => {
    // let instance = await Token.deployed();
    let instance = this.MyToken;
    const tokenAmount = new BN(5);
    let kycInstance = await KycContract.deployed();
    let tokenSaleInstance = await TokenSale.deployed();

    await kycInstance.setKycCompleted(anotherInvestor, {
      from: deployerAccount,
    });

    let balanceBefore = await instance.balanceOf(TokenSale.address);

    await tokenSaleInstance.deliverTokens(anotherInvestor, tokenAmount, {
      from: deployerAccount,
    });

    expect(await instance.balanceOf(anotherInvestor)).to.be.bignumber.equal(
      tokenAmount
    );

    const newBalance = balanceBefore.sub(tokenAmount);

    expect(await instance.balanceOf(TokenSale.address)).to.be.bignumber.equal(
      newBalance
    );

    expect(await instance.totalSupply()).to.be.bignumber.equal(
      new BN(process.env.INITIAL_TOKENS)
    );
  });
});
