const Token = artifacts.require("MyToken");

const chai = require("./setupchai.js");
const BN = web3.utils.BN;
const expect = chai.expect;

require("dotenv").config({ path: "../.env" });

contract("Token Test", async (accounts) => {
  const [deployerAccount, recipient, anotherAccount] = accounts;

  beforeEach(async () => {
    this.MyToken = await Token.new(
      process.env.TOKEN_NAME,
      process.env.TOKEN_SYMBOL,
      process.env.INITIAL_TOKENS,
      process.env.TOKEN_DECIMALS
    );
  });

  it("all tokens should be in my account", async () => {
    let instance = this.MyToken;
    let totalSupply = await instance.totalSupply();
    return expect(
      await instance.balanceOf(deployerAccount)
    ).to.be.a.bignumber.equal(totalSupply);
  });

  it("is possible to send tokens between accounts", async () => {
    const sendTokens = 10;
    let instance = this.MyToken;
    let totalSupply = await instance.totalSupply();
    expect(await instance.balanceOf(deployerAccount)).to.be.a.bignumber.equal(
      totalSupply
    );
    await instance.transfer(recipient, sendTokens);
    // expect(instance.transfer(recipient, sendTokens)).to.eventually.be.fulfilled;
    expect(await instance.balanceOf(deployerAccount)).to.be.a.bignumber.equal(
      totalSupply.sub(new BN(sendTokens))
    );
    return expect(await instance.balanceOf(recipient)).to.be.a.bignumber.equal(
      new BN(sendTokens)
    );
  });

  it("is not possible to send more tokens than available in total", async () => {
    let instance = this.MyToken;
    let balanceOfDeployer = await instance.balanceOf(deployerAccount);

    // expect(await instance.transfer(recipient, new BN(balanceOfDeployer + 1))).to
    //   .be.rejected;

    let res;
    try {
      res = await instance.transfer(recipient, new BN(balanceOfDeployer + 10));
    } catch (error) {
      // expect(res).to.be.rejected;
    }

    return expect(
      await instance.balanceOf(deployerAccount)
    ).to.be.a.bignumber.equal(balanceOfDeployer);
  });
});
