import re
import time
import logging
import asyncio
import json
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from fastembed import TextEmbedding

from motor.motor_asyncio import AsyncIOMotorClient
from web3 import Web3, HTTPProvider
from web3.contract.contract import Contract
from web3.types import ChecksumAddress
from web3.exceptions import ContractLogicError

from .models import JobPost, FreelancerProfile, Skill, MatchResult, RatingSubmission
from .constants import JOB_ROLES, JOB_STATUSES
from .db_service import get_all_freelancer_profiles, get_job_by_id, update_job_by_id
from .config import settings

logger = logging.getLogger(__name__)

# --- Web3 Setup ---
w3 = Web3(HTTPProvider(settings.SEPOLIA_RPC_URL))

# Mock ABIs (Can be replaced with artifacts reading in future)
ESCROW_ABI = json.loads('''
[{"inputs":[{"internalType":"address","name":"_arbiter","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"jobId","type":"uint256"},{"indexed":false,"internalType":"address","name":"client","type":"address"},{"indexed":false,"internalType":"address","name":"freelancer","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"contractId","type":"uint256"}],"name":"JobCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"jobId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"depositedAmount","type":"uint256"}],"name":"JobFunded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"jobId","type":"uint256"}],"name":"PaymentReleased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"jobId","type":"uint256"}],"name":"DisputeRaised","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"jobId","type":"uint256"},{"indexed":false,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"winnerShare","type":"uint256"}],"name":"DisputeResolved","type":"event"},{"inputs":[],"name":"ARBITER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address payable","name":"_client","type":"address"},{"internalType":"address payable","name":"_freelancer","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_contractId","type":"uint256"}],"name":"createJob","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"}],"name":"releasePayment","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"}],"name":"raiseDispute","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"},{"internalType":"uint256","name":"_clientShare","type":"uint256"}],"name":"resolveDispute","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"jobs","outputs":[{"internalType":"address payable","name":"client","type":"address"},{"internalType":"address payable","name":"freelancer","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum FreelanceEscrow.Status","name":"status","type":"uint8"},{"internalType":"uint256","name":"contractId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"jobDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextJobId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
''') 
RATING_ABI = json.loads('''
[{"inputs":[{"internalType":"address","name":"_platformApiAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"freelancer","type":"address"},{"indexed":false,"internalType":"uint256","name":"score","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"ipfsHash","type":"bytes32"}],"name":"RatingSubmitted","type":"event"},{"inputs":[{"internalType":"address","name":"_freelancer","type":"address"},{"internalType":"uint256","name":"_score","type":"uint256"},{"internalType":"bytes32","name":"_ipfsHash","type":"bytes32"}],"name":"submitRating","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_freelancer","type":"address"}],"name":"getAverageScore","outputs":[{"internalType":"uint256","name":"avgScore","type":"uint256"}],"stateMutability":"view","type":"function"}]
''')

# Contract Instances
ESCROW_CONTRACT: Contract = w3.eth.contract(address=settings.ESCROW_CONTRACT_ADDRESS, abi=ESCROW_ABI)
RATING_CONTRACT: Contract = w3.eth.contract(address=settings.RATING_CONTRACT_ADDRESS, abi=RATING_ABI)

# --- Qdrant & Embedding Setup ---
try:
    if settings.QDRANT_URL:
        qdrant_client = QdrantClient(
            url=settings.QDRANT_URL, 
            api_key=settings.QDRANT_API_KEY
        )
    else:
        # Fallback to local file-based Qdrant if no URL is provided
        logger.info("No QDRANT_URL provided. Using local disk-based Qdrant client.")
        qdrant_client = QdrantClient(path="local_qdrant_db")
        
    embedding_model = TextEmbedding() # Defaults to BAAI/bge-small-en-v1.5
    QDRANT_COLLECTION = "freelancer_profiles"
    
    # Ensure collection exists
    if not qdrant_client.collection_exists(QDRANT_COLLECTION):
        qdrant_client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        logger.info(f"Created Qdrant collection: {QDRANT_COLLECTION}")
