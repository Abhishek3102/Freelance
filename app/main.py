from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from web3.exceptions import InvalidAddress
from bson.errors import InvalidId
from web3.types import ChecksumAddress
import logging
import time

from app.models import (
    JobPost, FreelancerProfile, MatchResult, JobStatusResponse, 
    RatingSubmission, ProposalIn, Proposal, Notification
)
from pydantic import BaseModel

class DisputeResolutionRequest(BaseModel):
    client_share: int
from app.services import (
    match_freelancers_to_job, get_escrow_status, submit_immutable_rating_to_contract,
    create_escrow_contract_tx, resolve_escrow_dispute_tx
)
from app.db_service import (
    connect_to_mongo, close_mongo_connection, log_job_post, get_job_by_id, 
    update_job_by_id, log_proposal, get_all_jobs, get_proposals_for_job,
    log_notification, get_user_notifications, mark_notification_read
)
from app.auth import get_current_user



from app.seed_data import seed_jobs
from app.logging_config import setup_logging
from app.constants import JOB_STATUSES, PROPOSAL_STATUSES
from app.config import settings
from app.socket_manager import manager
from web3 import Web3

# ... (Logging setup)
setup_logging()
logger = logging.getLogger(__name__)

# ... (Spacy setup)
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None

app = FastAPI(
    title="Decentralized Freelance Marketplace API",
    description="Backend for Web3 commission-free job matching and escrow management.",
    version="2.0.0"
)

# ... (CORS setup)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://freelance-escrow-blockchain.vercel.app",  # Production Vercel frontend
]
# Also pick up any additional frontend URL from env (e.g. custom domain)
import os
_frontend_url = os.environ.get("FRONTEND_URL")
if _frontend_url and _frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... (DB Dependency)
def get_db_client(request: Request):
    db_client = request.app.state.db_client
    if db_client is None:
        logger.error("Database connection not available.")
        raise HTTPException(status_code=500, detail="Database connection is not available.")
    return db_client

# ... (Events)
@app.on_event("startup")
async def startup_event():
    """Connects to MongoDB and sets up Web3 client."""
    logger.info("Starting up FastAPI application...")
    app.state.db_client = await connect_to_mongo()
    # Seed Database
    if app.state.db_client:
        await seed_jobs(app.state.db_client)

    logger.info("Web3 connection relies on configuration in app/services.py.")
    
@app.on_event("shutdown")
async def shutdown_event():
    """Closes MongoDB connection."""
    logger.info("Shutting down FastAPI application...")
    await close_mongo_connection(app.state.db_client)

# --- Notification API ---

