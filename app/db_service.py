import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from typing import Dict, Any, List, Optional
from bson import ObjectId

from .config import settings

MONGODB_URI = settings.MONGODB_URI
DATABASE_NAME = settings.DATABASE_NAME

logger = logging.getLogger(__name__)

async def connect_to_mongo() -> AsyncIOMotorClient:
    """Establishes an asynchronous connection to MongoDB and ensures indexes."""
    logger.info("Attempting to connect to MongoDB...")
    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        logger.info("MongoDB connection successful.")
        
        db = client[DATABASE_NAME]
        
        # Ensure indexes for key collections
        await db["jobs"].create_index("client_address")
        await db["freelancer_profiles"].create_index("freelancer_address", unique=True)
        # Ensure proposals are unique per job/freelancer
        await db["proposals"].create_index([("job_id", 1), ("freelancer_address", 1)], unique=True)
        
        logger.info("Indexes ensured for jobs, profiles, and proposals.")
        return client
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"MongoDB connection failed: {e}", exc_info=True)
        return None

async def close_mongo_connection(client: AsyncIOMotorClient):
    """Closes the MongoDB connection."""
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

async def log_job_post(client: AsyncIOMotorClient, job_data: Dict[str, Any]) -> str:
    """Logs a new job post and returns the generated MongoDB ID."""
    try:
        db = client[DATABASE_NAME]
        result = await db["jobs"].insert_one(job_data)
        logger.info(f"Logged new job post: {job_data.get('title')}")
        return str(result.inserted_id)
    except Exception as e:
        logger.error(f"Failed to log job post: {e}", exc_info=True)
        raise

async def get_all_freelancer_profiles(client: AsyncIOMotorClient) -> List[Dict[str, Any]]:
    """Retrieves all freelancer profiles for the matching engine."""
    try:
        db = client[DATABASE_NAME]
        profiles = await db["freelancer_profiles"].find({}, 
            {"freelancer_address": 1, "skills": 1, "portfolio_summary": 1, "hourly_rate_eth": 1, "name": 1}).to_list(None)
        logger.info(f"Fetched {len(profiles)} freelancer profiles for matching.")
        return profiles
    except Exception as e:
        logger.error(f"Failed to fetch profiles: {e}", exc_info=True)
        return []

async def get_job_by_id(client: AsyncIOMotorClient, job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single job document by MongoDB ID."""
    try:
        db = client[DATABASE_NAME]
        job = await db["jobs"].find_one({"_id": ObjectId(job_id)})
        return job
    except Exception as e:
        logger.error(f"Failed to get job {job_id}: {e}", exc_info=True)
        return None

async def update_job_by_id(client: AsyncIOMotorClient, job_id: str, update_fields: Dict[str, Any]):
    """Updates fields in a job document."""
    try:
        db = client[DATABASE_NAME]
        await db["jobs"].update_one(
            {"_id": ObjectId(job_id)},
            {"$set": update_fields}
        )
        logger.info(f"Updated job {job_id} with status {update_fields.get('status')}.")
    except Exception as e:
        logger.error(f"Failed to update job {job_id}: {e}", exc_info=True)
        raise

# --- New Proposal Functions ---

async def log_proposal(client: AsyncIOMotorClient, proposal_data: Dict[str, Any]) -> str:
    """Logs a new proposal or updates an existing one."""
    try:
        db = client[DATABASE_NAME]
        
        # Check if proposal already exists for this job/freelancer combo
        existing = await db["proposals"].find_one({
            "job_id": proposal_data["job_id"],
            "freelancer_address": proposal_data["freelancer_address"]
        })

        if existing:
            await db["proposals"].update_one(
                {"_id": existing["_id"]},
                {"$set": proposal_data}
            )
            logger.info(f"Updated existing proposal for job {proposal_data.get('job_id')}")
            return str(existing["_id"])
        else:
            result = await db["proposals"].insert_one(proposal_data)
            logger.info(f"Logged new proposal for job {proposal_data.get('job_id')} by {proposal_data.get('freelancer_address')}.")
            return str(result.inserted_id)
            
    except Exception as e:
        logger.error(f"Failed to log proposal: {e}", exc_info=True)
        raise

async def update_proposal_status(client: AsyncIOMotorClient, proposal_id: str, status: str):
    """Updates the status of a specific proposal."""
    try:
        db = client[DATABASE_NAME]
        await db["proposals"].update_one(
            {"_id": ObjectId(proposal_id)},
            {"$set": {"status": status}}
        )
        logger.info(f"Updated proposal {proposal_id} status to {status}.")
    except Exception as e:
        logger.error(f"Failed to update proposal {proposal_id} status: {e}", exc_info=True)
        raise

async def get_proposals_for_job(client: AsyncIOMotorClient, job_id: str) -> List[Dict[str, Any]]:
    """Retrieves all proposals for a specific job."""
    try:
        db = client[DATABASE_NAME]
        proposals = await db["proposals"].find({"job_id": job_id}).to_list(None)
        # Convert ObjectId to str
        for p in proposals:
            p["id"] = str(p["_id"])
            del p["_id"]
        return proposals
    except Exception as e:
        logger.error(f"Failed to fetch proposals for job {job_id}: {e}", exc_info=True)
        return []

async def get_all_jobs(client: AsyncIOMotorClient, limit: int = 100, posted_by_user_id: Optional[str] = None, open_only: bool = False) -> List[Dict[str, Any]]:
    """Retrieves a list of jobs, sorted by newest first. Optionally filters by user_id or open status."""
    try:
        db = client[DATABASE_NAME]
        query = {}
        if posted_by_user_id:
             query["created_by_user_id"] = posted_by_user_id
        if open_only:
            query["status"] = "Job is open for proposals."
             
        jobs = await db["jobs"].find(query).sort("_id", -1).limit(limit).to_list(limit)
        # Convert ObjectId to str
        for job in jobs:
            job["id"] = str(job["_id"])
            del job["_id"]
        return jobs
    except Exception as e:
        logger.error(f"Failed to fetch jobs: {e}", exc_info=True)
        return []

# --- Notification Functions ---

async def log_notification(client: AsyncIOMotorClient, user_id: str, message: str, type: str = "INFO"):
    """Logs a notification for a user."""
    try:
        db = client[DATABASE_NAME]
        from datetime import datetime
        notification = {
            "user_id": user_id,
            "message": message,
            "type": type,
            "read": False,
            "created_at": datetime.utcnow()
        }
        await db["notifications"].insert_one(notification)
        logger.info(f"Logged notification for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to log notification: {e}", exc_info=True)

async def get_user_notifications(client: AsyncIOMotorClient, user_id: str, limit: int = 50) -> List[Dict]:
    """Retrieves unread notifications for a user."""
    try:
        db = client[DATABASE_NAME]
        notifications = await db["notifications"].find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        for n in notifications:
            n["id"] = str(n["_id"])
            del n["_id"]
        return notifications
    except Exception as e:
        logger.error(f"Failed to fetch notifications: {e}", exc_info=True)
        return []

async def mark_notification_read(client: AsyncIOMotorClient, notification_id: str):
    """Marks a notification as read."""
    try:
        db = client[DATABASE_NAME]
        await db["notifications"].update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"read": True}}
        )
    except Exception as e:
        logger.error(f"Failed to mark notification read: {e}", exc_info=True)