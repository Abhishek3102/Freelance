import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { mainnet, polygon, optimism, arbitrum, base, zora } from "viem/chains"

export const config = getDefaultConfig({
  appName: "Freelance Platform",
  projectId: "1234567890abcdef",
  chains: [mainnet, polygon, optimism, arbitrum, base, zora],
  ssr: true,
})