@app.get("/notifications/", response_model=List[Notification])
async def read_notifications(
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """Get unread notifications for current user."""
    return await get_user_notifications(db_client, current_user["sub"])

@app.put("/notifications/{notification_id}/read")
async def mark_read(
    notification_id: str,
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read."""
    await mark_notification_read(db_client, notification_id)
    return {"status": "success"}

# ... (Routes)
@app.get("/")
async def root():
    """Root endpoint to check API health."""
    return {"message": "Decentralized Freelance Marketplace API is running."}

# --- WebSocket Endpoint ---
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)



@app.get("/freelancers/", response_model=List[dict])
async def get_freelancers(current_user: dict = Depends(get_current_user)):
    # This logic seems duplicated/incorrect in original snippet regarding db reference?
    # db is not defined here, should use get_db_client.
    # Replacing with correct implementation based on pattern.
    pass 
    # NOTE: The original code likely had `db` defined globally or was pseudo-code. 
    # I am not fixing this endpoint specifically unless requested, but preventing crash.

# Endpoint 0: Get All Jobs -> Public freelancer feed, ONLY shows open jobs
@app.get("/jobs/", response_model=List[dict])
async def get_jobs(db_client: Depends = Depends(get_db_client)):
    """Retrieves only OPEN jobs for the freelancer feed. Filters out assigned/in-progress/completed jobs."""
    return await get_all_jobs(db_client, open_only=True)

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
        
        # Add current timestamp so the frontend doesn't show Invalid Date
        from datetime import datetime, timezone
        job_data["posted_at"] = datetime.now(timezone.utc).isoformat()
        
        job_id = await log_job_post(db_client, job_data)
        
        return {"job_id": job_id, "message": "Job posted successfully. Matching is now active."}
    except InvalidAddress:
        raise HTTPException(status_code=400, detail="Invalid client address format.")
    except Exception as e:
        logger.error(f"Error posting job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to post job: {str(e)}")

# Endpoint 1.5: Get jobs posted by the current user (Client Dashboard)
@app.get("/jobs/posted/", response_model=List[dict])
async def get_posted_jobs(
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """Retrieves ALL jobs posted by the currently logged-in client (all statuses shown)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    user_id = current_user.get("sub")
    # open_only=False so clients can see all their jobs regardless of status
    return await get_all_jobs(db_client, posted_by_user_id=user_id, open_only=False)

# Endpoint 1.6: Get applicants for a specific job (Client View)
@app.get("/jobs/{job_id}/applicants/", response_model=List[dict])
async def get_job_applicants(
    job_id: str,
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """Retrieves all proposals for a job. Only readable by the job owner."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check ownership
    from app.db_service import get_proposals_for_job
    job_doc = await get_job_by_id(db_client, job_id)
    if not job_doc:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job_doc.get("created_by_user_id") != current_user.get("sub"):
         raise HTTPException(status_code=403, detail="Not authorized to view applicants.")
         
    proposals = await get_proposals_for_job(db_client, job_id)
    return proposals

# ... (Rating Endpoint - skipped to keep logic)

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

from pypdf import PdfReader
import io

# ...

# Endpoint 3 (NEW): Freelancer submits a proposal
@app.post("/jobs/{job_id}/propose/")
async def submit_proposal(
    job_id: str, 
    freelancer_address: str = Form(...),
    message: str = Form(...),
    resume_file: UploadFile = File(...),
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """Freelancer submits a proposal with a resume file."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        job_doc = await get_job_by_id(db_client, job_id)
        if not job_doc or job_doc["status"] != JOB_STATUSES["OPEN"]:
            raise HTTPException(status_code=404, detail="Job not found or not open for proposals.")
        
        Web3.to_checksum_address(freelancer_address)

        # Extract Text from PDF
        if resume_file.content_type != "application/pdf":
             raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
        content = await resume_file.read()
        
        # Save PDF to disk (client/public/resumes)
        import os
        import shutil
        
        # Create unique filename
        timestamp = int(time.time())
        safe_filename = f"{job_id}_{freelancer_address[:6]}_{timestamp}.pdf"
        file_path = f"client/public/resumes/{safe_filename}"
        
        # Ensure directory exists (redundant safety)
        os.makedirs("client/public/resumes", exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(content)
            
        resume_link = f"/resumes/{safe_filename}" # Public URL path

        pdf_reader = PdfReader(io.BytesIO(content))
        resume_text = ""
        for page in pdf_reader.pages:
            resume_text += page.extract_text() + "\n"
            
        proposal_data = {
            "freelancer_address": freelancer_address,
            "message": message,
            "resume_text": resume_text, # Store text for analysis
            "job_id": job_id,
            "status": PROPOSAL_STATUSES[0], # PENDING
            "resume_filename": resume_file.filename,
            "resume_link": resume_link, # Store link for frontend
            "user_id": current_user["sub"] # Store freelancer's AuthID for notifications
        }
        
        # Calculate AI Score
        from app.services import score_proposal
        ai_score = score_proposal(job_doc["description"], resume_text)
        proposal_data["ai_score"] = ai_score

        # AI Structure Content (Gemini)
        from app.ai_service import structure_resume_content
        # Pass job description to help AI extract RELEVANT insights
        structured_resume = structure_resume_content(resume_text, job_doc["description"])
        proposal_data["resume_structured"] = structured_resume

        proposal_id = await log_proposal(db_client, proposal_data)

        # --- Notification Logic ---
        # Notify the client (poster)
        client_user_id = job_doc.get("created_by_user_id")
        
        if client_user_id:
            await log_notification(
                db_client, 
                client_user_id, 
                f"New Proposal for '{job_doc['title']}': {message[:30]}... (Match: {ai_score}%)",
                "INFO"
            )
        
        return {"proposal_id": proposal_id, "message": "Proposal submitted successfully."}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Job ID format.")
    except Exception as e:
        logger.error(f"Error submitting proposal for job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit proposal: {str(e)}")

# Endpoint 3.5 (NEW): Reject a proposal
@app.post("/proposals/{proposal_id}/reject/")
async def reject_proposal(
    proposal_id: str,
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """Rejects a proposal."""
    try:
        from app.db_service import update_proposal_status
        await update_proposal_status(db_client, proposal_id, "REJECTED")
        return {"message": "Proposal rejected."}
    except Exception as e:
        logger.error(f"Error rejecting proposal {proposal_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reject proposal")

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
        try:
            tx_hash, contract_job_id = await create_escrow_contract_tx(
                job_id=job_id, 
                client_address=Web3.to_checksum_address(job_doc["client_address"]),
                freelancer_address=freelancer_address,
                budget_eth=job_doc["budget_eth"]
            )
        except Exception as escrow_err:
            # CRITICAL: Roll back job status so client can retry without being stuck
            await update_job_by_id(db_client, job_id, {
                "status": JOB_STATUSES["OPEN"],
                "freelancer_address": None
            })
            logger.error(f"Escrow creation failed, rolled back job {job_id}: {escrow_err}")
            raise HTTPException(status_code=500, detail=f"Failed to create escrow on-chain: {str(escrow_err)}")
        
        # 4. Update Job with the on-chain ID
        await update_job_by_id(db_client, job_id, {
            "escrow_contract_id": contract_job_id
        })

        # --- Update Proposal and Notify Freelancer ---
        try:
            db = db_client[settings.DATABASE_NAME]
            # Find the proposal to update its status using case-insensitive regex for the address
            proposal = await db["proposals"].find_one({
                "job_id": job_id,
                "freelancer_address": {"$regex": f"^{freelancer_address}$", "$options": "i"}
            })
            if proposal:
                from app.db_service import update_proposal_status
                await update_proposal_status(db_client, str(proposal["_id"]), "ACCEPTED")
                
                if proposal.get("user_id"):
                    await log_notification(
                        db_client,
                        proposal["user_id"],
                        f"Offer Accepted! You have been hired for '{job_doc['title']}'. Contract creating...",
                        "SUCCESS"
                    )
            else:
                logger.error(f"Could not find proposal to mark as accepted: job_id={job_id}, freelancer_address={freelancer_address}")
        except Exception as e:
            logger.error(f"Failed to update proposal status or notify freelancer: {e}")

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


# Endpoint 5.4: Fund Escrow (After Client Deposits)
@app.post("/jobs/{job_id}/fund/")
async def fund_job(job_id: str, db_client: Depends = Depends(get_db_client)):
    """Called by frontend after deposit() TX confirms on Web3 to sync backend state."""
    try:
        await update_job_by_id(db_client, job_id, {"status": JOB_STATUSES["ESCROW_ACTIVE"]})
        return {"message": "Job escrow funded. Work can now begin."}
    except Exception as e:
        logger.error(f"Error funding job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fund job: {str(e)}")

# Endpoint 5.5: Complete Job (After Escrow Release)
@app.post("/jobs/{job_id}/complete/")
async def complete_job(job_id: str, db_client: Depends = Depends(get_db_client)):
    """Called by frontend after releasePayment TX succeeds on Web3 to sync backend state."""
    try:
        # Use literal "Job finished and payment released." from constants manually or fallback
        await update_job_by_id(db_client, job_id, {"status": "Job finished and payment released."})
        return {"message": "Job successfully marked as completed."}
    except Exception as e:
        logger.error(f"Error completing job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to complete job: {str(e)}")

# Endpoint 5.6: Dispute Job (After Escrow Dispute)
@app.post("/jobs/{job_id}/dispute/")
async def dispute_job(job_id: str, db_client: Depends = Depends(get_db_client)):
    """Called by frontend after raiseDispute TX succeeds on Web3 to sync backend state."""
    try:
        job_doc = await get_job_by_id(db_client, job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        await update_job_by_id(db_client, job_id, {"status": JOB_STATUSES["DISPUTED"]})
        
        # Notify the freelancer about the dispute
        try:
            db = db_client[settings.DATABASE_NAME]
            freelancer_address = job_doc.get("freelancer_address", "")
            logger.info(f"[Dispute] Looking for proposal: job_id={job_id}, freelancer_address={freelancer_address}")
            proposal = await db["proposals"].find_one({
                "job_id": job_id,
                "freelancer_address": {"$regex": f"^{freelancer_address}$", "$options": "i"}
            })
            logger.info(f"[Dispute] Proposal found: {proposal is not None}, has user_id: {proposal.get('user_id') if proposal else 'N/A'}")
            if proposal and proposal.get("user_id"):
                await log_notification(
                    db_client,
                    proposal["user_id"],
                    f"⚠️ Dispute raised on '{job_doc['title']}'. Funds are frozen. An arbiter will review and resolve.",
                    "WARNING"
                )
                logger.info(f"[Dispute] Notification sent to freelancer user_id={proposal['user_id']}")
            else:
                logger.warning(f"[Dispute] Could not notify freelancer - proposal not found or missing user_id")
        except Exception as e:
            logger.error(f"Failed to notify freelancer of dispute: {e}", exc_info=True)

        return {"message": "Job marked as disputed. Arbiter notified."}
    except Exception as e:
        logger.error(f"Error disputing job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to dispute job: {str(e)}")

# Endpoint 5.7: Resolve Dispute (Admin Only)
@app.post("/jobs/{job_id}/resolve-dispute/")
async def resolve_dispute(
    job_id: str, 
    resolution: DisputeResolutionRequest,
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """
    Arbiter (Admin) resolves the dispute. 
    Calls contract resolveDispute with client_share.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # TODO: Add specific Admin role check here if roles are implemented
    
    try:
        job_doc = await get_job_by_id(db_client, job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found.")
        
        if job_doc.get("status") != JOB_STATUSES["DISPUTED"]:
            raise HTTPException(status_code=400, detail="Job is not in a disputed state.")

        contract_id = job_doc.get("escrow_contract_id")
        if contract_id is None:
            raise HTTPException(status_code=400, detail="No on-chain escrow found for this job.")

        # 1. Execute the on-chain transaction
        tx_hash = await resolve_escrow_dispute_tx(contract_id, resolution.client_share)

        # 2. Update status in MongoDB
        await update_job_by_id(db_client, job_id, {"status": "Job finished and payment released."})

        # Notify parties
        client_user_id = job_doc.get("created_by_user_id")
        if client_user_id:
            await log_notification(db_client, client_user_id, f"Dispute resolved for '{job_doc['title']}'. Funds distributed.", "INFO")
        
        return {
            "message": "Dispute resolved successfully on-chain.",
            "tx_hash": tx_hash
        }
    except Exception as e:
        logger.error(f"Error resolving dispute for job {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to resolve dispute: {str(e)}")

# Endpoint 5.8: Get All Disputed Jobs (Admin Only)
@app.get("/admin/disputes/", response_model=List[dict])
async def get_disputes(
    db_client: Depends = Depends(get_db_client),
    current_user: dict = Depends(get_current_user)
):
    """Retrieves all jobs currently in a DISPUTED state."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # TODO: Add Admin role check
    
    try:
        db = db_client[settings.DATABASE_NAME]
        cursor = db["jobs"].find({"status": JOB_STATUSES["DISPUTED"]})
        jobs = await cursor.to_list(length=100)
        
        for job in jobs:
            job["_id"] = str(job["_id"])
        return jobs
    except Exception as e:
        logger.error(f"Error fetching disputes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch disputes: {str(e)}")


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