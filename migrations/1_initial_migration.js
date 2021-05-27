const Mayor = artifacts.require("Mayor");


var candidate = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
var escrow = "0x0472ec0185ebb8202f3d4ddb0226998889663cf2";
var quorum = 5;
var doblon = true;
var soul = 42;

module.exports = async function (deployer, network, accounts) {
    /*
    if(network == "development") {
        //Contract creation
        const instance = await deployer.deploy(Mayor, candidate, escrow, quorum, {from: accounts[0]});
        const contractInstance = await Mayor.deployed();
        
        for (var i=0; i<5; i++) {
            //Compute the envelope
            if (i%2 == 0) doblon = true;
            else doblon = false;
            var result = await contractInstance.compute_envelope(i, doblon, soul, {from: accounts[i]});
            //Cast the computed envelope
            var cast_res = await contractInstance.cast_envelope(result, {from: accounts[i]});
        }
        
    }
    */
};