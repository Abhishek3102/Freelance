from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import logging

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding="utf-8")

    MONGO_CONNECTION_STRING: str
    DATABASE_NAME: str = "freelance_db"

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
print("MongoDB URI:", settings.MONGO_CONNECTION_STRING)
