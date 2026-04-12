export const ESCROW_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_jobId",
                "type": "uint256"
            }
        ],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "_client",
                "type": "address"
            },
            {
                "internalType": "address payable",
                "name": "_freelancer",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_contractId",
                "type": "uint256"
            }
        ],
        "name": "createJob",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_jobId",
                "type": "uint256"
            }
        ],
        "name": "releasePayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_jobId",
                "type": "uint256"
            }
        ],
        "name": "raiseDispute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "jobs",
        "outputs": [
            {
                "internalType": "address payable",
                "name": "client",
                "type": "address"
            },
            {
                "internalType": "address payable",
                "name": "freelancer",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "enum FreelanceEscrow.Status",
                "name": "status",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "contractId",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "jobDeposit",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;
