const MayorContract = artifacts.require("Mayor"); // ./build/Mayor.json

contract("Testing MayorContract", accounts => {
    // Test the behavior of the contract
    it("Should test the contract behavior", async function() {
        
        var quorum = 8;
        var trueVotes = 4;
        var falseVotes = quorum - trueVotes;
        var voters = new Array(quorum);
        var yaySoul = 0;
        var naySoul = 0;
        var win = false;
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

            // Create a voter
            if (i < trueVotes) doblon = true;
            else doblon = false;
            voters[i] = {
                sigil: i,
                doblon: doblon,
                // Generate a random number between 100 and 1000
                soul: Math.floor(Math.random() * (1000 - 100) + 100),
                balance: await web3.eth.getBalance(accounts[i]),
                ethUsed: 0
            };

            // Compute the envelope
            gas = await instance.compute_envelope.estimateGas(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});
            console.log("Gas used to compute an envelope from account " + i + ": " + gas);
            var result = await instance.compute_envelope(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});

            // Cast the computed envelope
            gas = await instance.cast_envelope.estimateGas(result, {from: accounts[i]});
            console.log("Gas used to cast an envelope from account " + i + ": " + gas);
            var cast_res = await instance.cast_envelope(result, {from: accounts[i]});
            assert.equal(cast_res.logs[0].event, "EnvelopeCast", "Envelopes should be casted");
            const tx = await web3.eth.getTransaction(cast_res.tx);
            const gasPrice = tx.gasPrice;
            voters[i].ethUsed += gas * gasPrice;
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
            const open_res = await instance.open_envelope.sendTransaction(voters[i].sigil, voters[i].doblon, {value: voters[i].soul, from: accounts[i]})//await instance.open_envelope(i, doblon, {from: accounts[i]});
            assert.equal(open_res.logs[0].event, "EnvelopeOpen", "Envelopes should be opened");
            const tx = await web3.eth.getTransaction(open_res.tx);
            const gasPrice = tx.gasPrice;
            voters[i].ethUsed += gas * gasPrice;
        }

        //Check the final result: new mayor elected or sayonara my mayor
        gas = await instance.mayor_or_sayonara.estimateGas();
        console.log("Gas used to decide the results of the election: " + gas);
        const final_res = await instance.mayor_or_sayonara({from: accounts[quorum]});
        if (yaySoul > naySoul) {
            win = true;
            console.log("The mayor is confirmed");
            assert.equal(final_res.logs[0].event, "NewMayor", "Mayor selection should be correct");
        }
        else {
            win = false;
            console.log("The mayor is kicked off");
            assert.equal(final_res.logs[0].event, "Sayonara", "Mayor selection should be correct");
        }

        // Check the balance of the accounts
        const candidateBalance = await web3.eth.getBalance(candidate);
        const escrowBalance = await web3.eth.getBalance(escrow);
        if (win) {
            assert.equal(candidateBalance, yaySoul, "Candidate balance should be correct");
            assert.equal(escrowBalance, 0, "Escrow balance should be correct");
        }
        else {
            assert.equal(candidateBalance, 0, "Candidate balance should be correct");
            assert.equal(escrowBalance, naySoul, "Escrow balance should be correct");
        }
        for (var i=0; i<quorum; i++) {
            if ((win && voters[i].doblon == false) || (!win && voters[i].doblon == true)) {
                // Compute an approximation of the balance
                var expectedBalance = voters[i].balance - voters[i].ethUsed;
                var actualBalance = await web3.eth.getBalance(accounts[i]);
                assert.equal(actualBalance, expectedBalance,"Souls should be correctly refunded");
            }
        }
    });
    
    it("Should test mayor_or_sayonara gas cost with a high number of losing voters", async function() {
        var quorum = 9;
        var trueVotes = 1;
        // Set a high number of soul to sent to win the election
        var trueSoul = 100000000;
        var falseVotes = quorum - trueVotes;
        var voters = new Array(quorum);
        // Fixed random addresses for candidate and escrow
        var candidate = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
        var escrow = "0x0472ec0185ebb8202f3d4ddb0226998889663cf2";
        var gas = 0;
        // Create the contract from an impartial account
        const instance = await MayorContract.new(candidate, escrow, quorum, {from: accounts[quorum]});
        // Send envelopes until the quorum is reached
        for (var i=0; i<quorum; i++) {

            var soul = 0;
            // Create a voter
            if (i < trueVotes) {
                soul = trueSoul
                doblon = true;
            }
            else {
                soul = Math.floor(Math.random() * (1000 - 100) + 100);
                doblon = false;
            }
            voters[i] = {
                sigil: i,
                doblon: doblon,
                soul: soul
            };

            // Compute the envelope
            var result = await instance.compute_envelope(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});

            // Cast the computed envelope
            var cast_res = await instance.cast_envelope(result, {from: accounts[i]});
            assert.equal(cast_res.logs[0].event, "EnvelopeCast", "Envelopes should be casted");
        }

        // Open the envelopes previously sent
        for (var i=0; i<quorum; i++) {
            //Open envelope
            const open_res = await instance.open_envelope.sendTransaction(voters[i].sigil, voters[i].doblon, {value: voters[i].soul, from: accounts[i]})//await instance.open_envelope(i, doblon, {from: accounts[i]});
            assert.equal(open_res.logs[0].event, "EnvelopeOpen", "Envelopes should be opened");
        }

        //Check the final result: new mayor elected or sayonara my mayor
        gas = await instance.mayor_or_sayonara.estimateGas();
        console.log("Gas used to decide the results of the election with a high number of losing voters: " + gas);
        const final_res = await instance.mayor_or_sayonara({from: accounts[quorum]});
        assert.equal(final_res.logs[0].event, "NewMayor", "Mayor selection should be correct");
    });

    it("Should test mayor_or_sayonara with a low number of losing voters", async function() {
        var quorum = 9;
        var trueVotes = 8;
        // Set a high number of soul to sent to win the election
        var falseVotes = quorum - trueVotes;
        var voters = new Array(quorum);
        // Fixed random addresses for candidate and escrow
        var candidate = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
        var escrow = "0x0472ec0185ebb8202f3d4ddb0226998889663cf2";
        var gas = 0;
        // Create the contract from an impartial account
        const instance = await MayorContract.new(candidate, escrow, quorum, {from: accounts[quorum]});
        // Send envelopes until the quorum is reached
        for (var i=0; i<quorum; i++) {
            var soul = 0;
            // Create a voter
            if (i < trueVotes) {
                doblon = true;
            }
            else {
                doblon = false;
            }
            soul = Math.floor(Math.random() * (1000 - 100) + 100);
            voters[i] = {
                sigil: i,
                doblon: doblon,
                soul: soul
            };

            // Compute the envelope
            var result = await instance.compute_envelope(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});

            // Cast the computed envelope
            var cast_res = await instance.cast_envelope(result, {from: accounts[i]});
            assert.equal(cast_res.logs[0].event, "EnvelopeCast", "Envelopes should be casted");
        }

        // Open the envelopes previously sent
        for (var i=0; i<quorum; i++) {
            //Open envelope
            const open_res = await instance.open_envelope.sendTransaction(voters[i].sigil, voters[i].doblon, {value: voters[i].soul, from: accounts[i]})//await instance.open_envelope(i, doblon, {from: accounts[i]});
            assert.equal(open_res.logs[0].event, "EnvelopeOpen", "Envelopes should be opened");
        }

        //Check the final result: new mayor elected or sayonara my mayor
        gas = await instance.mayor_or_sayonara.estimateGas();
        console.log("Gas used to decide the results of the election with a low number of losing voters: " + gas);
        const final_res = await instance.mayor_or_sayonara({from: accounts[quorum]});
        assert.equal(final_res.logs[0].event, "NewMayor", "Mayor selection should be correct");
    });

    it("Should test mayor_or_sayonara with a low quorum", async function() {
        var quorum = 2;
        var trueVotes = 1;
        // Set a high number of soul to sent to win the election
        var falseVotes = quorum - trueVotes;
        var voters = new Array(quorum);
        // Fixed random addresses for candidate and escrow
        var candidate = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
        var escrow = "0x0472ec0185ebb8202f3d4ddb0226998889663cf2";
        var gas = 0;
        // Create the contract from an impartial account
        const instance = await MayorContract.new(candidate, escrow, quorum, {from: accounts[quorum]});
        // Send envelopes until the quorum is reached
        for (var i=0; i<quorum; i++) {
            var soul = 0;
            // Create a voter
            if (i < trueVotes) {
                doblon = true;
            }
            else {
                doblon = false;
            }
            soul = Math.floor(Math.random() * (1000 - 100) + 100);
            voters[i] = {
                sigil: i,
                doblon: doblon,
                soul: soul
            };

            // Compute the envelope
            var result = await instance.compute_envelope(voters[i].sigil, voters[i].doblon, voters[i].soul, {from: accounts[i]});

            // Cast the computed envelope
            var cast_res = await instance.cast_envelope(result, {from: accounts[i]});
            assert.equal(cast_res.logs[0].event, "EnvelopeCast", "Envelopes should be casted");
        }

        // Open the envelopes previously sent
        for (var i=0; i<quorum; i++) {
            //Open envelope
            const open_res = await instance.open_envelope.sendTransaction(voters[i].sigil, voters[i].doblon, {value: voters[i].soul, from: accounts[i]})//await instance.open_envelope(i, doblon, {from: accounts[i]});
            assert.equal(open_res.logs[0].event, "EnvelopeOpen", "Envelopes should be opened");
        }

        //Check the final result: new mayor elected or sayonara my mayor
        gas = await instance.mayor_or_sayonara.estimateGas();
        console.log("Gas used to decide the results of the election with a low quorum: " + gas);
        const final_res = await instance.mayor_or_sayonara({from: accounts[quorum]});
    });

});