except Exception as e:
    logger.error(f"Failed to initialize Qdrant: {e}")
    qdrant_client = None

def get_immutable_rating(freelancer_address: ChecksumAddress) -> float:
    """Retrieves immutable rating from the smart contract."""
    try:
        if not settings.RATING_CONTRACT_ADDRESS: return 0.0
        raw_score = RATING_CONTRACT.functions.getAverageScore(freelancer_address).call()
        return raw_score / 100.0 
    except Exception as e:
        logger.warning(f"Failed to get immutable rating for {freelancer_address}: {e}")
        return 0.0

def get_escrow_status(contract_job_id: int) -> Dict[str, Any]:
    """Retrieves the on-chain status and balance of a job."""
    try:
        if not settings.ESCROW_CONTRACT_ADDRESS: return {"escrow_status": "NO_CONTRACT", "escrow_balance_eth": 0.0}
        
        job_data = ESCROW_CONTRACT.functions.jobs(contract_job_id).call()
        status_enum = job_data[3]
        status_map = {0: "CREATED", 1: "ACTIVE", 2: "DISPUTE", 3: "COMPLETE", 4: "CANCELED"}
        escrow_status = status_map.get(status_enum, "UNKNOWN")
        
        balance_wei = ESCROW_CONTRACT.functions.jobDeposit(contract_job_id).call()
        balance_eth = w3.from_wei(balance_wei, 'ether')
        
        return {
            "escrow_status": escrow_status,
            "escrow_balance_eth": float(balance_eth)
        }
    except Exception as e:
        logger.error(f"Failed to get escrow status for contract ID {contract_job_id}: {e}")
        return {"escrow_status": "CONTRACT_ERROR", "escrow_balance_eth": 0.0}

def calculate_price_fit(job_budget_eth: float, freelancer_rate: float) -> float:
    """Calculates how well the freelancer's rate fits the job's fixed budget."""
    if freelancer_rate <= 0: return 0.0
    # Assess if freelancer rate (hourly) fits within budget (lump sum)
    # Simple heuristic: Budget should cover at least 5 hours
    est_hours = job_budget_eth / freelancer_rate
    if est_hours < 5: return 20.0 # Too expensive
    if est_hours > 100: return 100.0 # Very affordable
    
    # Linear scale between 5 and 100 hours
    return 20 + ((est_hours - 5) / 95) * 80

async def match_freelancers_to_job(client: AsyncIOMotorClient, job_data: JobPost) -> List[MatchResult]:
    """
    Orchestrates the AI matching process using Qdrant Vector Search.
    """
    start_time = time.time()
    
    if not qdrant_client:
        logger.error("Qdrant client not available. Returning empty matches.")
        return []

    # 1. Generate Embedding for Job Description
    job_text = f"{job_data.title}. {job_data.description}. Skills: {', '.join(job_data.required_skills)}"
    job_vector = list(embedding_model.embed([job_text]))[0]

    # 2. Search Qdrant
    search_result = qdrant_client.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=list(job_vector),
        limit=10,
        with_payload=True
    )

    match_results: List[MatchResult] = []
    
    for hit in search_result:
        payload = hit.payload
        freelancer_address = payload.get("freelancer_address")
        
        # Calculate Price Fit
        hourly_rate = payload.get("hourly_rate_eth", 0.05)
        price_score = calculate_price_fit(job_data.budget_eth, hourly_rate)
        
        # Get Immutable Rating
        rating = get_immutable_rating(Web3.to_checksum_address(freelancer_address))
        
        # Final Score: Vector Similarity (Skill) + Price + Reputation
        skill_score = hit.score * 100 # Cosine similarity 0-1 mapped to 0-100 roughly
        final_score = (skill_score * 0.6) + (price_score * 0.2) + (rating * 4.0) # Rating is 0-5, *4 = 20 max

        match_results.append(MatchResult(
            freelancer_address=freelancer_address,
            name=payload.get("name"),
            skill_match_score=round(skill_score, 2),
            price_fit_score=round(price_score, 2),
            final_score=round(final_score, 2),
            immutable_rating=rating
        ))

    matches_sorted = sorted(match_results, key=lambda x: x.final_score, reverse=True)
    
    logger.info(f"Matching complete. Found {len(matches_sorted)} matches in {int((time.time() - start_time) * 1000)}ms.")
    return matches_sorted

