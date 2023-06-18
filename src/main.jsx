import { eth, Web3 } from 'web3';
import { useState, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { randomBytes, createHash } from 'crypto';
import Contract from 'web3-eth-contract';
import abi from '../contracts/banker.json';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import abiDecoder from 'abi-decoder'
import dayjs, { Dayjs } from 'dayjs';
import ScaleIcon from '@mui/icons-material/Scale';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import {
    AppBar,
    Box,
    Button,
    CssBaseline,
    Dialog,
    GlobalStyles,
    IconButton,
    InputAdornment,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    MenuItem,
    Stack,
    TextField,
    Toolbar,
    Typography,
    Grid,
    Snackbar,
    Icon
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
    Add,
    CurrencyExchange,
    Details,
    HistoryOutlined,
    Home,
    Info,
    InfoOutlined,
    NorthEast,
    PartyMode,
    Payment,
    Receipt,
    Send,
    SouthWest,
    TransferWithinAStation,
    Visibility,
    VisibilityOff
} from '@mui/icons-material';
import { create } from 'zustand';
import { DataGrid, GridToolbarContainer } from "@mui/x-data-grid";
import { BrowserRouter, createBrowserRouter, Link, Route, RouterProvider, Routes } from "react-router-dom";
import { enqueueSnackbar, SnackbarProvider } from "notistack";
const web3 = new Web3('ws://localhost:8546'); //local Geth node
web3.eth.handleRevert = true
await web3.eth.wallet.load('');

const contractAddr = "0xf8081f451429b15105f7a7fc0A914Bc905F2f2CD"
const contract = new web3.eth.Contract(abi, contractAddr, { handleRevert: true })
const bankerAddr = "0x1430a57E9ff80EbEC8256948135a8c9117Da1195"
abiDecoder.addABI(abi)

//Create Account
const useWalletStore = create((set) => ({
    wallet: [...web3.eth.wallet], createAccount: async () => {
        const newAccount = web3.eth.accounts.create();
        web3.eth.wallet.add(newAccount);
        await web3.eth.wallet.save('');
        set({ wallet: [...web3.eth.wallet] });
    }
}))

//Obtain Histry, get block number, traverse all the blocks (in the beginning)
const History = () => {
    const [history, setHistory] = useState([]);
    const [pending, setPending] = useState(false);
    const load = async () => {
        setPending(true);
        const lastBlockNumber = parseInt(history.at(-1)?.blockNumber ?? -1);
        const newHistory = [];
        for (let i = lastBlockNumber + 1; i <= await web3.eth.getBlockNumber(); i++) {
            const block = await web3.eth.getBlock(i);//traverse the blocks
            for (const txHash of block.transactions ?? []) {
                const tx = await web3.eth.getTransaction(txHash);//Obtain the transaction by hash
                console.log(tx)
                const receipt = await web3.eth.getTransactionReceipt(txHash);
                console.log(receipt)
                newHistory.push({ ...tx, ...receipt, timestamp: block.timestamp })
            }//obtain the transaction
        }
        setHistory((prevHistory) => [...prevHistory, ...newHistory]);//Put together the new history and the old ones
        setPending(false);
    };
    useEffect(() => {
        load()
    }, []);
    //Monitor the chain (creation of new block)
    useEffect(() => {
        let subscription;
        (async () => {
            subscription = await web3.eth.subscribe('newHeads');
            subscription.on('data', async (params) => {
                const block = await web3.eth.getBlock(params.number);
                const newHistory = [];
                for (const txHash of block.transactions ?? []) {
                    const tx = await web3.eth.getTransaction(txHash);
                    const receipt = await web3.eth.getTransactionReceipt(txHash);
                    newHistory.push({ ...tx, ...receipt, timestamp: block.timestamp })
                }
                setHistory((prevHistory) => {
                    const history = [...prevHistory];
                    for (const i of newHistory) {
                        if (history.length === 0 || i.blockNumber > history.at(-1).blockNumber) {
                            history.push(i);
                        }
                    }
                    return history;
                });
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
            rows={history}
            loading={pending}
            initialState={{
                sorting: {
                    sortModel: [{ field: 'timestamp', sort: 'desc' }]
                }
            }}
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
}

const Index = () => {
    const wallet = useWalletStore((state) => state.wallet);
    const createAccount = useWalletStore((state) => state.createAccount);// Create account
    const [currentAccount, setCurrentAccount] = useState();
    const [infoOpen, setInfoOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const me = currentAccount === undefined ? undefined : wallet[currentAccount];
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [balance, setBalance] = useState(0);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState(0);
    const [randNum, setRandNum] = useState()
    const [stage, setStage] = useState()
    const [winIndex, setWinIndex] = useState()
    const bankerAcc = wallet.filter(acc => acc.address === bankerAddr)[0]
    const [players, setPlayers] = useState()
    const checkStage = async (stagesArr) => {
        console.log(stagesArr)
        if (stagesArr[0][0] === true) {
            setStage('Player 1 has commited his value')
        }
        if (stagesArr[0][1] === true) {
            setStage('Player 2 has commited values, please reveal your values')
        }
        if (stagesArr[1][0] === true) {
            setStage("Player 1 has revealed his value")
        }
        if (stagesArr[1][1] === true) {
            setStage("Player 2 has revealed his value")
        }
        if (stagesArr[2][0]) {
            setStage("Player 1 wins. Player 1 please click TRANSFER to withdraw the money and refresh the page.")
            setWinIndex(0)
        }
        if (stagesArr[2][1]) {
            setStage("Player 2 wins. Player 2 please click TRANSFER to withdraw the money and refresh the page.")
            setWinIndex(1)
        }
    }
    // const checkWin = (winArr) => {
    //     console.log(winArr)
    //     if (winArr[0] === true) {
    //         setWin('Player 1 wins')
    //     }
    //     if (winArr[1] === true){
    //         setWin("Player 2 wins")
    //     }
    // }
    useEffect(
        () => {
            (async () => {
                const subscription = await contract.events.Receive([], (err, result) => console.log(err, result))._emitter
                subscription.on("connected", subId => console.log(subId))
                    .on('data', data => checkStage(data.returnValues))
            }
            )()
        }
        , [])

    useEffect(() => {
        if (currentAccount !== undefined && !pending) {
            web3.eth.getBalance(wallet[currentAccount].address).then(setBalance);
        }
    }, [currentAccount, pending]);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, {
                variant: 'error'
            })
            setError('');
        }
    }, [error]);

    return <>
        {pending && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, zIndex: 10000, width: '100%' }} />}
        <AppBar color='transparent' position='static'>
            <Toolbar>
                <IconButton color='primary' component={Link} to='/'>
                    <Home />
                </IconButton>
                <IconButton color='primary' component={Link} to='/history'>
                    <HistoryOutlined />
                </IconButton>
                <IconButton color='primary' component={Link} to='/bank'>
                    <AccountBalanceIcon />
                </IconButton>
                <IconButton color='primary' component={Link} to='/verify'>
                    <ScaleIcon />
                </IconButton>
                <IconButton color='primary' component={Link} to='banker_verify'>
                    <AdminPanelSettingsIcon />
                </IconButton>
                <Box ml='auto'></Box>
                <TextField
                    sx={{
                        width: 500
                    }}
                    size='small'
                    select
                    label="Account"
                    value={currentAccount ?? ''}
                    onChange={e => {
                        setCurrentAccount(+e.target.value);
                        contract.defaultAccount = wallet[+e.target.value].address;
                    }}
                >
                    {wallet.map((a, i) => <MenuItem key={i} value={i}>{a.address}</MenuItem>)}
                </TextField>
                <IconButton color='primary' onClick={() => {
                    createAccount();
                }}>
                    <Add />
                </IconButton>
                <IconButton color='primary' disabled={me === undefined} onClick={() => {
                    setInfoOpen(true);
                }}>
                    <InfoOutlined />
                </IconButton>
                <IconButton color='primary' disabled={me === undefined} onClick={() => {
                    setPaymentOpen(true);
                }}>
                    <Payment />
                </IconButton>
            </Toolbar>
        </AppBar>
        <Routes>
            <Route path='/' element={<Betting randNum={randNum} setRandNum={setRandNum} currentAccount={me} stage={stage} bankerAcc={bankerAcc} winIndex={winIndex} />} />
        </Routes>
        <Routes>
            <Route path='/history' element={<History />} />
        </Routes>
        <Routes>
            <Route path='/bank' element={<Bank />} />
        </Routes>
        <Routes>
            <Route path='/verify' element={<Scale currentAccount={me} />} />
        </Routes>
        <Routes>
            <Route path='/banker_verify' element={<Panel bankerAcc={bankerAcc} />} />
        </Routes>
        <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}>
            <Stack gap={2} sx={{
                width: 500, margin: 2, display: 'flex', flexDirection: 'column',
            }}>
                <TextField
                    label='Balance'
                    value={web3.utils.fromWei(balance, 'ether')}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">
                            ETH
                        </InputAdornment>
                    }}
                ></TextField>
                <TextField
                    label='Private Key'
                    type={showPrivateKey ? 'text' : 'password'} value={me?.privateKey}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={() => setShowPrivateKey((show) => !show)}
                                onMouseDown={(e) => e.preventDefault()}
                                edge="end"
                            >
                                {showPrivateKey ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    }}
                />
                <TextField
                    label='Address'
                    value={me?.address}
                />
            </Stack>
        </Dialog>
        <Dialog open={paymentOpen} onClose={() => {
            setPaymentOpen(false);
            setRecipientAddress('');
            setAmount(0);
        }}>
            <Stack gap={2} sx={{
                width: 500, margin: 2, display: 'flex', flexDirection: 'column',
            }}>
                <TextField
                    label='From'
                    value={me?.address}
                />
                <TextField
                    label='To'
                    value={recipientAddress}
                    onChange={(e) => {
                        setRecipientAddress(e.target.value);
                    }}
                />
                <TextField
                    label='Amount'
                    type='number'
                    value={amount}
                    onChange={(e) => {
                        setAmount(+e.target.value);
                    }}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">
                            ETH
                        </InputAdornment>
                    }}
                />
                <Button onClick={async () => { //Transfer money
                    setPending(true);
                    try {
                        await web3.eth.sendSignedTransaction((await me.signTransaction({
                            to: recipientAddress, from: me.address, gas: 1000000, value: web3.utils.toWei(amount, 'ether'),
                        })).rawTransaction);
                        setPaymentOpen(false);
                        setRecipientAddress('');
                        setAmount(0);
                    } catch (e) {
                        setError(e.message);
                    }
                    setPending(false);
                }}>
                    Send
                </Button>
            </Stack>
        </Dialog>
    </>
}
const Betting = ({ randNum, setRandNum, currentAccount, stage, bankerAcc, winIndex }) => {
    const [error, setError] = useState('')
    const [player, setPlayer] = useState()
    const [hash, setHash] = useState()
    const [players, setPlayers] = useState()
    console.log(randNum, hash)
    const commitFunction = async () => {
        try {
            var tx = {
                from: currentAccount?.address,
                to: contractAddr,
                data: contract.methods.commit(currentAccount?.address, hash).encodeABI(),
                value: web3.utils.toWei(1, 'ether'),
                gas: 10000000,
            }
            var signedTx = await currentAccount.signTransaction(tx, currentAccount.privateKey)
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            const players = await contract.methods.get_players().call()
            setPlayers(players)
            if (players[0] === currentAccount.address) {
                setPlayer("You are Player 1")
            } else if (players[1] === currentAccount.address) {
                setPlayer("You are Player 2")
            }
        }
        catch (error) {
            setError(error.reason)
        }
    }
    const revealFunction = async () => {
        // console.log("calling reveal function")
        // console.log(currentAccount)
        // console.log(value)
        try {
            const tx = {
                from: currentAccount?.address,
                to: contractAddr,
                data: contract.methods.reveal(currentAccount?.address, randNum, randNum).encodeABI(),
                gas: 10000000,
            }
            const signedTx = await currentAccount.signTransaction(tx, currentAccount.privateKey)
            const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            console.log(result)
        }
        catch (error) {
            setError(error.reason)
        }

    }
    const resetFunction = async () => {
        const tx = {
            from: currentAccount?.address,
            to: contractAddr,
            data: contract.methods.reset().encodeABI(),
            // value: web3.utils.toWei(1, 'ether'),
            gas: 10000000,
        }
        const signedTx = await currentAccount.signTransaction(tx, currentAccount.privateKey)
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    }
    const transferFunction = async () => {
        try {

            var tx = {
                from: bankerAcc.address,
                to: contractAddr,
                data: contract.methods.transfer_money(winIndex, currentAccount?.address).encodeABI(),
                value: web3.utils.toWei(2 * 0.95, 'ether'),
                gas: 10000000,
            }
            var signedTx = await bankerAcc.signTransaction(tx, bankerAcc.privateKey)
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

            await setStage("Money transfer completed. Please refresh the page")
        }
        catch (error) {
            setError(error.reason)
        }
    }
    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, {
                variant: 'error'
            })
            setError('');
        }
    }, [error]);
    return (
        <Box sx={{ mx: 'auto' }}>
            <Typography variant='h4' textAlign={'center'} marginTop={6}>
                {currentAccount ? '' : 'Please select an account to continue'}
                {currentAccount?.address ? player : ''}
                {/* {player? player: ''} */}
                <br />
                {stage ? stage : 'Stage: Unitialized'}
                <br />
                {/* {win ? win : ''} */}
            </Typography>
            <Box mx={'auto'} alignItems="center" justifyContent="center" textAlign={'center'}>
                <TextField label="Random Number" variant='filled' disabled value={randNum} mx={'auto'} sx={{ width: 680, marginTop: 6 }} defaultValue={'Please Generate a Random Number'}>
                </TextField>
            </Box>
            <Box alignItems="center" justifyContent="center" textAlign={'center'} marginTop={3}>
                <Button variant='contained' onClick={() => { return setRandNum("0x" + randomBytes(32).toString('hex')) }} disabled={currentAccount ? false : true}>
                    GENERATE
                </Button>
                <Button variant='contained' onClick={() => {
                    return setHash("0x" + createHash('sha256').update(randNum).digest('hex'))
                }} disabled={currentAccount ? false : true}>
                    HASH
                </Button>
                <Button variant='contained' disabled={currentAccount ? false : true} onClick={() => commitFunction()}
                >
                    COMMIT
                </Button>
                <Button variant='contained' disabled={currentAccount ? false : true} onClick={async () => await revealFunction()} >
                    REVEAL
                </Button>
                <Button variant='contained' disabled={currentAccount ? false : true} onClick={async () => await transferFunction()}>
                    TRANFER
                </Button>
                <Button variant='contained' disabled={currentAccount ? false : true} onClick={async () => { await resetFunction(); window.location.reload() }}>
                    RESET
                </Button>
            </Box>
        </Box>
    )
}

