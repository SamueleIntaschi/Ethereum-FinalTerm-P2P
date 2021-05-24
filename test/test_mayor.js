const MayorContract = artifacts.require("Mayor"); // ./build/Mayor.json

contract("Testing MayorContract", accounts => {
    //Create a test
    it("Should test the application", async function() {
        
        var quorum = 6;
        var voters = new Array(quorum);
        var yaySoul = 0;
        var naySoul = 0;
        //Fixed random addresses for candidate and escrow
        var candidate = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
        var escrow = "0x0472ec0185ebb8202f3d4ddb0226998889663cf2";
        //Create the contract from an impartial account
        const instance = await MayorContract.new(candidate, escrow, quorum, {from: accounts[quorum+1]});
        //Send envelopes until the quorum is reached
        for (var i=0; i<quorum; i++) {
            //Compute the envelope
            if (i%2 == 0) doblon = true;
            else doblon = false;
            voters[i] = {
                sigil: i,
                doblon: doblon,
                soul: Math.floor(Math.random() * (100 - 10) + 10),
                balance: await web3.eth.getBalance(accounts[i])
            };
            var result = await instance.compute_envelope(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});
            //Cast the computed envelope
            var cast_res = await instance.cast_envelope(result, {from: accounts[i]});
            if (doblon == true) {
                yaySoul += voters[i].soul;
            }
            else {
                naySoul += voters[i].soul;
            }
        }
        //Open the envelopes previously sent
        for (var i=0; i<quorum; i++) {
            //Open envelope
            const open_res = await instance.open_envelope.sendTransaction(voters[i].sigil, voters[i].doblon, {value: voters[i].soul, from: accounts[i]})//await instance.open_envelope(i, doblon, {from: accounts[i]});
            assert.equal(open_res.logs[0].event, "EnvelopeOpen", "Envelopes should be opened");
        }
        //Check the final result: new mayor elected or sayonara my mayor
        const final_res = await instance.mayor_or_sayonara({from: accounts[quorum+1]});
        if (yaySoul > naySoul) {
            assert.equal(final_res.logs[0].event, "NewMayor", "Mayor selection should be correct");
        }
        else {
            assert.equal(final_res.logs[0].event, "Sayonara", "Mayor selection should be correct");
        }
    }); 
});