/**
 * Configuration module for logtui
 * Provides network endpoints and event signature presets
 */

// Network endpoint configuration
export const NETWORKS = {
  ethereum: "http://eth.hypersync.xyz",
  arbitrum: "http://arbitrum.hypersync.xyz",
  optimism: "http://optimism.hypersync.xyz",
  base: "http://base.hypersync.xyz",
  polygon: "http://polygon.hypersync.xyz",
};

// Event signature presets
export const EVENT_PRESETS = {
  "uniswap-v3": {
    name: "Uniswap V3",
    description: "Uniswap V3 core events",
    signatures: [
      "PoolCreated(address,address,uint24,int24,address)",
      "Burn(address,int24,int24,uint128,uint256,uint256)",
      "Initialize(uint160,int24)",
      "Mint(address,address,int24,int24,uint128,uint256,uint256)",
      "Swap(address,address,int256,int256,uint160,uint128,int24)",
    ],
  },
  erc20: {
    name: "ERC-20",
    description: "Standard ERC-20 token events",
    signatures: [
      "Transfer(address,address,uint256)",
      "Approval(address,address,uint256)",
    ],
  },
  erc721: {
    name: "ERC-721",
    description: "Standard ERC-721 NFT events",
    signatures: [
      "Transfer(address,address,uint256)",
      "Approval(address,address,uint256)",
      "ApprovalForAll(address,address,bool)",
    ],
  },
};

/**
 * Get network URL from network name
 * @param {string} network - Network name
 * @returns {string} Network URL
 */
export function getNetworkUrl(network) {
  if (!NETWORKS[network]) {
    throw new Error(
      `Network '${network}' not supported. Available networks: ${Object.keys(
        NETWORKS
      ).join(", ")}`
    );
  }
  return NETWORKS[network];
}

/**
 * Get event signatures from preset name
 * @param {string} presetName - Preset name
 * @returns {Array<string>} Array of event signatures
 */
export function getEventSignatures(presetName) {
  if (!EVENT_PRESETS[presetName]) {
    throw new Error(
      `Preset '${presetName}' not found. Available presets: ${Object.keys(
        EVENT_PRESETS
      ).join(", ")}`
    );
  }
  return EVENT_PRESETS[presetName].signatures;
}

/**
 * Check if a preset exists
 * @param {string} presetName - Preset name
 * @returns {boolean} Whether the preset exists
 */
export function hasPreset(presetName) {
  return Boolean(EVENT_PRESETS[presetName]);
}

/**
 * List all available presets
 * @returns {Object} All presets with name and description
 */
export function listPresets() {
  return Object.entries(EVENT_PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
    description: preset.description,
  }));
}
