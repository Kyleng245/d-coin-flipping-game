pragma solidity ^0.8;

contract Bank {
    address payable owner = payable(0x1430a57E9ff80EbEC8256948135a8c9117Da1195);
    uint256 stage = 0;
    address payable[2] players;
    bytes32[2] hashes;
    string[2] values;
    uint[2] deposits;
    bytes32[2] test_hashes;
    bytes32[2] value_ints;

    bool[2][3] ReceiveArray = [[false, false], [false, false], [false, false]];

    event Receive(
        bool[2] receviedHashes,
        bool[2] receivedValues,
        bool[2] winArray
    );
    event Verify(string txHash, address player);
    event ReceiveInfo(string[5] txHashes);

    function get_stage() public view returns (uint256) {
        return stage;
    }

    function get_hashes() public view returns (bytes32, bytes32) {
        return (hashes[0], hashes[1]);
    }

    function get_players() public view returns (address, address) {
        return (players[0], players[1]);
    }

    function get_deposits() public view returns (uint256, uint256) {
        return (deposits[0], deposits[1]);
    }

    function get_receive_array() public view returns (bool, bool, bool, bool) {
        return (
            ReceiveArray[0][0],
            ReceiveArray[0][1],
            ReceiveArray[1][0],
            ReceiveArray[1][1]
        );
    }

    function reset() public {
        // for (uint i = 0; i<ReceiveArray.length; i++){
        //     for (uint j=0; j<ReceiveArray[i].length; j++){
        //         if (ReceiveArray[i][j] != true){
        //             if (players[0] != address(0)){
        //                 players[0].transfer(1);
        //             }
        //             if (players[1] != address(0)){
        //                 players[1].transfer(1);
        //             }
        //         }
        //     }
        // }
        stage = 0;
        players[0] = payable(address(0));
        players[1] = payable(address(0));
        hashes[0] = bytes32(0);
        hashes[1] = bytes32(0);
        test_hashes[0] = bytes32(0);
        test_hashes[1] = bytes32(0);
        deposits[0] = 0;
        deposits[1] = 0;
        values[0] = "";
        values[1] = "";
        ReceiveArray = [[false, false], [false, false]];
    }

    function commit(address payable player, bytes32 hash_val) public payable {
        require(
            players[0] != player,
            "You are player 1 and already submitted your hashed value"
        );
        require(
            players[1] != player,
            "You are player 2 and already submitted your hashed value"
        );
        if (stage == 0) {
            players[0] = player;
            hashes[0] = hash_val;
            stage = 1;
            deposits[0] = msg.value;
            ReceiveArray[0][0] = true;
            owner.transfer(deposits[0]);
            emit Receive(ReceiveArray[0], ReceiveArray[1], ReceiveArray[2]);
        } else if (stage == 1) {
            players[1] = player;
            hashes[1] = hash_val;
            stage = 2;
            deposits[1] = msg.value;
            ReceiveArray[0][1] = true;
            owner.transfer(deposits[1]);
            emit Receive(ReceiveArray[0], ReceiveArray[1], ReceiveArray[2]);
        }
    }

    function get_values() public view returns (string memory, string memory) {
        return (values[0], values[1]);
    }

    function get_test_hashes() public view returns (bytes32, bytes32) {
        return (test_hashes[0], test_hashes[1]);
    }

    function compare_hashes() public view returns (bool) {
        return test_hashes[0] == hashes[0] && test_hashes[1] == hashes[1];
    }

    function reveal(
        address payable player,
        string memory val,
        bytes32 value_int
    ) public payable {
        if (player == players[0]) {
            require(hashes[0] != bytes32(0), "You have not submitted a hash");
            values[0] = val;
            test_hashes[0] = sha256(abi.encodePacked(val));
            require(
                test_hashes[0] == hashes[0],
                "You submitted an inconsisent hash and value pair"
            );
            value_ints[0] = value_int;
            ReceiveArray[1][0] = true;
            emit Receive(ReceiveArray[0], ReceiveArray[1], ReceiveArray[2]);
        }
        if (player == players[1]) {
            require(hashes[1] != bytes32(0), "You have not submitted a hash");
            values[1] = val;
            test_hashes[1] = sha256(abi.encodePacked(val));
            require(
                test_hashes[1] == hashes[1],
                "You submitted an inconsisent hash and value pair"
            );
            value_ints[1] = value_int;
            ReceiveArray[1][1] = true;
            emit Receive(ReceiveArray[0], ReceiveArray[1], ReceiveArray[2]);
        }
        if (ReceiveArray[1][0] == true && ReceiveArray[1][1] == true) {
            uint result = (uint256(value_ints[0]) + uint(value_ints[1])) % 2;
            if (result == 0) {
                ReceiveArray[2][0] = true;
                emit Receive(ReceiveArray[0], ReceiveArray[1], ReceiveArray[2]);
            }
            if (result == 1) {
                ReceiveArray[2][1] = true;
                emit Receive(ReceiveArray[0], ReceiveArray[1], ReceiveArray[2]);
            }
        }
    }

    function transfer_money(
        uint256 player_index,
        address payable player_address
    ) public payable {
        require(
            players[player_index] == player_address,
            "You are not the winner."
        );
        players[player_index].transfer(msg.value);
        reset();
    }

    function send_hash(string memory txHash) public {
        emit Verify(txHash, msg.sender);
    }

    function send_tx_info(string[5] memory txHashes) public {
        emit ReceiveInfo(txHashes);
    }
}
