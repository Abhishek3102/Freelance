# Running the Project — Step by Step

This guide walks you through setting up and running the Decentralized Freelance Marketplace from scratch on your local machine.

> **OS:** Windows | **Shell:** PowerShell

---

## Prerequisites

Install these tools before starting. Click the links to download.

| Tool | Why you need it |
|---|---|
| [Node.js v20+](https://nodejs.org) | Runs the frontend and Hardhat (blockchain tooling) |
| [Python 3.11+](https://python.org) | Runs the backend server |
| [Git](https://git-scm.com) | Clone the repository |
| [MetaMask](https://metamask.io) | Browser extension — your Ethereum wallet |

---

## Step 1 — Clone the Repository

```powershell
cd D:\Desktop
git clone <your-repo-url> Freelance
cd Freelance
```

---

## Step 2 — Get Free Test ETH (SepoliaETH)

The project runs on Ethereum's **Sepolia testnet** — a practice network where ETH is free and has no real value.

1. Open **MetaMask** in your browser
2. Switch the network to **Sepolia** (click the network dropdown → enable test networks if not visible)
3. Copy your wallet address (starts with `0x`)
4. Go to **https://www.alchemy.com/faucets/ethereum-sepolia**
5. Paste your wallet address → click **"Send me ETH"**
6. Wait ~1 minute. You will receive `0.5 SepoliaETH` for free

---

## Step 3 — Get an Alchemy RPC URL

The backend needs a URL to communicate with the Sepolia blockchain.

1. Go to **https://www.alchemy.com** → create a free account
2. Click **"Create new app"** → choose **Ethereum** → **Sepolia**
3. Open your app → click **"API Key"** → copy the **HTTPS** URL
   - It looks like: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`

---

## Step 4 — Get a Google Gemini API Key

Used by the backend to parse resume PDFs using AI.

1. Go to **https://aistudio.google.com/app/apikey**
2. Click **"Create API Key"** → copy the key

---

## Step 5 — Set Up MongoDB Atlas (Free)

All jobs, proposals, users, and notifications are stored here.

1. Go to **https://cloud.mongodb.com** → create a free account
2. Create a new **Free Cluster (M0)**
3. Create a **Database User** — set a username and password
4. Go to **Network Access** → **Add IP Address** → enter `0.0.0.0/0` (allow from anywhere)
5. Go to **Connect** → **Drivers** → copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster.mongodb.net/`
   - Replace `<password>` with the password you set in step 3

---

## Step 6 — Set Up Google OAuth (for Login)

The "Sign in with Google" button needs credentials from Google Cloud.

1. Go to **https://console.cloud.google.com**
2. Create a new project (or use an existing one)
3. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Choose **Web application**
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. Click **Create** → copy the **Client ID** and **Client Secret**

---

## Step 7 — Export Your MetaMask Private Key

> ⚠️ **Use a dedicated development wallet only. Never use a wallet with real funds.**

1. Open MetaMask → click the three dots next to your account
2. Click **Account Details** → **Show Private Key**
3. Enter your MetaMask password → copy the private key

---

## Step 8 — Fill In the Environment Files

You now have all the values needed. Fill in the two `.env` files below.

### `D:\Desktop\Freelance\.env` — Backend

Open this file and replace the placeholder values:

```env
# MongoDB
MONGODB_URI="mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?appName=YOUR_APP"
DATABASE_NAME="freelance_db"

# Google Gemini
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Blockchain
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
CHAIN_ID=11155111
PLATFORM_ADDRESS="0xYOUR_WALLET_ADDRESS"
PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY"

# NextAuth — must be a long random string, identical to the one in client/.env.local
NEXTAUTH_SECRET="a_long_random_secret_string_at_least_32_characters"

# Contract addresses — leave empty for now, fill in after Step 10
ESCROW_CONTRACT_ADDRESS=""
RATING_CONTRACT_ADDRESS=""

LOG_LEVEL="INFO"
```

### `D:\Desktop\Freelance\client\.env.local` — Frontend

```env
# API — point to local backend
NEXT_PUBLIC_API_URL="http://localhost:8000"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="a_long_random_secret_string_at_least_32_characters"

# MongoDB (same URI as backend)
MONGODB_URI="mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?appName=YOUR_APP"

# Google OAuth
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Contract address — leave empty for now, fill in after Step 10
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=""
NEXT_PUBLIC_PLATFORM_ADDRESS="0xYOUR_WALLET_ADDRESS"
```

> **Important:** `NEXTAUTH_SECRET` must be **exactly the same string** in both files.

---

## Step 9 — Install Dependencies

Run each block in a separate terminal or one after the other.

### 9A — Root (Hardhat)

```powershell
cd D:\Desktop\Freelance
npm install
```

### 9B — Backend (Python)

```powershell
cd D:\Desktop\Freelance\app

# Create a virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\activate

# Install all Python packages
pip install -r requirements.txt

# Download the NLP language model (needed for AI service)
python -m spacy download en_core_web_sm
```

### 9C — Frontend (Next.js)

```powershell
cd D:\Desktop\Freelance\client
npm install
```

---

## Step 10 — Deploy the Smart Contract to Sepolia

This publishes `FreelanceEscrow.sol` to the blockchain. **You only need to do this once.**

```powershell
cd D:\Desktop\Freelance
npx hardhat run scripts/deploy.js --network sepolia
```

You will see output like this:

```
Deploying contracts with the account: 0xYOUR_ADDRESS
FreelanceEscrow deployed to: 0xABC123...

--- COPY THESE ADDRESSES TO .env ---
ESCROW_CONTRACT_ADDRESS=0xABC123...
PLATFORM_ADDRESS=0xYOUR_ADDRESS
```

**Now go back to both `.env` files and paste in the `ESCROW_CONTRACT_ADDRESS` value.**

---

## Step 11 — Run the Backend

Open a terminal window and run:

```powershell
cd D:\Desktop\Freelance

# Activate the Python virtual environment
.\app\venv\Scripts\activate

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:

```
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000
```

- Health check: **http://localhost:8000**
- Interactive API docs: **http://localhost:8000/docs**

---

## Step 12 — Run the Frontend

Open a **separate** terminal window and run:

```powershell
cd D:\Desktop\Freelance\client
npm run dev
```

You should see:

```
▲ Next.js
- Local: http://localhost:3000
```

Open **http://localhost:3000** in your browser. The app is running.

---

## You're Ready

Here is a quick summary of what to do next inside the app:

1. **Sign in** using the Google button (top right)
2. Connect your **MetaMask wallet** (make sure it is on Sepolia network)
3. As a **Client**: go to `/jobs` → post a job → view proposals → accept one → fund escrow
4. As a **Freelancer**: go to `/jobs` → find an open job → submit a proposal with your resume PDF
5. Once escrow is funded, both parties access the **Workroom** at `/workroom/{jobId}`
6. The **Arbiter** (PLATFORM_ADDRESS wallet) can access `/admin/disputes` to resolve any disputes

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Backend won't start | Check all values in `D:\Desktop\Freelance\.env` are filled in |
| `spacy` import error | Run `python -m spacy download en_core_web_sm` |
| MetaMask transaction fails | Make sure MetaMask is switched to **Sepolia** network |
| No test ETH | Use the Alchemy faucet: https://www.alchemy.com/faucets/ethereum-sepolia |
| Contract call fails | Confirm `ESCROW_CONTRACT_ADDRESS` is correctly pasted in both `.env` files |
| Login not working | Verify the redirect URI in Google Cloud Console matches `http://localhost:3000/api/auth/callback/google` |
| Frontend shows API errors | Make sure the backend (`uvicorn`) is running on port 8000 |
| `NEXTAUTH_SECRET` errors | The value must be identical in both `.env` and `client/.env.local` |
