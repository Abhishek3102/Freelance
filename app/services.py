import re
import spacy
import time
import logging
import asyncio
import json
import hashlib # Added for IPFS mock
from io import BytesIO
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from motor.motor_asyncio import AsyncIOMotorClient
from web3 import Web3, HTTPProvider
from web3.contract.contract import Contract
from web3.types import ChecksumAddress
from web3.exceptions import ContractLogicError
from datetime import datetime # Added for timestamp

from .models import JobPost, FreelancerProfile, Skill, MatchResult, RatingSubmission
from .constants import JOB_ROLES, JOB_STATUSES
from .db_service import get_all_freelancer_profiles, get_job_by_id, update_job_by_id
from .config import settings

logger = logging.getLogger(__name__)

# --- Web3 Setup (using synchronous HTTPProvider for FastAPI's main logic) ---

w3 = Web3(HTTPProvider(settings.SEPOLIA_RPC_URL))

# Mock ABIs (Replace with actual ABIs after contract compilation)
ESCROW_ABI = json.loads('''
[
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_arbiter",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "jobId",
          "type": "uint256"
        }
      ],
      "name": "DisputeRaised",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "jobId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "winnerShare",
          "type": "uint256"
        }
      ],
      "name": "DisputeResolved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "jobId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "client",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "freelancer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "contractId",
          "type": "uint256"
        }
      ],
      "name": "JobCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "jobId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "depositedAmount",
          "type": "uint256"
        }
      ],
      "name": "JobFunded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "jobId",
          "type": "uint256"
        }
      ],
      "name": "PaymentReleased",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "ARBITER",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
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
      "name": "deposit",
      "outputs": [],
      "stateMutability": "payable",
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
      "name": "jobDeposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
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
      "inputs": [],
      "name": "nextJobId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
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
        },
        {
          "internalType": "uint256",
          "name": "_clientShare",
          "type": "uint256"
        }
      ],
      "name": "resolveDispute",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]
''') 
RATING_ABI = json.loads('''
[
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_platformApiAddress",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "freelancer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "score",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "ipfsHash",
          "type": "bytes32"
        }
      ],
      "name": "RatingSubmitted",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "PLATFORM_API_ADDRESS",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_freelancer",
          "type": "address"
        }
      ],
      "name": "getAverageScore",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "avgScore",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "ratings",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalScore",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "numRatings",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_freelancer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_score",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_ipfsHash",
          "type": "bytes32"
        }
      ],
      "name": "submitRating",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
''')

# Contract Instances
ESCROW_CONTRACT: Contract = w3.eth.contract(address=settings.ESCROW_CONTRACT_ADDRESS, abi=ESCROW_ABI)
RATING_CONTRACT: Contract = w3.eth.contract(address=settings.RATING_CONTRACT_ADDRESS, abi=RATING_ABI)

def get_immutable_rating(freelancer_address: ChecksumAddress) -> float:
    """Retrieves immutable rating from the smart contract."""
    try:
        raw_score = RATING_CONTRACT.functions.getAverageScore(freelancer_address).call()
        return raw_score / 100.0 
    except Exception as e:
        logger.warning(f"Failed to get immutable rating for {freelancer_address}: {e}")
        return 2.5 

def get_escrow_status(contract_job_id: int) -> Dict[str, Any]:
    """Retrieves the on-chain status and balance of a job."""
    try:
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
        return {
            "escrow_status": "CONTRACT_ERROR",
            "escrow_balance_eth": 0.0
        }

# --- Core AI/Matching Logic (omitted for brevity, assume content from previous response is here) ---

def calculate_skill_match(job_requirements: List[str], freelancer_skills: List[Skill], portfolio_summary: str) -> float:
    """Calculates semantic similarity between job requirements and freelancer profile."""
    # (Implementation is same as previous response)
    job_req_set = {req.lower().strip() for req in job_requirements}
    freelancer_skill_set = {s.name.lower() for s in freelancer_skills}
    overlap = job_req_set.intersection(freelancer_skill_set)
    overlap_score = (len(overlap) / len(job_req_set)) if len(job_req_set) > 0 else 0
    summary_match_count = sum(1 for req in job_req_set if req in portfolio_summary.lower())
    summary_score = (summary_match_count / len(job_req_set)) if len(job_req_set) > 0 else 0
    final_match = (overlap_score * 0.7 + summary_score * 0.3) * 100
    return round(final_match, 2)

def calculate_price_fit(job_budget_eth: float, freelancer_rate: float) -> float:
    """Calculates how well the freelancer's rate fits the job's fixed budget."""
    # (Implementation is same as previous response)
    if freelancer_rate <= 0: return 0.0
    total_freelancer_cost = freelancer_rate * 100 
    diff_ratio = abs(job_budget_eth - total_freelancer_cost) / job_budget_eth
    score = max(0, 100 - (diff_ratio * 50)) 
    return round(score, 2)

async def match_freelancers_to_job(client: AsyncIOMotorClient, job_data: JobPost) -> List[MatchResult]:
    """Orchestrates the AI matching process for a job post."""
    # (Implementation is same as previous response)
    start_time = time.time()
    profiles_raw = await get_all_freelancer_profiles(client)
    if not profiles_raw:
        logger.warning("No freelancer profiles found in database.")
        return []
        
    match_results: List[MatchResult] = []
    
    for profile_raw in profiles_raw:
        try:
            profile = FreelancerProfile.parse_obj(profile_raw)
            immutable_rating = get_immutable_rating(profile.freelancer_address)
            
            skill_score = calculate_skill_match(
                job_data.required_skills, 
                profile.skills, 
                profile.portfolio_summary
            )
            price_score = calculate_price_fit(
                job_data.budget_eth, 
                profile.hourly_rate_eth
            )
            final_score = (skill_score * 0.50) + (price_score * 0.30) + (immutable_rating * 4.0)
            
            match_results.append(MatchResult(
                freelancer_address=profile.freelancer_address,
                name=profile.name,
                skill_match_score=skill_score,
                price_fit_score=price_score,
                final_score=round(final_score, 2),
                immutable_rating=immutable_rating
            ))
        except Exception as e:
            logger.error(f"Error processing profile {profile_raw.get('freelancer_address')}: {e}", exc_info=True)
            continue

    match_results.sort(key=lambda x: x.final_score, reverse=True)
    duration_ms = int((time.time() - start_time) * 1000)
    logger.info(f"Matching complete. Found {len(match_results)} matches in {duration_ms}ms.")
    return match_results

