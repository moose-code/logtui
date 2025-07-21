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
            Object.keys(cachedNetworks).length >
            Object.keys(DEFAULT_NETWORKS).length
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
    "uniswap-v4": {
        name: "Uniswap V4",
        description: "Uniswap V4 PoolManager events",
        signatures: [
            "Donate(bytes32,address,uint256,uint256)",
            "Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)",
            "ModifyLiquidity(bytes32,address,int24,int24,int256,bytes32)",
            "Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)",
            "Transfer(address,address,address,uint256,uint256)",
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
    // Oracle Presets
    "chainlink-price-feeds": {
        name: "Chainlink Price Feeds",
        description: "Chainlink price oracle events",
        signatures: [
            "AnswerUpdated(int256,uint256,uint256)",
            "NewRound(uint256,address,uint256)",
            "ResponseReceived(int256,uint256,address)",
            "AggregatorConfigSet(address,address,address)",
            "RoundDetailsUpdated(uint128,uint32,int192,uint32)",
        ],
    },
    "chainlink-vrf": {
        name: "Chainlink VRF",
        description: "Chainlink Verifiable Random Function events",
        signatures: [
            "RandomWordsRequested(bytes32,uint256,uint256,uint64,uint16,uint32,uint32,address)",
            "RandomWordsFulfilled(uint256,uint256,uint96,bool)",
            "ConfigSet(uint16,uint32,uint32,uint32,uint32)",
            "SubscriptionCreated(uint64,address)",
            "SubscriptionFunded(uint64,uint256,uint256)",
        ],
    },
    pyth: {
        name: "Pyth Network",
        description: "Pyth Network oracle events",
        signatures: [
            "BatchPriceFeedUpdate(bytes32[],bytes[])",
            "PriceFeedUpdate(bytes32,bytes)",
            "BatchPriceUpdate(bytes32[],int64[],uint64[],int32[],uint32[])",
            "PriceUpdate(bytes32,int64,uint64,int32,uint32)",
        ],
    },
    uma: {
        name: "UMA Protocol",
        description: "UMA Oracle events",
        signatures: [
            "PriceProposed(address,uint256,uint256,int256)",
            "PriceDisputed(address,uint256,uint256,int256)",
            "PriceSettled(address,uint256,int256,uint256)",
        ],
    },
    // DeFi Presets
    aave: {
        name: "Aave V3",
        description: "Aave V3 lending protocol events",
        signatures: [
            "Supply(address,address,address,uint256,uint16)",
            "Withdraw(address,address,address,uint256)",
            "Borrow(address,address,address,uint256,uint256,uint16)",
            "Repay(address,address,address,uint256,bool)",
            "LiquidationCall(address,address,address,uint256,uint256,address,bool)",
        ],
    },
    curve: {
        name: "Curve Finance",
        description: "Curve pool events",
        signatures: [
            "TokenExchange(address,int128,uint256,int128,uint256)",
            "AddLiquidity(address,uint256[],uint256,uint256)",
            "RemoveLiquidity(address,uint256,uint256[])",
            "RemoveLiquidityOne(address,uint256,uint256)",
        ],
    },
    // Cross-chain & Bridges
    layerzero: {
        name: "LayerZero",
        description: "LayerZero cross-chain messaging events",
        signatures: [
            "MessageSent(bytes,uint64,bytes32,bytes)",
            "PacketReceived(uint16,bytes,address,uint64,bytes32)",
            "RelayerAdded(address,uint16)",
            "RelayerRemoved(address,uint16)",
        ],
    },
    weth: {
        name: "WETH",
        description: "Wrapped Ether events",
        signatures: [
            "Deposit(address,uint256)",
            "Withdrawal(address,uint256)",
            "Transfer(address,address,uint256)",
            "Approval(address,address,uint256)",
        ],
    },
    across: {
        name: "Across Protocol",
        description: "Across cross-chain bridge events",
        signatures: [
            "FundsDeposited(bytes32,bytes32,uint256,uint256,uint256,uint256,uint32,uint32,uint32,bytes32,bytes32,bytes32,bytes)",
            "V3FundsDeposited(address,address,uint256,uint256,uint256,uint32,uint32,uint32,uint32,address,address,address,bytes)",
            "FilledRelay(bytes32,bytes32,uint256,uint256,uint256,uint256,uint256,uint32,uint32,bytes32,bytes32,bytes32,bytes32,bytes32,(bytes32,bytes32,uint256,uint8))",
            "FilledV3Relay(address,address,uint256,uint256,uint256,uint256,uint32,uint32,uint32,address,address,address,address,bytes,(address,bytes,uint256,uint8))",
        ],
    },
    // L2 Infrastructure
    arbitrum: {
        name: "Arbitrum",
        description: "Arbitrum sequencer and bridge events",
        signatures: [
            "SequencerBatchDelivered(uint256,bytes32,address,uint256)",
            "MessageDelivered(uint256,bytes32,address,uint8,address,bytes32)",
            "BridgeCallTriggered(address,address,uint256,bytes)",
        ],
    },
    // Gaming/NFTs
    blur: {
        name: "Blur",
        description: "Blur NFT marketplace events",
        signatures: [
            "OrdersMatched(address,address,bytes32,bytes32)",
            "NonceIncremented(address,uint256)",
            "NewBlurExchange(address)",
            "NewExecutionDelegate(address)",
        ],
    },
    axie: {
        name: "Axie Infinity",
        description: "Axie Infinity game events",
        signatures: [
            "AxieSpawned(uint256,uint256,uint256,uint256,uint256)",
            "AxieBred(address,uint256,uint256,uint256)",
            "Transfer(address,address,uint256)",
            "BreedingApproval(address,uint256,address)",
        ],
    },
    // Stablecoins
    usdc: {
        name: "USDC",
        description: "USD Coin stablecoin events",
        signatures: [
            "Transfer(address,address,uint256)",
            "Approval(address,address,uint256)",
            "Mint(address,uint256)",
            "Burn(address,uint256)",
            "BlacklistAdded(address)",
            "BlacklistRemoved(address)",
        ],
    },
    // DAOs/Governance
    ens: {
        name: "ENS",
        description: "Ethereum Name Service registry events",
        signatures: [
            "NewOwner(bytes32,bytes32,address)",
            "Transfer(bytes32,address)",
            "NewResolver(bytes32,address)",
            "NewTTL(bytes32,uint64)",
            "NameRegistered(string,bytes32,address,uint256,uint256)",
        ],
    },
    // Emerging/Trending
    erc4337: {
        name: "ERC-4337",
        description: "Account Abstraction events",
        signatures: [
            "UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)",
            "AccountDeployed(bytes32,address,address,address)",
        ],
    },
    universalRouter: {
        name: "Uniswap Universal Router",
        description: "Uniswap's intent-based router events",
        signatures: [
            "RewardsSent(address,uint256)",
            "ERC20Transferred(address,address,uint256)",
            "ERC721Transferred(address,address,address,uint256)",
            "ERC1155Transferred(address,address,address,uint256,uint256)",
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
