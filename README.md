# LogTUI

A terminal-based UI for monitoring blockchain events using Hypersync.

![LogTUI gif](./hypersync.gif)

## Quickstart

Try it with a single command:

```bash
# Monitor Uniswap events on Ethereum
pnpx logtui uniswap ethereum

# Monitor Aave events on Arbitrum
pnpx logtui aave arbitrum

# See all available options
pnpx logtui --help
```

## Features

- Real-time monitoring of blockchain events with a beautiful terminal UI
- Supports **all Hypersync-enabled networks** (Ethereum, Arbitrum, Optimism, etc.)
- **Extensive preset collection** covering DeFi, Oracles, NFTs, L2s, and more
- Built-in presets for 20+ protocols (Uniswap, Chainlink, Aave, ENS, etc.)
- Custom event signature support
- Event distribution visualization
- Progress tracking and statistics
- Automatic network discovery from Hypersync API with persistent caching

## Installation

### Global Installation

```bash
npm install -g logtui
# or
yarn global add logtui
# or
pnpm add -g logtui
```

### Local Installation

```bash
npm install logtui
# or
yarn add logtui
# or
pnpm add logtui
```

## Usage

### CLI

```bash
# Default: Monitor Uniswap V3 events on Ethereum
logtui

# Track Uniswap V4 events
logtui uniswap-v4

# Monitor Chainlink price feed updates
logtui chainlink-price-feeds

# Track AAVE lending events on Arbitrum
logtui aave arbitrum

# Watch LayerZero cross-chain messages on Optimism
logtui layerzero optimism

# Monitor ENS registry events
logtui ens

# Monitor on a testnet
logtui chainlink-vrf arbitrum-sepolia

# List all available presets
logtui --list-presets

# List all available networks
logtui --list-networks

# Force refresh the network list from Hypersync API (updates cache)
logtui --refresh-networks

# Custom events
logtui -e "Transfer(address,address,uint256)" "Approval(address,address,uint256)" -n eth
```

### Network Discovery

LogTUI automatically discovers and caches all networks supported by Hypersync:

1. On first run, it loads the default networks
2. It then attempts to fetch all available networks from the Hypersync API
3. Networks are cached locally for future use, even when offline
4. Use `--refresh-networks` to force update the cached network list

This ensures you always have access to all supported networks, even when working offline.

### CLI Options

```
Usage: logtui [options] [preset] [network]

Arguments:
  preset                  Event preset to use (e.g., uniswap-v3, erc20, erc721) (default: "uniswap-v3")
  network                 Network to connect to (e.g., eth, arbitrum, optimism) (default: "eth")

Options:
  -V, --version           output the version number
  -e, --events <events>   Custom event signatures to monitor
  -n, --network <network> Network to connect to
  -t, --title <title>     Custom title for the scanner (default: "Blockchain Event Scanner")
  -l, --list-presets      List available event presets and exit
  -N, --list-networks     List all available networks and exit
  --refresh-networks      Force refresh network list from API
  -v, --verbose           Show additional info in the console
  -h, --help              display help for command
```

### Programmatic Usage

You can also use LogTUI as a library in your Node.js applications:

```javascript
import {
  createScanner,
  getNetworkUrl,
  getEventSignatures,
  fetchNetworks,
} from "logtui";

// Refresh the network list (optional, will use cache by default)
// Pass true to force refresh from API: fetchNetworks(true)
await fetchNetworks();

// Option 1: Using direct parameters
createScanner({
  networkUrl: "http://eth.hypersync.xyz",
  eventSignatures: [
    "Transfer(address,address,uint256)",
    "Approval(address,address,uint256)",
  ],
  title: "My Custom Scanner",
});

// Option 2: Using helper functions
const networkUrl = getNetworkUrl("arbitrum");
const eventSignatures = getEventSignatures("uniswap-v3");

createScanner({
  networkUrl,
  eventSignatures,
  title: "Uniswap V3 Scanner",
});
```

## Supported Networks

LogTUI automatically discovers all networks supported by Hypersync. The following are some commonly used networks:

### Mainnets

- `eth`: Ethereum Mainnet
- `arbitrum`: Arbitrum One
- `optimism`: Optimism
- `base`: Base
- `polygon`: Polygon PoS
- And many more...

### Testnets

- `arbitrum-sepolia`: Arbitrum Sepolia
- `optimism-sepolia`: Optimism Sepolia
- And more...

Run `logtui --list-networks` to see the complete, up-to-date list of all supported networks.

## Built-in Event Presets

### Core Presets

- `uniswap-v3`: Core Uniswap V3 events (PoolCreated, Swap, Mint, Burn, Initialize)
- `uniswap-v4`: Uniswap V4 PoolManager events (Swap, ModifyLiquidity, Initialize, Donate, and more)
- `erc20`: Standard ERC-20 token events (Transfer, Approval)
- `erc721`: Standard ERC-721 NFT events (Transfer, Approval, ApprovalForAll)

### Oracles

- `chainlink-price-feeds`: Chainlink price oracle events (AnswerUpdated, NewRound)
- `chainlink-vrf`: Chainlink Verifiable Random Function events
- `pyth`: Pyth Network oracle events
- `uma`: UMA Oracle events (PriceProposed, PriceDisputed, PriceSettled)

### DeFi Protocols

- `aave`: Aave V3 lending protocol events (Supply, Withdraw, Borrow, Repay)
- `curve`: Curve Finance pool events (TokenExchange, AddLiquidity)
- `weth`: Wrapped Ether events (Deposit, Withdrawal, Transfer)
- `usdc`: USD Coin stablecoin events

### Cross-chain & L2

- `layerzero`: LayerZero cross-chain messaging events
- `arbitrum`: Arbitrum sequencer and bridge events

### Gaming & NFTs

- `blur`: Blur NFT marketplace events
- `axie`: Axie Infinity game events
- `ens`: Ethereum Name Service registry events

### Emerging Tech

- `erc4337`: Account Abstraction (ERC-4337) events
- `universalRouter`: Uniswap's intent-based Universal Router events

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/logtui.git
cd logtui

# Install dependencies
npm install

# Run the development version
node bin/logtui.js
```

## Acknowledgements

- Built with [Hypersync](https://docs.envio.dev/docs/HyperIndex/overview) by Envio
- Terminal UI powered by [blessed](https://github.com/chjj/blessed)
