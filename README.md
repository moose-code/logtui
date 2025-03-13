# Hypersync Quickstart

Minimal example showing how to use Hypersync to stream blockchain events from Uniswap V3.

## Prerequisites

- Node.js
- pnpm

## How to run

```bash
# Install dependencies
pnpm i

# Run full version with UI
node run.js

# Run minimal version (recommended for beginners)
node run-simple.js

# Run version with interactive terminal dashboard
node run-tui.js
```

The script streams events directly from Ethereum mainnet and displays progress as it scans the blockchain.

> **Note:** To use other networks, change the URL in `client = HypersyncClient.new({url: "http://eth.hypersync.xyz"})`. See [documentation](https://docs.envio.dev/docs/HyperSync/overview) for supported networks.

## Documentation

For more information about Hypersync, visit the [official documentation](https://docs.envio.dev/docs/HyperSync/overview).

# LogTUI

A terminal-based UI for monitoring blockchain events using Hypersync.

![LogTUI Screenshot](https://via.placeholder.com/800x450?text=LogTUI+Screenshot)

## Features

- Real-time monitoring of blockchain events with a beautiful terminal UI
- Supports multiple networks (Ethereum, Arbitrum, Optimism, etc.)
- Built-in presets for common contract standards (Uniswap V3, ERC-20, ERC-721)
- Custom event signature support
- Event distribution visualization
- Progress tracking and statistics

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

# Custom events
logtui -e "Transfer(address,address,uint256)" "Approval(address,address,uint256)" -n ethereum

# List available presets and networks
logtui --list-presets
```

### CLI Options

```
Usage: logtui [options] [preset] [network]

Arguments:
  preset                  Event preset to use (e.g., uniswap-v3, erc20, erc721) (default: "uniswap-v3")
  network                 Network to connect to (e.g., ethereum, arbitrum, optimism) (default: "ethereum")

Options:
  -V, --version           output the version number
  -e, --events <events>   Custom event signatures to monitor
  -n, --network <network> Network to connect to
  -t, --title <title>     Custom title for the scanner (default: "Blockchain Event Scanner")
  -l, --list-presets      List available event presets and exit
  -v, --verbose           Show additional info in the console
  -h, --help              display help for command
```

### Programmatic Usage

You can also use LogTUI as a library in your Node.js applications:

```javascript
import { createScanner, getNetworkUrl, getEventSignatures } from "logtui";

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

- `ethereum`: Ethereum Mainnet
- `arbitrum`: Arbitrum One
- `optimism`: Optimism
- `base`: Base
- `polygon`: Polygon PoS

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

- Built with [Hypersync](https://www.envio.dev/hypersync) by Envio
- Terminal UI powered by [blessed](https://github.com/chjj/blessed)

## License

MIT
