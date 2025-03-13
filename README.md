# LogTUI

A terminal-based UI for monitoring blockchain events using Hypersync.

![LogTUI gif](./hypersync.gif)

## Features

- Real-time monitoring of blockchain events with a beautiful terminal UI
- Supports **all Hypersync-enabled networks** (Ethereum, Arbitrum, Optimism, etc.)
- Built-in presets for common contract standards (Uniswap V3, ERC-20, ERC-721)
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

# Monitor Uniswap V3 events on Arbitrum
logtui uniswap-v3 arbitrum

# Monitor ERC-20 events on Optimism
logtui erc20 optimism

# Monitor on a testnet
logtui uniswap-v3 optimism-sepolia

# List all available networks
logtui --list-networks

# Force refresh the network list from Hypersync API (updates cache)
logtui --refresh-networks

# Custom events
logtui -e "Transfer(address,address,uint256)" "Approval(address,address,uint256)" -n eth

# List available presets and networks
logtui --list-presets
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

- `uniswap-v3`: Core Uniswap V3 events (PoolCreated, Swap, Mint, Burn, Initialize)
- `erc20`: Standard ERC-20 token events (Transfer, Approval)
- `erc721`: Standard ERC-721 NFT events (Transfer, Approval, ApprovalForAll)

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