const Bank = () => {
    const [history, setHistory] = useState([]);
    const [pending, setPending] = useState(false);
    const [selectDate, setSelectDate] = useState(dayjs());
    // const load = async () => {
    //     setPending(true);
    //     console.log('load')
    //     const lastBlockNumber = parseInt(history.at(-1)?.blockNumber ?? -1);
    //     const newHistory = [];
    //     for (let i = lastBlockNumber + 1; i <= await web3.eth.getBlockNumber(); i++) {
    //         const block = await web3.eth.getBlock(i);//traverse the blocks

    //         for (const txHash of block.transactions ?? []) {
    //             const tx = await web3.eth.getTransaction(txHash);//Obtain the transaction by hash
    //             const receipt = await web3.eth.getTransactionReceipt(txHash);
    //             const { input } = tx
    //             const decodedInput = abiDecoder.decodeMethod(input)
    //             if (tx.from === contractAddr.toLowerCase() || tx.to === contractAddr.toLowerCase()) {
    //                 newHistory.push({
    //                     ...tx, ...receipt, timestamp: block.timestamp, method: decodedInput.name,
    //                     value_revealed: decodedInput?.name === 'reveal' ? decodedInput?.params[1]?.value : '',
    //                     hash_value_submitted: decodedInput?.name === 'commit' ? decodedInput?.params[1]?.value : '',
    //                     winner: decodedInput?.name === 'transfer_money' ? decodedInput?.params[1]?.value : '',
    //                 })
    //             }
    //         }//obtain the transaction
    //     }
    //     setHistory((prevHistory) => [...prevHistory, ...newHistory]);//Put together the new history and the old ones
    //     setPending(false);
    // };
    // useEffect(() => {
    //     load()
    // }, []);
    //Monitor the chain (creation of new block)
    useEffect(() => {
        let subscription;
        (async () => {
            subscription = await web3.eth.subscribe('newHeads');
            subscription.on('data', async (params) => {
                console.log('subscribe')
                const block = await web3.eth.getBlock(params.number);
                const newHistory = [];
                for (const txHash of block.transactions ?? []) {
                    const tx = await web3.eth.getTransaction(txHash);//Obtain the transaction by hash
                    const receipt = await web3.eth.getTransactionReceipt(txHash);
                    const { input } = tx
                    const decodedInput = abiDecoder.decodeMethod(input)
                    // console.log(decodedInput)
                    const txDate = dayjs(new Date(parseInt(block.timestamp) * 1000))
                    // console.log(receipt)
                    console.log(selectDate)
                    console.log(txDate)
                    if ((tx.from === contractAddr.toLowerCase() || tx.to === contractAddr.toLowerCase()) && (txDate.get('year') === selectDate.get('year') && txDate.get('month') === selectDate.get('month') && txDate.get('day') === selectDate.get('day'))) {
                        newHistory.push({
                            ...tx, ...receipt, timestamp: block.timestamp, method: decodedInput?.name,
                            value_revealed: decodedInput?.name === 'reveal' ? decodedInput?.params[1]?.value : '',
                            hash_value_submitted: decodedInput?.name === 'commit' ? decodedInput?.params[1]?.value : '',
                            winner: decodedInput?.name === 'transfer_money' ? decodedInput?.params[1]?.value : '',
                        })
                    }
                }
                setHistory((prevHistory) => {
                    const history = [...prevHistory];
                    for (const i of newHistory) {
                        if (history.length === 0 || i.blockNumber > history.at(-1).blockNumber) {
                            history.push(i);
                        }
                    }
                    return history;
                });
            });
        })();
        return () => {
            subscription?.unsubscribe();
        }
    }, []);

    //Use Interface
    const filterSelectDate = async (newDate) => {
        {
            setPending(true);
            const lastBlockNumber = parseInt(history.at(-1)?.blockNumber ?? -1);
            const newHistory = [];
            for (let i = lastBlockNumber + 1; i <= await web3.eth.getBlockNumber(); i++) {
                const block = await web3.eth.getBlock(i);//traverse the blocks

                for (const txHash of block.transactions ?? []) {
                    const tx = await web3.eth.getTransaction(txHash);//Obtain the transaction by hash
                    const receipt = await web3.eth.getTransactionReceipt(txHash);
                    const { input } = tx
                    const decodedInput = abiDecoder.decodeMethod(input)

                    if (tx.from === contractAddr.toLowerCase() || tx.to === contractAddr.toLocaleLowerCase()) {
                        newHistory.push({
                            ...tx, ...receipt, timestamp: block.timestamp, method: decodedInput.name,
                            value_revealed: decodedInput?.name === 'reveal' ? decodedInput?.params[1]?.value : '',
                            hash_value_submitted: decodedInput?.name === 'commit' ? decodedInput?.params[1]?.value : '',
                            winner: decodedInput?.name === 'transfer_money' ? decodedInput?.params[1]?.value : '',
                        })
                    }
                    // newHistory.push({ ...tx, ...receipt, timestamp: block.timestamp })
                }//obtain the transaction
            }
            const filteredHistory = newHistory.filter((tx) => {
                const txDate = dayjs(new Date(parseInt(tx.timestamp) * 1000))
                console.log('filter')
                // console.log(txDate.get('year') === newDate.get('year'))
                // console.log(txDate.get('month') === newDate.get('month'))
                // console.log(txDate.get('day'), newDate.get('day'))
                // console.log(txDate.get('day') === newDate.get('day'))
                return txDate.get('year') === newDate.get('year') && txDate.get('month') === newDate.get('month') && txDate.get('day') === newDate.get('day')
            })

            setHistory(filteredHistory)
            setPending(false);
        }
    }
    console.log(history)
    return <Box sx={{
        height: 1000, p: 2,
    }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                label="Filter Transaction Date Picker"
                defaultValue={dayjs()}
                value={selectDate}
                onChange={async (newDate) => {
                    if (newDate !== selectDate) {
                        setSelectDate(newDate)
                        await filterSelectDate(newDate)
                    } else {
                        setHistory((prevHistory) => [...prevHistory])
                    }

                }}
            />
            {/* {console.log(selectDate)} */}
        </LocalizationProvider>
        {/* <Button variant='contained' onClick={filterSelectDate}>
            Filter
        </Button> */}
        <DataGrid
            rows={history}
            loading={pending}
            initialState={{
                sorting: {
                    sortModel: [{ field: 'timestamp', sort: 'desc' }]
                }
            }}
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
            }, {
                field: 'method',
                headerName: 'Method',
                width: 150
            }, {
                field: 'hash_value_submitted',
                headerName: 'Hash Value',
                width: 600
            }, {
                field: 'value_revealed',
                headerName: 'Value Revealed',
                width: 600
            }, {
                field: 'winner',
                headerName: 'Winner',
                width: 400
            }
            ]}
            getRowId={(row) => row.transactionHash}
            disableRowSelectionOnClick
        />
    </Box>;
}
const Scale = ({ currentAccount }) => {
    const [history, setHistory] = useState()
    const [pending, setPending] = useState()
    const [txHash, setTxHash] = useState('')
    const [error, setError] = useState()

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, {
                variant: 'error'
            })
            setError('');
        }
    }, [error]);
    const showHistory = async (hashArr) => {
        const newHistory = []
        for (const txHash of hashArr) {
            const tx = await web3.eth.getTransaction(txHash);//Obtain the transaction by hash
            console.log(tx)
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            const { input } = tx
            const decodedInput = abiDecoder.decodeMethod(input)
            // console.log(decodedInput)
            const block = await web3.eth.getBlock(tx.blockNumber)
            const txDate = dayjs(new Date(parseInt(block.timestamp) * 1000))
            // console.log(receipt)
            newHistory.push({
                ...tx, ...receipt, timestamp: block.timestamp, method: decodedInput?.name,
                value_revealed: decodedInput?.name === 'reveal' ? decodedInput?.params[1]?.value : '',
                hash_value_submitted: decodedInput?.name === 'commit' ? decodedInput?.params[1]?.value : '',
                winner: decodedInput?.name === 'transfer_money' ? decodedInput?.params[1]?.value : '',
            })
        }
        setHistory(newHistory)
    }
    useEffect(
        () => {
            (async () => {
                const subscription = await contract.events.ReceiveInfo([], (err, result) => console.log(err, result))._emitter
                subscription.on("connected", subId => console.log(subId))
                    .on('data', data => showHistory(data.returnValues.txHashes))
            }
            )()
        }
        , [])
    const sendTxHash = async () => {
        try {
            var tx = {
                from: currentAccount?.address,
                to: contractAddr,
                data: contract.methods.send_hash(String(txHash)).encodeABI(),
                gas: 10000000,
            }
            var signedTx = await currentAccount.signTransaction(tx, currentAccount.privateKey)
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        } catch (error) {
            setError(error)
        }
    }
    return <>
        <Box sx={{ mx: 'auto' }}>
            <Typography textAlign={'center'} marginTop={6}>
                Please select an account first. You could verify a gaming history by sending a transaction hash here.
                The banker will send all the contract transaction related to that game.
            </Typography>
            <Box mx={'auto'} alignItems="center" justifyContent="center" textAlign={'center'}>
                <TextField label="Submit a TxHash for Game Result Verification" value={txHash} onChange={(e) => { setTxHash(e.target.value) }} variant='filled' disabled={currentAccount === undefined} mx={'auto'} sx={{ width: 680, marginTop: 6 }} defaultValue={'Please Input Transaction Hash'}>
                </TextField>
            </Box>
            <Box alignItems="center" justifyContent="center" textAlign={'center'} marginTop={3}>
                <Button variant='contained' value={txHash} onClick={() => sendTxHash()} disabled={currentAccount === undefined}>
                    SUBMIT
                </Button>
            </Box>
        </Box>
        {
            history ?
                <DataGrid
                    rows={history}
                    loading={pending}
                    initialState={{
                        sorting: {
                            sortModel: [{ field: 'timestamp', sort: 'desc' }]
                        }
                    }}
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
                    }, {
                        field: 'method',
                        headerName: 'Method',
                        width: 150
                    }, {
                        field: 'hash_value_submitted',
                        headerName: 'Hash Value',
                        width: 600
                    }, {
                        field: 'value_revealed',
                        headerName: 'Value Revealed',
                        width: 600
                    }, {
                        field: 'winner',
                        headerName: 'Winner',
                        width: 400
                    }
                    ]}
                    getRowId={(row) => row.transactionHash}
                    disableRowSelectionOnClick
                /> : ''}
    </>
}

