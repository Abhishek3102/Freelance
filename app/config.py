from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import logging

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding="utf-8")

    # MongoDB
    MONGO_CONNECTION_STRING: str = "mongodb://localhost:27017/"
    DATABASE_NAME: str = "freelance_db"

    # Google Gemini
    GEMINI_API_KEY: str

    # Web3 / Blockchain
    SEPOLIA_RPC_URL: str
    CHAIN_ID: int
    ESCROW_CONTRACT_ADDRESS: str
    RATING_CONTRACT_ADDRESS: str
    PRIVATE_KEY: str
    PLATFORM_ADDRESS: str


    # Logging
    LOG_LEVEL: str = "INFO"

@lru_cache()
def get_settings() -> Settings:
    logging.info("Loading application settings...")
    return Settings()

settings = get_settings()


print("Escrow Contract:", settings.ESCROW_CONTRACT_ADDRESS)
print("Rating Contract:", settings.RATING_CONTRACT_ADDRESS)
print("Platform Wallet:", settings.PLATFORM_ADDRESS)
print("RPC URL:", settings.SEPOLIA_RPC_URL)