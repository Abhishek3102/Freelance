from pydantic import BaseModel, Field, conlist, field_validator
from typing import List, Dict, Optional, Any
from web3.types import ChecksumAddress

# --- Reused Models ---

class Skill(BaseModel):
    """A single skill identified in the profile."""
    name: str = Field(..., description="The name of the skill.", example="Python")
    category: str = Field(..., description="The category the skill belongs to.", example="Programming Languages")

# --- New Models for Marketplace ---

class JobPost(BaseModel):
    """Data model for a client posting a new job."""

    client_address: ChecksumAddress = Field(
        ..., description="The client's wallet address (EVM)."
    )

    title: str = Field(
        ..., description="Job title.", example="Senior React Developer for DApp"
    )

    description: str = Field(
        ...,
        description="Detailed job requirements.",
        example="Build a custom escrow interface...",
    )

    budget_eth: float = Field(
        ...,
        gt=0,
        description="Total budget in ETH (or equivalent token).",
        example=1.5,
    )

    required_skills: list[str] = Field(
        ...,
        description="Critical skills required.",
        example=["react", "solidity", "tailwind"],
    )

    @field_validator("required_skills")
    def validate_required_skills(cls, v):
        if len(v) < 1:
            raise ValueError("required_skills must contain at least one skill.")
        return v
    # required_skills: conlist(str, min_length=1) = Field(..., description="Critical skills required.", example=["react", "solidity", "tailwind"])

class FreelancerProfile(BaseModel):
    """Data model for a freelancer profile."""
    freelancer_address: ChecksumAddress = Field(..., description="The freelancer's wallet address (EVM).")
    name: str = Field(..., example="Jane Doe")
    skills: List[Skill] = Field(..., description="List of all skills the freelancer possesses.")
    portfolio_summary: str = Field(..., description="AI-summarized portfolio/experience.")
    hourly_rate_eth: float = Field(..., gt=0, description="Hourly rate in ETH.", example=0.01)
    # This comes from the blockchain via Web3.py
    immutable_rating: float = Field(0.0, ge=0, le=5, description="Average immutable rating (0-5).")

class MatchResult(BaseModel):
    """A result showing a match between a job and a freelancer."""
    freelancer_address: ChecksumAddress
    name: str
    skill_match_score: float = Field(..., description="NLP similarity score (0-100).", example=92.5)
    price_fit_score: float = Field(..., description="Normalized price fit score (0-100).", example=85.0)
    final_score: float = Field(..., description="Weighted final recommendation score (0-100).", example=88.75)
    immutable_rating: float

class ProposalIn(BaseModel):
    """Input model for a freelancer submitting a proposal."""
    freelancer_address: ChecksumAddress = Field(..., description="The freelancer's wallet address (EVM).")
    message: str = Field(..., description="Cover message detailing their approach.")
    resume_text: str = Field(..., description="Text content of the resume.")
    
class Proposal(BaseModel):
    """A proposal document stored in the database."""
    freelancer_address: ChecksumAddress
    job_id: str = Field(..., description="The MongoDB Job ID.")
    message: str = Field(..., description="Cover message.")
    status: str = Field(..., description="Current status (e.g., PENDING, ACCEPTED).", example="PENDING")
    
class JobStatusResponse(BaseModel):
    """A detailed view of a job's status."""
    job_id: str
    title: str
    client_address: ChecksumAddress
    freelancer_address: Optional[ChecksumAddress] = None
    budget_eth: float
    # Web2 Status (from MongoDB)
    proposal_status: str = Field(..., example="ACCEPTED")
    # Web3 Status (from Escrow Contract)
    escrow_status: str = Field(..., example="ACTIVE")
    escrow_contract_id: Optional[int] = Field(None, description="The on-chain ID for the Escrow contract.")
    escrow_balance_eth: float = Field(0.0, description="Current ETH balance held in escrow.")

class RatingSubmission(BaseModel):
    """Data model for submitting an immutable rating."""
    freelancer_address: ChecksumAddress
    job_id: str
    score: int = Field(..., ge=1, le=5, description="Rating score (1 to 5).")
    review_text: str = Field(..., description="Text review (to be stored on IPFS).")
    
    @field_validator('review_text')
    def review_not_too_short(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Review text must be at least 10 characters long.')
        return v

class Notification(BaseModel):
    """Notification for a user."""
    id: Optional[str] = None
    user_id: str = Field(..., description="The user's AuthID (sub) this notification belongs to.")
    message: str = Field(..., description="Content of the notification.")
    type: str = Field("INFO", description="Type: INFO, SUCCESS, WARNING, ERROR.")
    read: bool = Field(False, description="Whether the notification has been read.")
    created_at: Any = Field(None, description="Timestamp.")