# --- Web3 Transaction Management (Updated) ---

async def create_escrow_contract_tx(
    job_id: str, 
    client_address: ChecksumAddress,
    freelancer_address: ChecksumAddress,
    budget_eth: float
) -> tuple[str, int]:
    """
    Creates a signed transaction for the platform to call the Escrow contract's
    createJob function, initiating the on-chain record.
    
    @returns (tx_hash_hex, contract_job_id)
    """
    if not settings.PRIVATE_KEY:
        raise Exception("PLATFORM_PRIVATE_KEY not configured for creating escrow job.")

    # Get the *next* job ID from the contract state
    try:
        contract_job_id = ESCROW_CONTRACT.functions.nextJobId().call()
    except Exception as e:
        logger.error(f"Failed to fetch nextJobId from contract: {e}", exc_info=True)
        raise Exception("Failed to connect to Escrow contract.")
        
    # Convert ETH budget to WEI
    budget_wei = w3.to_wei(budget_eth, 'ether')
    
    # Platform is the sender of the transaction
    platform_address: ChecksumAddress = w3.to_checksum_address(settings.PLATFORM_ADDRESS)
    
    try:
        # Build the transaction to call createJob(freelancer, amount, contractId)
        tx = ESCROW_CONTRACT.functions.createJob(
            freelancer_address, 
            budget_wei, 
            int(job_id) # Use the MongoDB ID as the contractId metadata
        ).build_transaction({
            'chainId': settings.CHAIN_ID,
            'gas': 500000, 
            'nonce': w3.eth.get_transaction_count(platform_address),
            'from': platform_address,
            'value': 0 # No value sent yet, deposit comes from the client later
        })

        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Synchronous wait for confirmation
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        
        if tx_receipt.status == 1:
            logger.info(f"Escrow Job TX successful: {tx_hash.hex()}. Contract Job ID: {contract_job_id}")
            return tx_hash.hex(), contract_job_id
        else:
            logger.error(f"Escrow Job TX failed: {tx_hash.hex()}. Receipt Status: {tx_receipt.status}")
            raise Exception("Transaction failed on-chain.")
            
    except ContractLogicError as cle:
        logger.error(f"Contract Logic Error during escrow creation: {cle}", exc_info=True)
        raise Exception(f"Blockchain contract rejected escrow creation: {cle}")
    except Exception as e:
        logger.error(f"Failed to submit escrow creation transaction: {e}", exc_info=True)
        raise Exception("Failed to submit escrow creation transaction to blockchain.")

# Mock function for IPFS pinning
async def ipfs_pin_json(data: Dict[str, Any]) -> str:
    """Mocks the function to pin JSON data (e.g., a review) to IPFS."""
    logger.info("MOCK: Pinning review data to IPFS...")
    await asyncio.sleep(0.1) 
    json_string = json.dumps(data)
    hash_object = hashlib.sha256(json_string.encode())
    return '0x' + hash_object.hexdigest()[:64]

async def submit_immutable_rating_to_contract(rating_data: RatingSubmission, client: AsyncIOMotorClient):
    """
    1. Pins review text to IPFS.
    2. Sends transaction to FreelancerRating.sol to record the score and hash.
    """
    # 1. Prepare and Pin to IPFS (MOCK)
    review_data = {
        "job_id": rating_data.job_id,
        "score": rating_data.score,
        "text": rating_data.review_text,
        "timestamp": datetime.utcnow().isoformat()
    }
    ipfs_hash_hex = await ipfs_pin_json(review_data)
    ipfs_hash_bytes32 = w3.to_bytes(hexstr=ipfs_hash_hex)

    # 2. Send Transaction to Blockchain
    try:
        platform_address: ChecksumAddress = w3.to_checksum_address(settings.PLATFORM_ADDRESS)
        
        tx = RATING_CONTRACT.functions.submitRating(
            rating_data.freelancer_address, 
            rating_data.score, 
            ipfs_hash_bytes32
        ).build_transaction({
            'chainId': settings.CHAIN_ID,
            'gas': 2000000, 
            'nonce': w3.eth.get_transaction_count(platform_address),
            'from': platform_address
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if tx_receipt.status == 1:
            logger.info(f"Rating TX successful: {tx_hash.hex()}. IPFS Hash: {ipfs_hash_hex}")
            await update_job_by_id(client, rating_data.job_id, {"status": JOB_STATUSES["COMPLETED"]})
        else:
            logger.error(f"Rating TX failed: {tx_hash.hex()}. Receipt Status: {tx_receipt.status}")
            raise Exception("Transaction failed on-chain.")
            
    except ContractLogicError as cle:
        logger.error(f"Contract Logic Error during rating submission: {cle}", exc_info=True)
        raise Exception(f"Blockchain contract rejected transaction: {cle}")
    except Exception as e:
        logger.error(f"Failed to submit rating transaction: {e}", exc_info=True)
        raise Exception("Failed to submit rating transaction to blockchain.")