# Transfer Free money from coinbase
eth.sendTransaction({from:eth.coinbase, to:'0x1430a57E9ff80EbEC8256948135a8c9117Da1195', value:web3.toWei(100,"ether"), gas:21000});
# Open up local geth node
geth --http --http.corsdomain="*" --http.api web3,eth,debug,personal,net --vmdebug --datadir /tmp/test --dev console --ws --ws.api web3,eth,debug,personal,net --ws.origins "*"

# Start the application
yarn start --port 3000