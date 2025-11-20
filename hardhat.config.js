require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28", // Must match the pragma in your .sol files
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "", // Paste your Infura/Alchemy RPC URL here
      accounts: [process.env.PRIVATE_KEY], // Private key of the wallet you funded with test ETH
    },
  },
};
