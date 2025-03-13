/**
 * Configuration module for logtui
 * Provides network endpoints and event signature presets
 */
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to store cached networks
const CACHE_FILE = path.join(__dirname, "../.networks-cache.json");

// Default network endpoint configuration (used as fallback if API fetch fails)
export const DEFAULT_NETWORKS = {
  eth: "http://eth.hypersync.xyz",
  arbitrum: "http://arbitrum.hypersync.xyz",
  optimism: "http://optimism.hypersync.xyz",
  base: "http://base.hypersync.xyz",
  polygon: "http://polygon.hypersync.xyz",
};

// Runtime networks object that will be populated
export let NETWORKS = { ...DEFAULT_NETWORKS };

// API endpoint to fetch available networks
const NETWORKS_API_URL = "https://chains.hyperquery.xyz/active_chains";

/**
 * Load networks from cache file
 * @returns {Object} Cached networks or default networks if cache not found
 */
function loadNetworksFromCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf8");
      const networks = JSON.parse(data);
      console.debug("Loaded networks from cache");
      return networks;
    }
  } catch (error) {
    console.warn(`Failed to load networks from cache: ${error.message}`);
  }
  return DEFAULT_NETWORKS;
}

/**
 * Save networks to cache file
 * @param {Object} networks - Networks to cache
 */
function saveNetworksToCache(networks) {
  try {
    const data = JSON.stringify(networks, null, 2);
    fs.writeFileSync(CACHE_FILE, data);
    console.debug("Saved networks to cache");
  } catch (error) {
    console.warn(`Failed to save networks to cache: ${error.message}`);
  }
}

/**
 * Fetches all available networks from the Hypersync API
 * @param {boolean} forceRefresh - Whether to force a refresh from API
 * @returns {Promise<Object>} Object with network names as keys and URLs as values
 */
export async function fetchNetworks(forceRefresh = false) {
  // If not forcing refresh, try to load from cache first
  if (!forceRefresh) {
    const cachedNetworks = loadNetworksFromCache();
    if (
      Object.keys(cachedNetworks).length > Object.keys(DEFAULT_NETWORKS).length
    ) {
      // If cache has more networks than default, use it
      NETWORKS = { ...cachedNetworks };
      return cachedNetworks;
    }
  }

  try {
    console.debug("Fetching networks from API...");
    const response = await fetch(NETWORKS_API_URL);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const networks = await response.json();
    const result = {};

    // Process the API response into our format
    networks.forEach((network) => {
      // Skip non-EVM networks for now
      if (network.ecosystem !== "evm") return;

      // Convert network name to URL format
      const url = `http://${network.name}.hypersync.xyz`;
      result[network.name] = url;
    });

    // Update the NETWORKS object
    NETWORKS = { ...result };

    // Save to cache
    saveNetworksToCache(result);

    return result;
  } catch (error) {
    console.warn(`Warning: Failed to fetch networks: ${error.message}`);
    console.warn("Using previously cached or default networks instead.");

    // Fall back to cached networks if available, or defaults
    const cachedNetworks = loadNetworksFromCache();
    NETWORKS = { ...cachedNetworks };
    return cachedNetworks;
  }
}

// Try to load networks from cache immediately
try {
  const cachedNetworks = loadNetworksFromCache();
  if (Object.keys(cachedNetworks).length > 0) {
    NETWORKS = { ...cachedNetworks };
  }
} catch (err) {
  console.warn(`Failed to load networks from cache: ${err.message}`);
}

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
      )
        .slice(0, 10)
        .join(", ")}... (Use --list-networks to see all)`
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

/**
 * Force refresh networks from API
 * @returns {Promise<Object>} Updated networks list
 */
export async function refreshNetworks() {
  return await fetchNetworks(true);
}
