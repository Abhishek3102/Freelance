const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("FreelanceModule", (m) => {
  // arbiterAddress is required for FreelanceEscrow
  // platformApiAddress is required for FreelancerRating 
  // We default to the first and second accounts from Hardhat node (besides deployer) if not passed
  
  // Note: specific addresses should be passed as parameters or configured here
  // For local testing, we can use hardhat's default accounts.
  // Account 0: Deployer (default)
  // Account 1: Platform (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
  // Account 2: Arbiter (0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)

  const platformApiAddress = m.getParameter("platformApiAddress", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  const arbiterAddress = m.getParameter("arbiterAddress", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");

  const freelanceEscrow = m.contract("FreelanceEscrow", [arbiterAddress]);
  const freelancerRating = m.contract("FreelancerRating", [platformApiAddress]);

  return { freelanceEscrow, freelancerRating };
});