def score_proposal(job_description: str, resume_text: str) -> float:
    """
    Calculates a match score (0-100) between a resume and a job description 
    using vector cosine similarity.
    """
    if not resume_text: return 0.0
    
    # Generate embeddings
    try:
        job_vec = list(embedding_model.embed([job_description]))[0]
        resume_vec = list(embedding_model.embed([resume_text]))[0]
        
        # Calculate Cosine Similarity
        from numpy import dot
        from numpy.linalg import norm
        
        cos_sim = dot(job_vec, resume_vec) / (norm(job_vec) * norm(resume_vec))
        
        # Scale to 0-100
        score = max(0, min(100, cos_sim * 100))
        return round(float(score), 2)
    except Exception as e:
        logger.error(f"Error scoring proposal: {e}")
        return 0.0

async def create_escrow_contract_tx(
    job_id: str, 
    client_address: ChecksumAddress,
    freelancer_address: ChecksumAddress,
    budget_eth: float
) -> tuple[str, int]:
    """Creates a signed transaction for the platform to call createJob."""
    if not settings.PRIVATE_KEY:
        raise Exception("PLATFORM_PRIVATE_KEY not configured.")

    contract_job_id = ESCROW_CONTRACT.functions.nextJobId().call()
    budget_wei = w3.to_wei(budget_eth, 'ether')
    platform_address: ChecksumAddress = w3.to_checksum_address(settings.PLATFORM_ADDRESS)
    # Ensure addresses are in EIP-55 checksum format (web3.py requires this)
    freelancer_address = w3.to_checksum_address(freelancer_address)
    client_address = w3.to_checksum_address(client_address)
    
    try:
        tx = ESCROW_CONTRACT.functions.createJob(
            client_address,
            freelancer_address, 
            budget_wei, 
            contract_job_id  # on-chain sequential job counter (not MongoDB ID)
        ).build_transaction({
            'chainId': settings.CHAIN_ID, # hardhat local is 31337 or 1337
            'gas': 500000, 
            'nonce': w3.eth.get_transaction_count(platform_address),
            'from': platform_address,
            'value': 0 
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return tx_hash.hex(), contract_job_id
    except Exception as e:
        logger.error(f"Failed to submit escrow creation transaction: {e}", exc_info=True)
        # Expose the real error message to the frontend for debugging
        raise Exception(f"Failed to submit escrow creation transaction: {str(e)}")

async def resolve_escrow_dispute_tx(contract_job_id: int, client_share: int) -> str:
    """Creates a signed transaction for the platform to resolve a dispute."""
    if not settings.PRIVATE_KEY:
        raise Exception("PLATFORM_PRIVATE_KEY not configured.")

    platform_address: ChecksumAddress = w3.to_checksum_address(settings.PLATFORM_ADDRESS)
    
    try:
        tx = ESCROW_CONTRACT.functions.resolveDispute(
            contract_job_id,
            client_share
        ).build_transaction({
            'chainId': settings.CHAIN_ID,
            'gas': 500000, 
            'nonce': w3.eth.get_transaction_count(platform_address),
            'from': platform_address,
            'value': 0 
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        logger.info(f"Broadcasted dispute resolution TX: {tx_hash.hex()}")
        w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return tx_hash.hex()
    except Exception as e:
        logger.error(f"Failed to submit dispute resolution transaction: {e}", exc_info=True)
        raise Exception(f"Failed to execute resolveDispute on blockchain: {str(e)}")

# --- Pinata IPFS Logic ---

async def pin_json_to_pinata(data: Dict[str, Any]) -> str:
    """Pins JSON data to IPFS via Pinata API and returns the IPFS Hash (CID)."""
    url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
    headers = {
        "pinata_api_key": settings.PINATA_API_KEY,
        "pinata_secret_api_key": settings.PINATA_SECRET_API_KEY
    }
    
    # Body
    body = {
        "pinataContent": data,
        "pinataMetadata": {
            "name": f"Review_{data.get('job_id', 'unknown')}_{int(time.time())}"
        }
    }

    try:
        # Use run_in_executor to make sync requests async compatible
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: requests.post(url, json=body, headers=headers))
        
        if response.status_code == 200:
            return response.json()['IpfsHash']
        else:
            logger.error(f"Pinata Error: {response.text}")
            raise Exception(f"Pinata IPFS Pinning Failed: {response.text}")
    except Exception as e:
        logger.error(f"Pinata Connection Error: {e}", exc_info=True)
        raise

async def submit_immutable_rating_to_contract(rating_data: RatingSubmission, client: AsyncIOMotorClient):
    """
    1. Pins review text to IPFS using Pinata.
    2. Sends transaction to FreelancerRating.sol.
    """
    # 1. Pin to IPFS
    review_data = {
        "job_id": rating_data.job_id,
        "score": rating_data.score,
        "text": rating_data.review_text,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    ipfs_hash_str = await pin_json_to_pinata(review_data)
    
    # Convert IPFS Hash (Base58) to bytes32? 
    # Solidity contracts often store CIDs as string or bytes. 
    # The current contract expects `bytes32`. 
    # NOTE: Standard IPFS CIDs (Qm...) are > 32 bytes and cannot fit in bytes32 directly properly without decoding.
    # HOWEVER, for this "Hack" implementation, if the contract expects bytes32, we assume we might need to 
    # either change the contract to string OR slice/hash it. 
    # Let's assume for now we just hash the CID provided by Pinata to store a "reference" hash on-chain
    # OR we change the contract interface. The previous code was hashing the JSON content itself.
    # To keep "Real IPFS" promise but fit "Existing Contract":
    # We will store the sha256 of the CID on-chain (to verify integrity) but off-chain apps need the CID.
    # ACTUALLY, checking FreelancerRating.sol: it takes `bytes32 _ipfsHash`.
    # A standard way is to store the decoded multihash if it fits, or just use string.
    # Given the constraint to not change contract unless necessary, I will store the *hash of the CID* 
    # or just the first 32 bytes (which breaks it).
    # BETTER FIX: Let's assume we store the `keccak256` of the IPFS CID on chain for verification,
    # and store the CID in our MongoDB for retrieval.
    
    # For now, let's behave like the previous mock: Hash the CONTENT to get bytes32 for the contract, 
    # but ALSO pin to Pinata for real storage.
    
    content_hash_bytes32 = Web3.keccak(text=json.dumps(review_data)) # On-chain integrity check
    
    # 2. Send Transaction
    try:
        platform_address: ChecksumAddress = w3.to_checksum_address(settings.PLATFORM_ADDRESS)
        
        tx = RATING_CONTRACT.functions.submitRating(
            rating_data.freelancer_address, 
            rating_data.score, 
            content_hash_bytes32
        ).build_transaction({
            'chainId': settings.CHAIN_ID,
            'gas': 2000000, 
            'nonce': w3.eth.get_transaction_count(platform_address),
            'from': platform_address
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        w3.eth.wait_for_transaction_receipt(tx_hash)
        
        logger.info(f"Rating TX successful: {tx_hash.hex()}. Real IPFS CID: {ipfs_hash_str}")
        
        # In a real app, we'd save the CID to MongoDB here too
        await update_job_by_id(client, rating_data.job_id, {
            "status": JOB_STATUSES["COMPLETED"],
            "rating_ipfs_cid": ipfs_hash_str 
        })
        
    except Exception as e:
        logger.error(f"Failed to submit rating transaction: {e}", exc_info=True)
        raise Exception("Failed to submit rating transaction to blockchain.")