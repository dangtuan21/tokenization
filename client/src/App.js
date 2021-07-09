import React, { Component } from "react";
import getWeb3 from "./getWeb3";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import "./App.css";
import tokenList from "./data/tokens.json";
import admin from "./data/admin.json";
class App extends Component {
  state = {
    loaded: false,
    kycAddress: "0x123...",
    investorAddress: "0x123...",
    tokenSaleAddress: null,
    userTokens: 0,
    tokenName: "",
    tokenSymbol: "",
    tokenAddress: "",
    whiteList: [],
    isWhiteListed: false,
    curAddress: "",
    curBalance: "",
    tokenSaleEthBalance: "",
    tokenSaleBalance: "",
    tokenNum: 0,
    investorList: [],
    assetAddress: "",
    investorToBeWhiteListed: "",
    investorToBeDelivered: "",
    bulkTokenToBeDelivered: 0,
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      this.web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      this.accounts = await this.web3.eth.getAccounts();
      const curAddress = this.accounts[0];
      this.setState({ curAddress });

      const curBalance = await this.getEthBalance(curAddress);
      this.setState({ curBalance });

      // Get the contract instance.
      this.networkId = await this.web3.eth.net.getId();
      const defaultTokenSymbol = tokenList[0];
      this.setState({ tokenSymbol: defaultTokenSymbol });

      this.loadSmartContracts(defaultTokenSymbol);
      this.loadInvestorList();
      this.updateInvestorListBalances();
      this.updateKycCompleted();
      this.loadDataByToken();
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  async loadInvestorList() {
    const investorList = require(`./data/investors.json`);
    this.setState({ investorList });
  }

  async updateInvestorListBalances() {
    const investorList = this.state.investorList;
    const investorAddresses = investorList.map((item) => item.walletAddress);
    const balances = await this.tokenInstance.methods
      .balancesOf(investorAddresses)
      .call();
    for (let i = 0; i < investorList.length; i++) {
      const investor = investorList[i];
      //  fill balance
      investor.balance = parseInt(balances[i]);
    }
    this.setState({ investorList });
  }

  async updateKycCompleted() {
    const investorList = this.state.investorList;
    const investorAddresses = investorList.map((item) => item.walletAddress);
    const kycCompleteds = await this.tokenSaleInstance.methods
      .kycCompletedOf(investorAddresses)
      .call();
    for (let i = 0; i < investorList.length; i++) {
      const investor = investorList[i];
      //  fill kycCompleted
      investor.kycCompleted = kycCompleteds[i];
    }
    this.setState({ investorList });
  }

  updateAmountToDeliver() {
    const tokenSaleBalance = this.state.bulkTokenToBeDelivered;
    const investorList = this.state.investorList;
    for (let i = 0; i < investorList.length; i++) {
      const investor = investorList[i];
      //  fill amountToDeliver
      let tokenNum = investor.holdingPercentile * 0.01 * tokenSaleBalance;
      tokenNum = Math.round(tokenNum);
      tokenNum = this.web3.utils.toWei(tokenNum.toString(), "wei");

      investor.amountToDeliver = tokenNum;
    }

    this.setState({ investorList });
  }
  async getEthBalance(address) {
    let balance = await this.web3.eth.getBalance(address);
    balance = this.web3.utils.fromWei(balance, "ether").substr(0, 5);

    return balance;
  }
  async updateIsWhiteListed() {
    const isWhiteListed = await this.kycInstance.methods
      .kycCompleted(this.state.curAddress)
      .call();
    this.setState({ isWhiteListed });
  }

  onTokenChanged = async () => {
    //  update Balances of Tokens
    const userTokens = await this.getTokenBalance(this.state.curAddress);
    this.setState({ userTokens });
    //  update TokenSaleBalance
    this.updateTokenSaleBalance();
    //  update Balances of Investor
    this.updateInvestorListBalances();
  };

  updateTokenSaleBalance = async () => {
    let tokenSaleBalance = await this.getTokenBalance(
      this.state.tokenSaleAddress
    );
    tokenSaleBalance = parseInt(tokenSaleBalance);
    this.setState({ tokenSaleBalance });

    //  update amountToDeliver
    this.updateAmountToDeliver();
  };

  async getTokenBalance(address) {
    const tokenBalance = await this.tokenInstance.methods
      .balanceOf(address)
      .call();

    return tokenBalance;
  }

  listenToTokenTransfer = () => {
    this.tokenInstance.events
      .Transfer({ to: this.state.curAddress })
      .on("data", this.onTokenChanged);
  };

  handleBuyTokens = async () => {
    await this.tokenSaleInstance.methods.buyTokens(this.state.curAddress).send({
      from: this.state.curAddress,
      value: this.web3.utils.toWei("1", "wei"),
    });

    this.updateTokenSaleBalance();
  };
  handleDeliverTokens = async () => {
    if (this.state.curAddress !== admin.walletAddress) {
      alert("This should be done by Admin!");
      return;
    }
    await this.deliverTokens(
      this.state.tokenNum,
      this.state.investorToBeDelivered
    );
    alert("Deliver Tokens is completed!");

    this.setState({ tokenNum: 0 });
    this.setState({ investorToBeDelivered: "" });

    this.updateTokenSaleBalance();
    this.updateInvestorListBalances();
  };
  handleUpdateTokenToDeliver = async () => {
    if (this.state.curAddress !== admin.walletAddress) {
      alert("This should be done by Admin!");
      return;
    }
    this.updateAmountToDeliver();
  };
  handleBulkDeliverTokens = async () => {
    if (this.state.curAddress !== admin.walletAddress) {
      alert("This should be done by Admin!");
      return;
    }
    if (!this.verifyKyc()) {
      return;
    }
    const investorAddresses = this.state.investorList.map(
      (item) => item.walletAddress
    );

    const amountList = [];
    for (const investor of this.state.investorList) {
      try {
        let tokenNum =
          investor.holdingPercentile * 0.01 * this.state.bulkTokenToBeDelivered;
        tokenNum = Math.round(tokenNum);
        tokenNum = this.web3.utils.toWei(tokenNum.toString(), "wei");

        amountList.push(tokenNum);
      } catch (error) {
        console.error("Can not deliver to ", investor.walletAddress);
      }
    }
    await this.bulkDeliverTokens(investorAddresses, amountList);
    alert("Bulk DeliverTokens is completed!");

    this.setState({ bulkTokenToBeDelivered: 0 });

    this.updateTokenSaleBalance();
    this.updateInvestorListBalances();
  };

  deliverTokens = async (tokenNum, wallet) => {
    const tokens = this.web3.utils.toWei(tokenNum, "wei");
    await this.tokenSaleInstance.methods.deliverTokens(wallet, tokens).send({
      from: this.state.curAddress,
    });
  };
  verifyKyc = () => {
    for (const investor of this.state.investorList) {
      if (!investor.kycCompleted) {
        alert("Investor " + investor.name + " not KYC!");
        return false;
      }
    }

    return true;
  };
  bulkDeliverTokens = async (investorAddresses, amountList) => {
    try {
      await this.tokenSaleInstance.methods
        .bulkDeliverTokens(investorAddresses, amountList)
        .send({
          from: this.state.curAddress,
        });
    } catch (error) {
      debugger;
      alert("Error", error.message);
    }
  };
  handleSellTokens = async () => {
    await this.tokenSaleInstance.methods
      .buyTokens(this.state.tokenSaleAddress)
      .send({
        from: this.state.tokenSaleAddress,
        value: this.web3.utils.toWei("1", "wei"),
      });

    this.updateTokenSaleBalance();
  };

  handleInputChange = (event) => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;
    debugger;
    this.setState({
      [name]: value,
    });
  };

