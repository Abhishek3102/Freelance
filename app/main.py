import logging
import spacy # Fix: Missing import
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from web3.exceptions import InvalidAddress
from bson.errors import InvalidId
from web3.types import ChecksumAddress

from app.models import (
    JobPost, FreelancerProfile, MatchResult, JobStatusResponse, 
    RatingSubmission, ProposalIn, Proposal
)
from app.services import (
    match_freelancers_to_job, get_escrow_status, submit_immutable_rating_to_contract,
    create_escrow_contract_tx
)
from app.db_service import (
    connect_to_mongo, close_mongo_connection, log_job_post, get_job_by_id, 
    update_job_by_id, log_proposal
)
from app.logging_config import setup_logging
from app.constants import JOB_STATUSES, PROPOSAL_STATUSES
from web3 import Web3

# Setup structured logging
setup_logging()
logger = logging.getLogger(__name__)

# Mock Spacy Load 
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None

app = FastAPI(
    title="Decentralized Freelance Marketplace API",
    description="Backend for Web3 commission-free job matching and escrow management.",
    version="2.0.0"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency Function to get DB client ---
def get_db_client(request: Request):
    db_client = request.app.state.db_client
    if db_client is None:
        logger.error("Database connection not available.")
        raise HTTPException(status_code=500, detail="Database connection is not available.")
    return db_client

# --- Database Connection Events ---
@app.on_event("startup")
async def startup_event():
    """Connects to MongoDB and sets up Web3 client."""
    logger.info("Starting up FastAPI application...")
    app.state.db_client = await connect_to_mongo()
    # Assuming app.state.w3 is set up in app.services and accessible via settings
    # This check is good, but `app.state.w3` should be injected if needed outside services.py
    # For now, we rely on the internal check inside services.py/w3 initialization
    logger.info("Web3 connection relies on configuration in app/services.py.")
    
@app.on_event("shutdown")
async def shutdown_event():
    """Closes MongoDB connection."""
    logger.info("Shutting down FastAPI application...")
    await close_mongo_connection(app.state.db_client)

# --- API Endpoints ---
@app.get("/")
async def root():
    """Root endpoint to check API health."""
    return {"message": "Decentralized Freelance Marketplace API is running."}

from app.auth import get_current_user

@app.get("/freelancers/", response_model=List[dict])
async def get_freelancers(current_user: dict = Depends(get_current_user)):
    freelancers = await db.users.find({"role": "freelancer"}).to_list(100)
    for user in freelancers:
        user["id"] = str(user["_id"])
        del user["_id"]
    return freelancers

# ... (Previous imports)

# Endpoint 1: Client posts a new job
@app.post("/jobs/post/")
async def post_job(
    job_post: JobPost, 
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user) # Protected
):
    """Logs a new job post and sets status to OPEN."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    try:
        # Validate that the token user matches the client_address? 
        # For now, we just ensure they are logged in.
        # Ideally, we'd link the wallet address to the user profile.
        
        Web3.to_checksum_address(job_post.client_address)
        
        job_data = job_post.dict()
        job_data["created_by_user_id"] = current_user.get("sub") # Link to NextAuth User ID
        job_data["status"] = JOB_STATUSES["OPEN"]
        job_data["escrow_contract_id"] = None 
        job_data["freelancer_address"] = None 
        
        job_id = await log_job_post(db_client, job_data)
        
        return {"job_id": job_id, "message": "Job posted successfully. Matching is now active."}
    except InvalidAddress:
        raise HTTPException(status_code=400, detail="Invalid client address format.")
    except Exception as e:
        logger.error(f"Error posting job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to post job: {str(e)}")

# ... (Scanning down to Rating Endpoint)

# Endpoint 6: Submit Immutable Rating (Platform Action)
@app.post("/rating/submit/")
async def submit_rating(
    rating: RatingSubmission, 
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user) # Protected
):
    """
    Submits a final rating. Protected endpoint.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        # 1. Basic validation
        job_doc = await get_job_by_id(db_client, rating.job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        # 2. Call the service layer to handle IPFS and Blockchain TX
        await submit_immutable_rating_to_contract(rating, db_client)
        
        return {"message": "Immutable rating successfully recorded on the blockchain."}

    except Exception as e:
        logger.error(f"Error submitting rating: {e}", exc_info=True)
        detail = str(e) if "Blockchain contract rejected" in str(e) else "Internal server error during blockchain transaction."
        raise HTTPException(status_code=500, detail=detail)

# Endpoint 2: AI matches freelancers to the job
@app.post("/jobs/{job_id}/match/", response_model=List[MatchResult])
async def get_job_matches(job_id: str, db_client: Depends = Depends(get_db_client)):
    """Retrieves top AI-matched freelancers for a specific job."""
    try:
        job_doc = await get_job_by_id(db_client, job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found.")
            
        # Parse job document (needs special handling for MongoDB ObjectId if present, handled implicitly by pydantic and db_service now)
        job_data = JobPost.parse_obj(job_doc)
        
        matches = await match_freelancers_to_job(db_client, job_data)
        
        return matches
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Job ID format.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error matching freelancers for job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to run matching engine: {str(e)}")

# Endpoint 3 (NEW): Freelancer submits a proposal
@app.post("/jobs/{job_id}/propose/")
async def submit_proposal(
    job_id: str, 
    proposal_in: ProposalIn, 
    db_client: Depends = Depends(get_db_client)
):
    """Freelancer submits a proposal to a specific job."""
    try:
        job_doc = await get_job_by_id(db_client, job_id)
        if not job_doc or job_doc["status"] != JOB_STATUSES["OPEN"]:
            raise HTTPException(status_code=404, detail="Job not found or not open for proposals.")
        
        Web3.to_checksum_address(proposal_in.freelancer_address)

        proposal_data = proposal_in.dict()
        proposal_data["job_id"] = job_id
        proposal_data["status"] = PROPOSAL_STATUSES[0] # PENDING

        proposal_id = await log_proposal(db_client, proposal_data)

        return {"proposal_id": proposal_id, "message": "Proposal submitted successfully."}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Job ID format.")
    except Exception as e:
        logger.error(f"Error submitting proposal for job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit proposal: {str(e)}")

# Endpoint 4 (NEW): Client accepts a proposal and initiates Escrow Creation TX
@app.post("/jobs/{job_id}/accept/")
async def accept_proposal(
    job_id: str, 
    freelancer_address: ChecksumAddress, # Address of the freelancer to hire
    client_address_from_request: ChecksumAddress, # Client's wallet address from the request body/token
    db_client: Depends = Depends(get_db_client)
):
    """
    Client accepts a proposal, updates job status, and returns the signed 
    transaction data to create the on-chain Escrow contract.
    """
    try:
        job_doc = await get_job_by_id(db_client, job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        # 1. Basic Authorization Check (Client must be the job poster)
        if job_doc["client_address"].lower() != client_address_from_request.lower():
             raise HTTPException(status_code=403, detail="Not authorized to accept proposals for this job.")

        # 2. Update Job Status in MongoDB
        # This is a critical step: transition to waiting for blockchain funding
        await update_job_by_id(db_client, job_id, {
            "status": JOB_STATUSES["PROPOSAL_ACCEPTED"],
            "freelancer_address": freelancer_address # Lock the freelancer address
        })

        # 3. Create the Escrow Job on-chain via the Platform's wallet
        # The service layer handles signing and sending the transaction to create the escrow job
        tx_hash, contract_job_id = await create_escrow_contract_tx(
            job_id=job_id, 
            client_address=Web3.to_checksum_address(job_doc["client_address"]),
            freelancer_address=freelancer_address,
            budget_eth=job_doc["budget_eth"]
        )
        
        # 4. Update Job with the on-chain ID
        await update_job_by_id(db_client, job_id, {
            "escrow_contract_id": contract_job_id
        })

        return {
            "message": "Proposal accepted and Escrow Job created on-chain.",
            "escrow_tx_hash": tx_hash,
            "escrow_contract_job_id": contract_job_id,
            "next_step": "Client must now fund the escrow using the deposit() function on the Escrow contract."
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Job ID format.")
    except Exception as e:
        logger.error(f"Error accepting proposal for job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to accept proposal and create escrow: {str(e)}")

# Endpoint 5: Get detailed job and escrow status (Renumbered for flow)
@app.get("/jobs/{job_id}/status/", response_model=JobStatusResponse)
async def get_job_status(job_id: str, db_client: Depends = Depends(get_db_client)):
    """Retrieves current Web2 status (proposals) and Web3 escrow status."""
    try:
        job_doc = await get_job_by_id(db_client, job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found.")

        contract_id = job_doc.get("escrow_contract_id")
        
        if contract_id:
            # Fetch real-time status from the smart contract
            escrow_data = get_escrow_status(contract_id)
        else:
            # Default status if escrow is not yet created/funded
            escrow_data = {"escrow_status": "NONE", "escrow_balance_eth": 0.0}

        return JobStatusResponse(
            job_id=job_id,
            title=job_doc["title"],
            client_address=Web3.to_checksum_address(job_doc["client_address"]),
            freelancer_address=job_doc.get("freelancer_address"),
            budget_eth=job_doc["budget_eth"],
            proposal_status=job_doc["status"],
            escrow_contract_id=contract_id,
            **escrow_data
        )
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Job ID format.")
    except Exception as e:
        logger.error(f"Error fetching job status for {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch job status: {str(e)}")


# Endpoint 6: Submit Immutable Rating (Platform Action)
@app.post("/rating/submit/")
async def submit_rating(rating: RatingSubmission, db_client: Depends = Depends(get_db_client)):
    """
    Submits a final rating to the immutable smart contract after job completion.
    This action is performed by the platform on behalf of the client/after validation.
    """
    try:
        # 1. Basic validation
        job_doc = await get_job_by_id(db_client, rating.job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        # 2. Call the service layer to handle IPFS and Blockchain TX
        await submit_immutable_rating_to_contract(rating, db_client)
        
        return {"message": "Immutable rating successfully recorded on the blockchain."}

    except Exception as e:
        logger.error(f"Error submitting rating: {e}", exc_info=True)
        detail = str(e) if "Blockchain contract rejected" in str(e) else "Internal server error during blockchain transaction."
        raise HTTPException(status_code=500, detail=detail)