const Panel = ({ bankerAcc }) => {
    const [txHash, setTxHash] = useState()
    const [gameInfo, setGameInfo] = useState({
        player1commit: '',
        player2commit: '',
        player1reveal: '',
        player2reveal: '',
        transfer: ''
    })
    const [error, setError] = useState()
    // const [player1Commit, setPlayer1Commit] = useState('')
    // const [player2Commit, setPlayer2Commit] = useState('')
    // const [player1Reveal, setPlayer1Reveal] = useState('')
    // const [player2Reveal, setPlayer2Reveal] = useState('')
    // const [transfer, setTransfer] = useState('')
    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, {
                variant: 'error'
            })
            setError('');
        }
    }, [error]);
    const handleChange = (e) => {
        setGameInfo((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value
        })
        )
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            var tx = {
                from: bankerAcc?.address,
                to: contractAddr,
                data: contract.methods.send_tx_info([gameInfo.player1commit, gameInfo.player2commit, gameInfo.player1reveal, gameInfo.player2reveal, gameInfo.transfer]).encodeABI(),
                gas: 10000000,
            }
            var signedTx = await bankerAcc.signTransaction(tx, bankerAcc?.privateKey)
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        }
        catch (error) {
            setError(error)
        }
    }

    const checkTxHash = () => {
        return `Player ${txHash[1]} wants to verify all the gaming transactions related to ${txHash[0]}`
    }
    useEffect(
        () => {
            (async () => {
                const subscription = await contract.events.Verify([], (err, result) => console.log(err, result))._emitter
                subscription.on("connected", subId => console.log(subId))
                    .on('data', data => setTxHash(data.returnValues))
            }
            )()
        }
        , [])
    return (
        < Box sx={{ mx: 'auto' }}>
            <div>
                <Typography variant='h4' textAlign={'center'} marginTop={6}>
                    {txHash ? checkTxHash() : ''}
                </Typography>
            </div>
            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
                margin={'auto'}
                alignItems="center"
                justifyContent="center"
                onSubmit={handleSubmit}
            >
                <div>
                    <TextField
                        required
                        name='player1commit'
                        id="outlined-required"
                        label="Player 1 Commit"
                        value={gameInfo.player1commit}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <TextField
                        required
                        name='player2commit'
                        id="outlined-required"
                        label="Player 2 Commit"
                        value={gameInfo.player2commit}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <TextField
                        required
                        name='player1reveal'
                        id="outlined-required"
                        label="Player 1 Reveal"
                        value={gameInfo.player1reveal}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <TextField
                        required
                        name='player2reveal'
                        id="outlined-required"
                        label="Player 2 Reveal"
                        value={gameInfo.player2reveal}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <TextField
                        required
                        name='transfer'
                        id="outlined-required"
                        label="Winner Reveal"
                        value={gameInfo.transfer}
                        onChange={handleChange}
                    />
                </div>
                <Button type='submit' variant='contained'>
                    SUBMIT
                </Button>
            </Box>
        </Box >
    )
}
const App = () => {
    return <>
        <CssBaseline />
        <SnackbarProvider
            autoHideDuration={5000}
        />
        <BrowserRouter>
            <Index />
        </BrowserRouter>
    </>
}
createRoot(document.getElementById('root')).render(<App />);