  handleKycWhitelisting = async () => {
    await this.kycInstance.methods
      .setKycCompleted(this.state.investorToBeWhiteListed)
      .send({ from: this.state.curAddress });
    alert("KYC for " + this.state.investorToBeWhiteListed + " is completed");
  };
  handleTokenSelectionChange(event) {
    const tokenSymbol = event.target.value;
    this.setState({ tokenSymbol });

    this.loadSmartContracts(tokenSymbol);
    this.loadDataByToken();
  }
  async loadSmartContracts(tokenSymbol) {
    const KycContract = require(`./blockchain/contracts_${tokenSymbol}/KycContract.json`);
    const MyToken = require(`./blockchain/contracts_${tokenSymbol}/MyToken.json`);
    const MyTokenSale = require(`./blockchain/contracts_${tokenSymbol}/MyTokenSale.json`);

    this.tokenInstance = new this.web3.eth.Contract(
      MyToken.abi,
      MyToken.networks[this.networkId] &&
        MyToken.networks[this.networkId].address
    );

    this.tokenSaleInstance = new this.web3.eth.Contract(
      MyTokenSale.abi,
      MyTokenSale.networks[this.networkId] &&
        MyTokenSale.networks[this.networkId].address
    );
    this.kycInstance = new this.web3.eth.Contract(
      KycContract.abi,
      KycContract.networks[this.networkId] &&
        KycContract.networks[this.networkId].address
    );
  }
  async loadDataByToken() {
    const kycAddress = this.tokenInstance._address;
    const tokenName = await this.tokenInstance.methods.name().call();

    try {
      //  metadata
      const assetAddress = await this.tokenInstance.methods
        .assetAddress()
        .call();
      this.setState({ assetAddress });
    } catch (error) {}

    const tokenAddress = this.tokenInstance._address;

    this.setState({ tokenName });
    this.setState({ tokenAddress });
    this.setState({ kycAddress });

    this.updateIsWhiteListed();

    this.listenToTokenTransfer();

    const tokenSaleAddress = this.tokenSaleInstance._address;
    this.setState(
      {
        loaded: true,
        tokenSaleAddress,
      },
      this.onTokenChanged
    );

    //  tokenSale
    const tokenSaleEthBalance = await this.getEthBalance(tokenSaleAddress);
    this.setState({ tokenSaleEthBalance });

    this.updateTokenSaleBalance();
  }
  render() {
    if (!this.state.loaded) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <Router>
        <div className="App">
          <hr />
          <table
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#E0E0E0",
              "vertical-align": "top",
            }}
          >
            <thead>
              <tr>
                <td colSpan="2">
                  <h1>
                    {this.state.tokenSymbol} - {this.state.tokenName}
                    <select
                      value={this.state.tokenSymbol}
                      onChange={(event) =>
                        this.handleTokenSelectionChange(event)
                      }
                    >
                      {this.state.tokenSymbol} - {this.state.tokenName}
                      {tokenList.map((token, i) => {
                        return (
                          <option value={token} key={i}>
                            {token}
                          </option>
                        );
                      })}
                    </select>
                  </h1>
                  <h2>{this.state.assetAddress}</h2>
                  <h3>
                    <a
                      href={`https://ropsten.etherscan.io/address/${this.state.tokenAddress}`}
                    >
                      {this.state.tokenAddress}
                    </a>
                  </h3>
                  <p>
                    TokenManager address:
                    <a
                      href={`https://ropsten.etherscan.io/address/${this.state.tokenSaleAddress}`}
                    >
                      {this.state.tokenSaleAddress}
                    </a>
                    <br />
                    TokenManager Balance: ETH:
                    <strong>{this.state.tokenSaleEthBalance}</strong>
                    <br />
                    {this.state.tokenSymbol}:
                    <strong>{this.state.tokenSaleBalance}</strong>
                    <br />
                    KYC address:
                    <a
                      href={`https://ropsten.etherscan.io/address/${this.state.kycAddress}`}
                    >
                      {this.state.kycAddress}
                    </a>
                    <br />
                  </p>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    "vertical-align": "top",
                    width: "30%",
                    backgroundColor: "#CCFFE5",
                  }}
                >
                  <h1>Investor section</h1>
                  <p>
                    Wallet:
                    <strong>
                      <a
                        href={`https://ropsten.etherscan.io/address/${this.state.curAddress}`}
                      >
                        {this.state.curAddress}
                      </a>
                    </strong>
                    <br />
                    Balance: ETH: <strong> {this.state.curBalance}</strong>
                    <br />
                    {this.state.tokenSymbol}:{" "}
                    <strong> {this.state.userTokens} </strong>
                  </p>
                  <h3>
                    Is Kyc Whitelisted? {this.state.isWhiteListed.toString()}
                  </h3>
                </td>
                <td
                  style={{
                    "vertical-align": "top",
                    width: "70%",
                    backgroundColor: "#CCFFFF",
                  }}
                >
                  <h1>Admin section</h1>
                  <p>
                    Investor to be added to WhiteList:
                    <input
                      type="text"
                      name="investorToBeWhiteListed"
                      value={this.state.investorToBeWhiteListed}
                      onChange={this.handleInputChange}
                    />
                    <button type="button" onClick={this.handleKycWhitelisting}>
                      Add to Whitelist
                    </button>
                  </p>
                  <hr />

                  <h2>Deliver {this.state.tokenSymbol} for 1 Investor</h2>
                  <p>
                    Deliver
                    <input
                      type="number"
                      name="tokenNum"
                      value={this.state.tokenNum}
                      onChange={this.handleInputChange}
                    />
                    {this.state.tokenSymbol} to Investor:
                    <input
                      type="text"
                      name="investorToBeDelivered"
                      value={this.state.investorToBeDelivered}
                      onChange={this.handleInputChange}
                    />
                    <button type="button" onClick={this.handleDeliverTokens}>
                      Deliver
                    </button>
                  </p>
                  <hr />
                  <h2>Deliver {this.state.tokenSymbol} to bulk of Investors</h2>
                  <h3>
                    <input
                      type="text"
                      name="bulkTokenToBeDelivered"
                      value={this.state.bulkTokenToBeDelivered}
                      onChange={this.handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={this.handleUpdateTokenToDeliver}
                    >
                      Update Token to deliver
                    </button>
                    <button
                      type="button"
                      onClick={this.handleBulkDeliverTokens}
                    >
                      Bulk Deliver
                    </button>
                  </h3>

                  <table style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Wallet</th>
                        <th>KYC Completed?</th>
                        <th>Balance</th>
                        <th>Percentile %</th>
                        <th>Tokens to deliver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {this.state.investorList.map((investor, i) => {
                        return (
                          <tr key={i}>
                            <td>{investor.name}</td>
                            <td>
                              <a
                                href={`https://ropsten.etherscan.io/address/${investor.walletAddress}`}
                              >
                                {investor.walletAddress}
                              </a>
                            </td>
                            <td>{investor.kycCompleted.toString()}</td>
                            <td>{investor.balance}</td>
                            <td>{investor.holdingPercentile}</td>
                            <td>{investor.amountToDeliver}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Router>
    );
  }
}

export default App;
