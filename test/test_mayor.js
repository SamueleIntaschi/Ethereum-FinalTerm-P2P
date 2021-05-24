const MayorContract = artifacts.require("Mayor"); // ./build/Mayor.json

contract("Testing MayorContract", accounts => {
    // Create a test
    it("Should test the application", async function() {
        
        var quorum = 5;
        var voters = new Array(quorum);
        var yaySoul = 0;
        var naySoul = 0;
        // Fixed random addresses for candidate and escrow
        var candidate = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
        var escrow = "0x0472ec0185ebb8202f3d4ddb0226998889663cf2";
        var gas = 0;
        // Create the contract from an impartial account
        gas = await MayorContract.new.estimateGas(candidate, escrow, quorum, {from: accounts[quorum]});
        console.log("Gas used for contract creation: " + gas);
        const instance = await MayorContract.new(candidate, escrow, quorum, {from: accounts[quorum]});
        // Send envelopes until the quorum is reached
        for (var i=0; i<quorum; i++) {
            // Select a random number to randomly assign doblons
            //var random_number = Math.floor(Math.random());
            var random_number = i;
            if (random_number%2 == 0) doblon = true;
            else doblon = false;
            voters[i] = {
                sigil: i,
                doblon: doblon,
                soul: Math.floor(Math.random() * (100 - 10) + 10),
                balance: await web3.eth.getBalance(accounts[i]),
                gasUsed: 0
            };
            // Compute the envelope
            gas = await instance.compute_envelope.estimateGas(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});
            console.log("Gas used to compute an envelope from account " + i + ": " + gas);
            voters[i].gasUsed += gas;
            var result = await instance.compute_envelope(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});
            // Cast the computed envelope
            gas = await instance.cast_envelope.estimateGas(result, {from: accounts[i]});
            console.log("Gas used to cast an envelope from account " + i + ": " + gas);
            voters[i].gasUsed += gas;
            var cast_res = await instance.cast_envelope(result, {from: accounts[i]});
            assert.equal(cast_res.logs[0].event, "EnvelopeCast", "Envelopes should be casted");
            // Update yay and nay souls
            if (voters[i].doblon == true) {
                yaySoul += voters[i].soul;
            }
            else {
                naySoul += voters[i].soul;
            }
        }
        // Open the envelopes previously sent
        for (var i=0; i<quorum; i++) {
            //Open envelope
            gas = await instance.open_envelope.estimateGas(voters[i].sigil, voters[i].doblon, {value: voters[i].soul, from: accounts[i]});
            console.log("Gas used to open an envelope from account " + i + ": " + gas);
            voters[i].gasUsed += gas;
            const open_res = await instance.open_envelope.sendTransaction(voters[i].sigil, voters[i].doblon, {value: voters[i].soul, from: accounts[i]})//await instance.open_envelope(i, doblon, {from: accounts[i]});
            assert.equal(open_res.logs[0].event, "EnvelopeOpen", "Envelopes should be opened");
        }

        //Check the final result: new mayor elected or sayonara my mayor
        gas = await instance.mayor_or_sayonara.estimateGas();
        console.log("Gas used to decide the results of the election: " + gas);
        const final_res = await instance.mayor_or_sayonara({from: accounts[quorum]});
        if (yaySoul > naySoul) {
            console.log("The mayor is confirmed");
            assert.equal(final_res.logs[0].event, "NewMayor", "Mayor selection should be correct");
        }
        else {
            console.log("The mayor is kicked off");
            assert.equal(final_res.logs[0].event, "Sayonara", "Mayor selection should be correct");
        }
        
    }); 
});