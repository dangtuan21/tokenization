import React, { Component } from "react";
import getWeb3 from "./getWeb3";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import "./App.css";
import tokenList from "./tokens.json";

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
      this.loadDataByToken(defaultTokenSymbol);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

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

  updateUserTokens = async () => {
    const userTokens = await this.getTokenBalance(this.state.curAddress);
    this.setState({ userTokens });
  };

  updateTokenSaleBalance = async () => {
    const tokenSaleBalance = await this.getTokenBalance(
      this.state.tokenSaleAddress
    );
    this.setState({ tokenSaleBalance });
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
      .on("data", this.updateUserTokens);
  };

  handleBuyTokens = async () => {
    await this.tokenSaleInstance.methods.buyTokens(this.state.curAddress).send({
      from: this.state.curAddress,
      value: this.web3.utils.toWei("1", "wei"),
    });

    this.updateTokenSaleBalance();
  };
  handleDeliverTokens = async () => {
    await this.tokenSaleInstance.methods
      .deliverTokens(this.state.investorAddress, this.state.tokenNum)
      .send({
        from: this.state.curAddress,
      });
    this.updateTokenSaleBalance();
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
    this.setState({
      [name]: value,
    });
  };

  handleKycWhitelisting = async () => {
    await this.kycInstance.methods
      .setKycCompleted(this.state.kycAddress)
      .send({ from: this.state.curAddress });
    alert("KYC for " + this.state.kycAddress + " is completed");
  };
  handleTokenSelectionChange(event) {
    const tokenSymbol = event.target.value;
    this.setState({ tokenSymbol });

    this.loadDataByToken(tokenSymbol);
  }
  async loadDataByToken(tokenSymbol) {
    const KycContract = require(`./blockchain/contracts_${tokenSymbol}/KycContract.json`);
    const TdToken = require(`./blockchain/contracts_${tokenSymbol}/TdToken.json`);
    const TdTokenSale = require(`./blockchain/contracts_${tokenSymbol}/TdTokenSale.json`);

    this.tokenInstance = new this.web3.eth.Contract(
      TdToken.abi,
      TdToken.networks[this.networkId] &&
        TdToken.networks[this.networkId].address
    );

    this.tokenSaleInstance = new this.web3.eth.Contract(
      TdTokenSale.abi,
      TdTokenSale.networks[this.networkId] &&
        TdTokenSale.networks[this.networkId].address
    );
    this.kycInstance = new this.web3.eth.Contract(
      KycContract.abi,
      KycContract.networks[this.networkId] &&
        KycContract.networks[this.networkId].address
    );
    const tokenName = await this.tokenInstance.methods.name().call();
    const tokenAddress = TdToken.networks[this.networkId].address;

    this.setState({ tokenName });
    this.setState({ tokenAddress });

    this.updateIsWhiteListed();

    this.listenToTokenTransfer();

    const tokenSaleAddress = TdTokenSale.networks[this.networkId].address;
    this.setState(
      {
        loaded: true,
        tokenSaleAddress,
      },
      this.updateUserTokens
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
          <h1>
            {this.state.tokenSymbol} - {this.state.tokenName}
            <select
              value={this.state.tokenSymbol}
              onChange={(event) => this.handleTokenSelectionChange(event)}
            >
              {this.state.tokenSymbol} - {this.state.tokenName}
              {tokenList.map((token) => {
                return <option value={token}>{token}</option>;
              })}
            </select>
          </h1>
          <h3>
            <a
              href={`https://ropsten.etherscan.io/address/${this.state.tokenAddress}`}
            >
              {this.state.tokenAddress}
            </a>
          </h3>
          <p>
            TokenSale address:
            <a
              href={`https://ropsten.etherscan.io/address/${this.state.tokenSaleAddress}`}
            >
              {this.state.tokenSaleAddress}
            </a>
            <br />
            TokenSale Balance: ETH:
            <strong>{this.state.tokenSaleEthBalance}</strong>
            <br />
            {this.state.tokenSymbol}:
            <strong>{this.state.tokenSaleBalance}</strong>
          </p>

          <hr />
          <h1>Investor section</h1>
          <p>
            Your wallet:{" "}
            <strong>
              {" "}
              <a
                href={`https://ropsten.etherscan.io/address/${this.state.curAddress}`}
              >
                {this.state.curAddress}
              </a>
            </strong>
            <br />
            Your Balance: ETH: <strong> {this.state.curBalance}</strong>
            <br />
            {this.state.tokenSymbol}: <strong> {this.state.userTokens} </strong>
          </p>
          <h3>Is Kyc Whitelisted? {this.state.isWhiteListed.toString()}</h3>
          <hr />
          <h1> Admin section</h1>
          <p>
            Investor to be added to WhiteList:
            <input
              type="text"
              name="kycAddress"
              value={this.state.kycAddress}
              onChange={this.handleInputChange}
            />
            <button type="button" onClick={this.handleKycWhitelisting}>
              Add to Whitelist
            </button>
          </p>

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
              name="investorAddress"
              value={this.state.investorAddress}
              onChange={this.handleInputChange}
            />
            <button type="button" onClick={this.handleDeliverTokens}>
              Deliver
            </button>
          </p>
        </div>
      </Router>
    );
  }
}

export default App;
