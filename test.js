const {createHash} = require('crypto');

const hashed = '0x'+ createHash('sha256').update('0xac111085c05076b2f12e0461d06190ad449e38ff393c0dc5048d11475100b269').digest('hex')
const submitted ='0x1f53bf324d0adca81bbeb08a16496450ccba440ed50baf1f63f64fc5dfc5e488'
console.log(hashed === submitted);

const [bankHistory, setbankHistory] = useState([]);
const [pending, setPending] = useState(false);
const load = async () => {
    setPending(true);
    const lastBlockNumber = parseInt(bankHistory.at(-1)?.blockNumber ?? -1);
    const newbankHistory = [];
    for (let i = lastBlockNumber + 1; i <= await web3.eth.getBlockNumber(); i++) {
        const block = await web3.eth.getBlock(i);//traverse the blocks
        for (const txHash of block.transactions ?? []) {
            const tx = await web3.eth.getTransaction(txHash);//Obtain the transaction by hash
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            newbankHistory.push({ ...tx, ...receipt, timestamp: block.timestamp })
        }//obtain the transaction
    }
    setbankHistory((prevbankHistory) => [...prevbankHistory, ...newbankHistory]);//Put together the new bankHistory and the old ones
    setPending(false);
};
useEffect(() => {
    load()
}, []);
//Monitor the chain (creation of new block)
useEffect(() => {
    let subscription;
    (async () => {
        subscription = await web3.eth.subscribe('logs', {address: contractAddr},(error, result) => {
            if(!error){
                console.log(result)
            }
        });
        console.log(subscription)
        subscription.on('data', async (params) => {
            // const block = await web3.eth.getBlock(params.number);
            // const newbankHistory = [];
            // for (const txHash of block.transactions ?? []) {
            //     const tx = await web3.eth.getTransaction(txHash);
            //     const receipt = await web3.eth.getTransactionReceipt(txHash);
            //     newbankHistory.push({ ...tx, ...receipt, timestamp: block.timestamp })
            // }
            // setbankHistory((prevbankHistory) => {
            //     const bankHistory = [...prevbankHistory];
            //     for (const i of newbankHistory) {
            //         if (bankHistory.length === 0 || i.blockNumber > bankHistory.at(-1).blockNumber) {
            //             bankHistory.push(i);
            //         }
            //     }
            //     return bankHistory;
            // });
            console.log(params)
        });
    })();
    return () => {
        subscription?.unsubscribe();
    }
}, []);
//Use Interface
return <Box sx={{
    height: 1000, p: 2,
}}>
    <DataGrid
        rows={bankHistory}
        loading={pending}
        columns={[{
            field: 'transactionHash', headerName: 'Tx Hash', width: 400,
        }, {
            field: 'from', headerName: 'From', width: 400
        }, {
            field: 'to', headerName: 'To', width: 400
        }, {
            field: 'value',
            headerName: 'Value (ETH)',
            width: 200,
            valueGetter: ({ value }) => web3.utils.fromWei(value, 'ether')
        }, {
            field: 'timestamp',
            headerName: 'Time',
            type: 'dateTime',
            valueGetter: ({ value }) => new Date(parseInt(value) * 1000),
            width: 300,
        }]}
        getRowId={(row) => row.transactionHash}
        disableRowSelectionOnClick
    />
</Box>;