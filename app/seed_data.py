import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.constants import JOB_STATUSES
from app.db_service import DATABASE_NAME

logger = logging.getLogger(__name__)

SAMPLE_JOBS = [
    {
        "client_address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "title": "DeFi Protocol Frontend Developer",
        "description": "Looking for an experienced React/Next.js developer to build the frontend for a new DeFi staking protocol. Must have Web3 experience and knowledge of ethers.js or wagmi.",
        "budget_eth": 5.0,
        "required_skills": ["React", "Web3.js", "Tailwind", "DeFi"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-27T10:00:00Z" # Mock date
    },
    {
        "client_address": "0x1234567890123456789012345678901234567890",
        "title": "Smart Contract Auditor",
        "description": "Need a security expert to audit our ERC-20 token and vesting contracts before mainnet launch. Focus on reentrancy and overflow vulnerabilities.",
        "budget_eth": 3.0,
        "required_skills": ["Solidity", "Security", "Auditing", "Foundry"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-26T15:30:00Z"
    },
    {
        "client_address": "0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEF12",
        "title": "NFT Marketplace UI Design",
        "description": "Design a high-end, futuristic UI for an NFT marketplace. Glassmorphism style preferred. Deliverables in Figma.",
        "budget_eth": 1.5,
        "required_skills": ["Figma", "UI/UX", "Design", "NFT"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-25T09:15:00Z"
    },
    {
        "client_address": "0x9999999999999999999999999999999999999999",
        "title": "Solana Rust Developer for DEX",
        "description": "We are porting our Ethereum DEX to Solana. Need a Rust developer to help with the Anchor framework implementation.",
        "budget_eth": 8.0,
        "required_skills": ["Rust", "Solana", "Anchor", "DEX"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-24T12:00:00Z"
    },
    {
        "client_address": "0x8888888888888888888888888888888888888888",
        "title": "Web3 Community Manager",
        "description": "Manage our Discord and Twitter communities. specialized in DAO governance discussions.",
        "budget_eth": 0.5,
        "required_skills": ["Community Management", "Discord", "DAO", "Social Media"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-28T08:00:00Z"
    },
    {
        "client_address": "0x7777777777777777777777777777777777777777",
        "title": "Zero-Knowledge Proof Researcher",
        "description": "Research and implement ZK-SNARKs for a privacy-focused voting application. Math background required.",
        "budget_eth": 10.0,
        "required_skills": ["Cryptography", "ZK-SNARKs", "Circom", "Math"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-23T14:45:00Z"
    },
    {
        "client_address": "0x6666666666666666666666666666666666666666",
        "title": "Generative Art NFT Collection",
        "description": "Create a generative art script (p5.js or similar) for a 10k NFT collection. Theme: Cyberpunk Nature.",
        "budget_eth": 2.5,
        "required_skills": ["Generative Art", "p5.js", "Javascript", "Creative Coding"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-22T11:20:00Z"
    },
    {
        "client_address": "0x5555555555555555555555555555555555555555",
        "title": "Full Stack Dev for DAO Dashboard",
        "description": "Build a dashboard to visualize treasury spending and proposals. Next.js + Tailwind + Ethers.js.",
        "budget_eth": 4.0,
        "required_skills": ["Next.js", "Full Stack", "DAO", "Analytics"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-21T16:50:00Z"
    },
    {
        "client_address": "0x4444444444444444444444444444444444444444",
        "title": "Technical Writer for Whitepaper",
        "description": "Rewrite and polish our technical whitepaper. Must be able to explain complex tokenomics clearly.",
        "budget_eth": 1.0,
        "required_skills": ["Technical Writing", "Tokenomics", "English", "Blockchain"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-20T10:10:00Z"
    },
    {
        "client_address": "0x3333333333333333333333333333333333333333",
        "title": "Mobile Wallet App Developer (React Native)",
        "description": "Build a non-custodial mobile wallet using React Native. Biometric auth integration needed.",
        "budget_eth": 6.0,
        "required_skills": ["React Native", "Mobile Dev", "Security", "Wallet"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-19T13:30:00Z"
    },
    {
        "client_address": "0x2222222222222222222222222222222222222222",
        "title": "IPFS Storage Solution Architect",
        "description": "Design a decentralized file storage layer for our social media dApp using IPFS and Filecoin.",
        "budget_eth": 3.5,
        "required_skills": ["IPFS", "Filecoin", "Architecture", "Storage"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-18T09:00:00Z"
    },
    {
        "client_address": "0x1111111111111111111111111111111111111111",
        "title": "Marketing Strategy for Token Launch",
        "description": "Develop a go-to-market strategy for our utility token. Includes influencer outreach and community building.",
        "budget_eth": 2.0,
        "required_skills": ["Marketing", "Growth Hacking", "Crypto", "Strategy"],
        "status": JOB_STATUSES["OPEN"],
        "posted_at": "2023-10-17T14:00:00Z"
    }
]

async def seed_jobs(client: AsyncIOMotorClient):
    """Seeds the database with sample jobs if none exist. Also associates jobs with a real client user if found."""
    db = client[DATABASE_NAME]
    
    # 1. Find a Client User
    client_user = await db["users"].find_one({"role": "client"})
    client_user_id = str(client_user["_id"]) if client_user else None
    
    if client_user_id:
        logger.info(f"Found Client User: {client_user_id}. Determining if jobs need assignment...")
    
    count = await db["jobs"].count_documents({})
    
    if count == 0:
        logger.info("No jobs found. Seeding database with sample jobs...")
        jobs_to_insert = SAMPLE_JOBS
        if client_user_id:
            for job in jobs_to_insert:
                job["created_by_user_id"] = client_user_id
                
        await db["jobs"].insert_many(jobs_to_insert)
        logger.info(f"Seeded {len(jobs_to_insert)} jobs.")
    else:
        # If jobs exist but we found a client user, update them just in case (as per user request)
        if client_user_id:
             # Check if any job is missing created_by_user_id or we just want to force it
             # User said: "if there is a client already in db, then associate all seeded jobs with him"
             logger.info(f"Associating all existing jobs with client user {client_user_id}...")
             await db["jobs"].update_many({}, {"$set": {"created_by_user_id": client_user_id}})
             
        logger.info(f"Database already contains {count} jobs. Seed skipped/Updated.")
