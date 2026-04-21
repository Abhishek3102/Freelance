# Decentralized Freelance Marketplace

> **Zero commission. AI-matched. Trustless payments.**

A Web3-powered freelance marketplace where clients and freelancers transact directly through a smart contract escrow — no platform cut, no middleman holding your money.

---

## What Is This?

This is a full-stack decentralized application (dApp) that combines traditional web technologies with blockchain infrastructure to create a commission-free freelance platform. Payments are locked inside an Ethereum smart contract and only released when both parties are satisfied. If there is a disagreement, an impartial on-chain arbiter resolves it.

On top of that, an **AI matching engine** automatically finds the best-fit freelancers for every job by comparing skill embeddings using vector search, and **Google Gemini** parses and structures resume PDFs when freelancers apply.

---

## How It Works

```
[ Browser (Next.js) ]  ←→  [ Python Backend (FastAPI) ]  ←→  [ Ethereum Sepolia ]
   User Interface            MongoDB + AI + Web3 calls         Smart Contract Escrow
```

There are three independently running parts:

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 | UI, wallet connection, contract calls |
| **Backend** | FastAPI (Python) | Jobs, proposals, AI matching, blockchain orchestration |
| **Blockchain** | Solidity on Ethereum Sepolia | Escrow logic — holds and releases ETH |

---

## The Job Lifecycle

```
1. Client posts a job  →  stored in MongoDB, status: OPEN

2. AI matching runs  →  Qdrant vector search ranks freelancers by skill similarity

3. Freelancer applies  →  submits proposal + PDF resume
                          Gemini AI parses the resume
                          Client receives a notification

4. Client accepts a proposal  →  backend signs a blockchain TX to create the on-chain escrow job

5. Client funds the escrow  →  calls deposit() via MetaMask
                                ETH is locked in the smart contract, status: ACTIVE

6a. Work approved  →  client calls releasePayment() via MetaMask
                       ETH is sent directly to the freelancer's wallet, status: COMPLETE

6b. Dispute raised  →  either party calls raiseDispute() via MetaMask
                        ETH is frozen, status: DISPUTE
                        Arbiter reviews in the admin panel and calls resolveDispute()
                        ETH is split per the arbiter's ruling
```

---

## Smart Contract — `FreelanceEscrow.sol`

The core contract deployed on **Ethereum Sepolia testnet**. It manages the escrow lifecycle:

| Function | Who calls it | What it does |
|---|---|---|
| `createJob()` | Platform backend wallet | Registers a job on-chain with client, freelancer, and amount |
| `deposit()` | Client (via MetaMask) | Locks the exact ETH amount into the contract |
| `releasePayment()` | Client (via MetaMask) | Sends locked ETH to the freelancer |
| `raiseDispute()` | Client or Freelancer (via MetaMask) | Freezes funds, flags job as disputed |
| `resolveDispute()` | Arbiter only | Splits funds between both parties by percentage |

Contract statuses: `CREATED → ACTIVE → COMPLETE` or `ACTIVE → DISPUTE → COMPLETE`

---

## Technology Stack

| Area | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.x |
| Contract Tooling | Hardhat |
| Blockchain | Ethereum Sepolia Testnet |
| RPC Provider | Alchemy |
| Frontend | Next.js 16, React 19, TypeScript |
| Wallet | RainbowKit + Wagmi + Viem |
| Auth | NextAuth v4 + Google OAuth |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| Backend | FastAPI (Python), Uvicorn |
| Database | MongoDB Atlas (Motor async driver) |
| AI Matching | Qdrant (vector DB) + FastEmbed (`BAAI/bge-small-en-v1.5`) |
| Resume Parsing | Google Gemini Flash |
| Real-time | WebSockets (FastAPI) |

---

## Project Structure

```
Freelance/
├── contracts/
│   └── FreelanceEscrow.sol       ← The escrow smart contract
├── scripts/
│   └── deploy.js                 ← Hardhat deployment script
├── hardhat.config.js             ← Hardhat config (Sepolia network)
├── package.json                  ← Root Node.js deps (Hardhat)
│
├── app/                          ← Python FastAPI backend
│   ├── main.py                   ← All API route handlers
│   ├── services.py               ← Blockchain calls (Web3.py) + AI matching
│   ├── db_service.py             ← All MongoDB operations
│   ├── ai_service.py             ← Gemini resume parsing
│   ├── models.py                 ← Pydantic request/response models
│   ├── config.py                 ← Reads settings from .env
│   ├── constants.py              ← Job/proposal status strings
│   ├── auth.py                   ← JWT token verification
│   ├── socket_manager.py         ← WebSocket manager (live notifications)
│   ├── seed_data.py              ← Seeds initial jobs into MongoDB
│   └── requirements.txt          ← Python dependencies
│
├── client/                       ← Next.js frontend
│   ├── app/
│   │   ├── page.tsx              ← Landing page
│   │   ├── dashboard/            ← Client + Freelancer dashboards
│   │   ├── jobs/                 ← Job listings & post-a-job
│   │   ├── workroom/[jobId]/     ← Active job workspace
│   │   └── admin/disputes/       ← Arbiter-only dispute resolution panel
│   ├── components/               ← Reusable React components
│   ├── lib/abis.ts               ← Escrow contract ABI for frontend calls
│   └── .env.local                ← Frontend environment variables
│
├── .env                          ← Backend environment variables
└── local_qdrant_db/              ← Local Qdrant vector DB (auto-created)
```

---

## User Roles

| Role | Access |
|---|---|
| **Client** | Post jobs, view proposals, accept a freelancer, fund escrow, release payment, raise disputes |
| **Freelancer** | Browse open jobs, submit proposals with resume PDF, raise disputes |
| **Arbiter** | Access `/admin/disputes`, resolve disputes by setting client/freelancer split |

> The Arbiter is identified by the `PLATFORM_ADDRESS` wallet — the same wallet used to deploy the contract. Only this address can call `resolveDispute()`.

---

## API Endpoints (Backend)

The backend runs at `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/jobs/` | All open jobs |
| `POST` | `/jobs/post/` | Client posts a new job |
| `GET` | `/jobs/posted/` | Jobs posted by the logged-in user |
| `GET` | `/jobs/{id}/applicants/` | All proposals for a job (client only) |
| `POST` | `/jobs/{id}/match/` | Run AI matching for a job |
| `POST` | `/jobs/{id}/propose/` | Freelancer submits proposal + PDF resume |
| `POST` | `/proposals/{id}/reject/` | Client rejects a proposal |
| `POST` | `/jobs/{id}/accept/` | Accept proposal + create on-chain escrow |
| `POST` | `/jobs/{id}/fund/` | Sync backend after client funds escrow |
| `GET` | `/jobs/{id}/status/` | Full job + live escrow status |
| `POST` | `/jobs/{id}/complete/` | Sync backend after payment released |
| `POST` | `/jobs/{id}/dispute/` | Sync backend after dispute raised |
| `GET` | `/notifications/` | Fetch user notifications |
| `PUT` | `/notifications/{id}/read` | Mark a notification as read |
| `WS` | `/ws/{user_id}` | WebSocket for real-time notifications |

---

## Steps to Run This Project

👉 **[See INSTRUCTIONS.md](./INSTRUCTIONS.md)**
