const TokenSale = artifacts.require("MyTokenSale");
const Token = artifacts.require("MyToken");
const KycContract = artifacts.require("KycContract");

const chai = require("./setupchai.js");
const BN = web3.utils.BN;
const expect = chai.expect;

require("dotenv").config({ path: "../.env" });

contract("TokenSale Test", async (accounts) => {
  const [deployerAccount, recipient, investor, anotherInvestor] = accounts;

  beforeEach(async () => {
    this.MyToken = await Token.deployed();
  });
  it("should not have any tokens in my deployerAccount", async () => {
    let tokenInstance = this.MyToken;
    return expect(
      await tokenInstance.balanceOf(deployerAccount)
    ).to.be.a.bignumber.equal(new BN(0));
  });
  it("all tokens should be in the TokenSale Smart Contract by default", async () => {
    let tokenInstance = this.MyToken;
    let balanceOfTokenSaleSmartContract = await tokenInstance.balanceOf(
      TokenSale.address
    );
    let totalSupply = await tokenInstance.totalSupply();
    return expect(balanceOfTokenSaleSmartContract).to.be.a.bignumber.equal(
      totalSupply
    );
  });
  it("should accept payments", async () => {
    let tokenInstance = this.MyToken;
    const investmentAmount = new BN(5);
    const expectedTokenAmount = new BN(1).mul(investmentAmount); // mul with rate
    let kycInstance = await KycContract.deployed();
    let tokenSaleInstance = await TokenSale.deployed();

    await kycInstance.setKycCompleted(investor, {
      from: deployerAccount,
    });

    let supplyBefore = await tokenInstance.totalSupply();
    await tokenSaleInstance.buyTokens(investor, {
      value: investmentAmount,
      from: investor,
    });

    expect(await tokenInstance.balanceOf(investor)).to.be.bignumber.equal(
      expectedTokenAmount
    );

    const newSupply = supplyBefore.sub(investmentAmount);

    expect(
      await tokenInstance.balanceOf(TokenSale.address)
    ).to.be.bignumber.equal(newSupply);
  });

  it("should deliver tokens", async () => {
    let tokenInstance = this.MyToken;
    const tokenAmount = new BN(5);
    let kycInstance = await KycContract.deployed();
    let tokenSaleInstance = await TokenSale.deployed();

    await kycInstance.setKycCompleted(anotherInvestor, {
      from: deployerAccount,
    });

    let balanceBefore = await tokenInstance.balanceOf(TokenSale.address);

    await tokenSaleInstance.deliverTokens(anotherInvestor, tokenAmount, {
      from: deployerAccount,
    });

    expect(
      await tokenInstance.balanceOf(anotherInvestor)
    ).to.be.bignumber.equal(tokenAmount);

    const newBalance = balanceBefore.sub(tokenAmount);

    expect(
      await tokenInstance.balanceOf(TokenSale.address)
    ).to.be.bignumber.equal(newBalance);

    expect(await tokenInstance.totalSupply()).to.be.bignumber.equal(
      new BN(process.env.INITIAL_TOKENS)
    );
  });
  it("should bulk deliver tokens", async () => {
    let tokenInstance = this.MyToken;
    let kycInstance = await KycContract.deployed();
    let tokenSaleInstance = await TokenSale.deployed();

    let balanceBefore = await tokenInstance.balanceOf(TokenSale.address);

    const investorList = [
      "0x79BbD58d487190FAbfB69B6442CA47e5Be6f8fA2",
      "0x504C6307702167a2DDECfb835E4AcA1456ade96a",
    ];
    const amountList = [10, 20];

    for (let i = 0; i < investorList.length; i++) {
      const invAddress = investorList[i];
      await kycInstance.setKycCompleted(invAddress, {
        from: deployerAccount,
      });
    }
    await tokenSaleInstance.bulkDeliverTokens(investorList, amountList, {
      from: deployerAccount,
    });

    expect(
      await tokenInstance.balanceOf(investorList[0])
    ).to.be.bignumber.equal(new BN(10));

    expect(
      await tokenInstance.balanceOf(investorList[1])
    ).to.be.bignumber.equal(new BN(20));

    const newBalance = balanceBefore.sub(new BN(30));

    expect(
      await tokenInstance.balanceOf(TokenSale.address)
    ).to.be.bignumber.equal(newBalance);
  });
  it("should not bulk deliver tokens when there is 1 unwhitelisted", async () => {
    let tokenInstance = this.MyToken;
    let kycInstance = await KycContract.deployed();
    let tokenSaleInstance = await TokenSale.deployed();

    let balanceBefore = await tokenInstance.balanceOf(TokenSale.address);

    const investorList = [
      "0x79BbD58d487190FAbfB69B6442CA47e5Be6f8fA2",
      "0x504C6307702167a2DDECfb835E4AcA1456ade96a",
      "0x826398a7CFA34F6588a98f56743b766D0EaaE191",
    ];
    const amountList = [10, 20, 30];

    for (let i = 0; i <= 1; i++) {
      const invAddress = investorList[i];
      await kycInstance.setKycCompleted(invAddress, {
        from: deployerAccount,
      });
    }
    try {
      await tokenSaleInstance.bulkDeliverTokens(investorList, amountList, {
        from: deployerAccount,
      });
    } catch (error) {}
    expect(
      await tokenInstance.balanceOf(investorList[0])
    ).to.be.bignumber.equal(new BN(10));
    expect(
      await tokenInstance.balanceOf(investorList[1])
    ).to.be.bignumber.equal(new BN(20));
    expect(
      await tokenInstance.balanceOf(investorList[2])
    ).to.be.bignumber.equal(new BN(0));
  });
});
