const Mayor = artifacts.require("Mayor");


var candidate = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
var escrow = "0x0472ec0185ebb8202f3d4ddb0226998889663cf2";
var quorum = 5;

module.exports = async function (deployer, network, accounts) {
    if(network == "development") {
        //Contract deployment
        deployer.deploy(Mayor, candidate, escrow, quorum, {from: accounts[0]});
    }
};