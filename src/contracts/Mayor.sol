// SPDX-License-Identifier: MIT
//pragma solidity 0.8.1;
pragma solidity >=0.6.22 <0.9.0;

contract Mayor {
    
    // Structs, events, and modifiers
    
    // Store refund data
    struct Refund {
        uint soul;
        bool doblon;
    }
    
    // Data to manage the confirmation
    struct Conditions {
        uint32 quorum;
        uint32 envelopes_casted;
        uint32 envelopes_opened;
    }
    
    event NewMayor(address _candidate);
    event Sayonara(address _escrow);
    event EnvelopeCast(address _voter);
    event EnvelopeOpen(address _voter, uint _soul, bool _doblon);
    
    // Someone can vote as long as the quorum is not reached
    modifier canVote() {
        require(voting_condition.envelopes_casted < voting_condition.quorum, "Cannot vote now, voting quorum has been reached");
        _;   
    }
    
    // Envelopes can be opened only after receiving the quorum
    modifier canOpen() {
        require(voting_condition.envelopes_casted == voting_condition.quorum, "Cannot open an envelope, voting quorum not reached yet");
        _;
    }
    
    // The outcome of the confirmation can be computed as soon as all the casted envelopes have been opened
    modifier canCheckOutcome() {
        require(voting_condition.envelopes_opened == voting_condition.quorum, "Cannot check the winner, need to open all the sent envelopes");
        _;
    }
    
    // State attributes
    
    // Initialization variables
    address payable public candidate;
    address payable public escrow;
    
    // Voting phase variables
    mapping(address => bytes32) envelopes;

    Conditions voting_condition;

    uint public naySoul;
    uint public yaySoul;

    // Refund phase variables
    mapping(address => Refund) souls;
    address[] voters;

    /// @notice The constructor only initializes internal variables
    /// @param _candidate (address) The address of the mayor candidate
    /// @param _escrow (address) The address of the escrow account
    /// @param _quorum (address) The number of voters required to finalize the confirmation
    constructor(address payable _candidate, address payable _escrow, uint32 _quorum) public {
        candidate = _candidate;
        escrow = _escrow;
        voting_condition = Conditions({quorum: _quorum, envelopes_casted: 0, envelopes_opened: 0});
    }


    /// @notice Store a received voting envelope
    /// @param _envelope The envelope represented as the keccak256 hash of (sigil, doblon, soul) 
    function cast_envelope(bytes32 _envelope) canVote public {
        
        if(envelopes[msg.sender] == 0x0) // => NEW, update on 17/05/2021
            voting_condition.envelopes_casted++;

        envelopes[msg.sender] = _envelope;
        emit EnvelopeCast(msg.sender);
    }
    
    
    /// @notice Open an envelope and store the vote information
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _doblon (bool) The voting preference
    /// @dev The soul is sent as crypto
    /// @dev Need to recompute the hash to validate the envelope previously casted
    function open_envelope(uint _sigil, bool _doblon) canOpen public payable {

        require(envelopes[msg.sender] != 0x0, "The sender has not casted any votes");

        // Recompute the hash to check if the two envelopes correspond
        bytes32 _casted_envelope = envelopes[msg.sender];
        bytes32 _sent_envelope = 0x0;
        _sent_envelope = compute_envelope(_sigil, _doblon, msg.value);
        require(_casted_envelope == _sent_envelope, "Sent envelope does not correspond to the one casted");

        // Add the sender of the transaction to the voters
        voters.push(msg.sender);
        // Save the souls sent by the voter, to eventually refund him if necessary
        souls[msg.sender] = Refund(msg.value, _doblon);
        // Add the souls to the respective fund
        if (_doblon == true) yaySoul += msg.value;
        else naySoul += msg.value;
        // Increase the number of open envelopes
        voting_condition.envelopes_opened++;
        // Emit the event
        emit EnvelopeOpen(msg.sender, msg.value, _doblon);
        // Making the following call here produce an additional cost (for the mayor_or_sayonara() execution) for the last voting account
        //if (voting_condition.envelopes_opened == voting_condition.envelopes_casted) mayor_or_sayonara();

    }
    
    
    /// @notice Either confirm or kick out the candidate. Refund the electors who voted for the losing outcome
    function mayor_or_sayonara() canCheckOutcome public {

        uint fund = 0;
        bool success = false;

        // Check if the candidate for mayor is confirmed or not
        if (yaySoul > naySoul) {
            // Candidate confirmed: transfer the yay souls collected to the candidate
            fund = yaySoul;
            // Update the balance before the transition to the candidate (to avoid re-entrancy problems)
            yaySoul = 0;
            naySoul = 0;
            // Send the souls
            (success, ) = candidate.call{value: fund}("");
            require(success, "Contract execution Failed");
            fund = 0;

            // Refund the losing voters
            for (uint i=0; i<voting_condition.quorum; i++) {
                if (souls[voters[i]].doblon == false) {
                    // Update the balance to refund before the transition (to avoid re-entrancy problems)
                    fund = souls[voters[i]].soul;
                    souls[voters[i]].soul = 0;
                    // Send the souls back to the losing voter
                    (success, ) = payable(voters[i]).call{value: fund}("");
                    require(success, "Contract execution Failed");
                    fund = 0;
                }
            }

            // Emit the event
            emit NewMayor(candidate);
        }

        else {
            // Candidate rejected: transfer the nay souls collected to the escrow
            fund = naySoul;
            // Update balance before the transaction to the escrow (to avoid re-entrancy problems)
            yaySoul = 0;
            naySoul = 0;
            // Send the souls to the escrow
            (success, ) = escrow.call{value: fund}("");
            require(success, "Contract execution Failed");
            fund = 0;

            // Refund the losing voters
            for (uint i=0; i<voting_condition.quorum; i++) {
                if (souls[voters[i]].doblon == true) {
                    // Update the balance to refund before the transition (to avoid re-entrancy problems)
                    fund = souls[voters[i]].soul;
                    souls[voters[i]].soul = 0;
                    // Send the souls back to the losing voter
                    (success, ) = payable(voters[i]).call{value: fund}("");
                    require(success, "Contract execution Failed");
                    fund = 0;
                }
            }
            
            // Emit the event
            emit Sayonara(escrow);
        }

        // Destruct the contract (the escrow receives the eventually remaining fund)
        selfdestruct(escrow);

    }
 
 
    /// @notice Compute a voting envelope
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _doblon (bool) The voting preference
    /// @param _soul (uint) The soul associated to the vote
    function compute_envelope(uint _sigil, bool _doblon, uint _soul) public pure returns(bytes32) {
        return keccak256(abi.encode(_sigil, _doblon, _soul));
    }
    
}