const hre = require("hardhat");

async function main() {
  // Ensure the account is correctly fetched and ready
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // --- 1. Deploy FreelancerRating ---
  console.log("Deploying FreelancerRating...");
  const PlatformApiAddress = deployer.address;

  // Use 'await' with getContractFactory
  const RatingContractFactory = await hre.ethers.getContractFactory(
    "FreelancerRating"
  );

  // Deploy the contract
  const ratingContract = await RatingContractFactory.deploy(PlatformApiAddress);

  // *** FIX: Use waitForDeployment() instead of the deprecated deployed() ***
  await ratingContract.waitForDeployment();
  const ratingAddress = await ratingContract.getAddress();

  console.log("FreelancerRating deployed to:", ratingAddress);

  // --- 2. Deploy FreelanceEscrow ---
  console.log("Deploying FreelanceEscrow...");
  const ArbiterAddress = deployer.address;

  const EscrowContractFactory = await hre.ethers.getContractFactory(
    "FreelanceEscrow"
  );
  const escrowContract = await EscrowContractFactory.deploy(ArbiterAddress);

  // *** FIX: Use waitForDeployment() instead of the deprecated deployed() ***
  await escrowContract.waitForDeployment();
  const escrowAddress = await escrowContract.getAddress();

  console.log("FreelanceEscrow deployed to:", escrowAddress);

  // --- Export Addresses ---
  console.log("\n--- COPY THESE ADDRESSES TO .env and app/config.py ---");
  console.log(`ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
  console.log(`RATING_CONTRACT_ADDRESS=${ratingAddress}`);
  console.log(`PLATFORM_ADDRESS=${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    // The Assertion failed error usually indicates a lingering node process
    // that Hardhat couldn't clean up, but the root cause is typically the JS exception.
    // By fixing the TypeError, this secondary error should also disappear.
    process.exit(1);
  });
