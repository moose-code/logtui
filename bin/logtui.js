#!/usr/bin/env node

/**
 * LogTUI - Command Line Interface
 *
 * A terminal-based UI for monitoring blockchain events using Hypersync
 */

// Force terminal compatibility mode
process.env.FORCE_COLOR = "1";
process.env.NCURSES_NO_UTF8_ACS = "1";

// Handle terminal capability errors before imports
const originalError = console.error;
console.error = function (msg) {
  // Ignore specific terminal capability errors
  if (
    typeof msg === "string" &&
    (msg.includes("Error on xterm") || msg.includes("Setulc"))
  ) {
    return;
  }
  originalError.apply(console, arguments);
};

// Disable debug logging
console.debug = () => {};

import { Command } from "commander";
import chalk from "chalk";
import { createScanner } from "../lib/scanner.js";
import {
  getNetworkUrl,
  getEventSignatures,
  hasPreset,
  NETWORKS,
  DEFAULT_NETWORKS,
  fetchNetworks,
  listPresets,
} from "../lib/config.js";

// Create a new command instance
const program = new Command();

// Setup program metadata
program
  .name("logtui")
  .description("A terminal UI for monitoring blockchain events with Hypersync")
  .version("0.1.0");

// Main command
program
  .argument(
    "[preset]",
    "Event preset to use (e.g., uniswap-v3, erc20, erc721)",
    "uniswap-v3"
  )
  .argument(
    "[network]",
    "Network to connect to (e.g., eth, arbitrum, optimism)",
    "eth"
  )
  .option("-e, --events <events...>", "Custom event signatures to monitor")
  .option("-n, --network <network>", "Network to connect to")
  .option(
    "-t, --title <title>",
    "Custom title for the scanner",
    "Blockchain Event Scanner"
  )
  .option("-l, --list-presets", "List available event presets and exit")
  .option("-N, --list-networks", "List all available networks and exit")
  .option("-v, --verbose", "Show additional info in the console")
  .option("--refresh-networks", "Force refresh network list from API")
  .action(async (presetArg, networkArg, options) => {
    try {
      // Always fetch networks at startup to ensure we have the latest
      // This uses the cache by default unless --refresh-networks is specified
      if (options.refreshNetworks) {
        console.log(chalk.blue("Refreshing networks from API..."));
        await fetchNetworks(true);
        console.log(chalk.green("Networks refreshed successfully!"));
      } else {
        // Silently ensure networks are loaded (uses cache if available)
        await fetchNetworks();
      }

      // If the user requested to list networks, show them and exit
      if (options.listNetworks) {
        console.log(chalk.bold.blue("\nAvailable Networks:"));
        console.log(chalk.blue("──────────────────────────────────────────"));

        // Separate into categories for better display
        const mainnetNetworks = [];
        const testnetNetworks = [];
        const otherNetworks = [];

        Object.entries(NETWORKS).forEach(([name, url]) => {
          // Categorize networks by name patterns
          if (
            name.includes("sepolia") ||
            name.includes("goerli") ||
            name.includes("testnet") ||
            name.includes("test")
          ) {
            testnetNetworks.push({ name, url });
          } else if (Object.keys(DEFAULT_NETWORKS).includes(name)) {
            mainnetNetworks.push({ name, url });
          } else {
            otherNetworks.push({ name, url });
          }
        });

        console.log(chalk.yellow("\nPopular Mainnets:"));
        mainnetNetworks.forEach(({ name, url }) => {
          console.log(`${chalk.green(name)}: ${url}`);
        });

        console.log(chalk.yellow("\nTestnets:"));
        testnetNetworks.forEach(({ name, url }) => {
          console.log(`${chalk.green(name)}: ${url}`);
        });

        console.log(chalk.yellow("\nOther Networks:"));
        otherNetworks.forEach(({ name, url }) => {
          console.log(`${chalk.green(name)}: ${url}`);
        });

        console.log(
          chalk.yellow(
            `\nTotal ${Object.keys(NETWORKS).length} networks available`
          )
        );

        console.log(chalk.blue("\nUsage Examples:"));
        console.log(
          `${chalk.yellow("logtui uniswap-v3 arbitrum")} - Use Arbitrum network`
        );
        console.log(
          `${chalk.yellow(
            "logtui -n optimism-sepolia"
          )} - Use Optimism Sepolia testnet`
        );
        console.log();
        process.exit(0);
      }

      // If the user requested to list presets, show them and exit
      if (options.listPresets) {
        console.log(chalk.bold.blue("\nAvailable Event Presets:"));
        console.log(chalk.blue("──────────────────────────────────────────"));

        listPresets().forEach((preset) => {
          console.log(
            `${chalk.green(preset.id)}: ${chalk.yellow(preset.name)} - ${
              preset.description
            }`
          );
        });

        console.log(chalk.blue("\nAvailable Networks:"));
        console.log(chalk.blue("──────────────────────────────────────────"));
        // Show just the default networks for simplicity
        Object.keys(DEFAULT_NETWORKS).forEach((network) => {
          console.log(`${chalk.green(network)}: ${DEFAULT_NETWORKS[network]}`);
        });
        console.log(
          chalk.yellow(
            `(${
              Object.keys(NETWORKS).length -
              Object.keys(DEFAULT_NETWORKS).length
            } more networks available. Run with --list-networks to see all)`
          )
        );

        console.log(chalk.blue("\nUsage Examples:"));
        console.log(chalk.blue("──────────────────────────────────────────"));
        console.log(
          `${chalk.yellow("logtui")} - Scan for Uniswap V3 events on Ethereum`
        );
        console.log(
          `${chalk.yellow(
            "logtui uniswap-v3 arbitrum"
          )} - Scan for Uniswap V3 events on Arbitrum`
        );
        console.log(
          `${chalk.yellow(
            "logtui erc20 optimism"
          )} - Scan for ERC-20 events on Optimism`
        );
        console.log(
          `${chalk.yellow(
            'logtui -e "Transfer(address,address,uint256)" -n eth'
          )} - Scan for custom events`
        );
        console.log();
        process.exit(0);
      }

      // Determine the network to use
      const network = options.network || networkArg || "eth";
      let networkUrl;

      try {
        networkUrl = getNetworkUrl(network);
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        console.log(
          chalk.yellow(
            "Run 'logtui --list-networks' to see all available networks."
          )
        );
        process.exit(1);
      }

      // Determine the event signatures to use
      let eventSignatures = [];

      if (options.events && options.events.length > 0) {
        // Use custom event signatures
        eventSignatures = options.events;
        if (options.verbose) {
          console.log(chalk.blue("Using custom event signatures:"));
          eventSignatures.forEach((sig) => console.log(`- ${sig}`));
        }
      } else {
        // Use preset
        const preset = presetArg || "uniswap-v3";

        if (!hasPreset(preset)) {
          console.error(chalk.red(`Error: Preset '${preset}' not found.`));
          console.log(
            chalk.yellow(
              `Run 'logtui --list-presets' to see available presets.`
            )
          );
          process.exit(1);
        }

        eventSignatures = getEventSignatures(preset);
        if (options.verbose) {
          console.log(
            chalk.blue(
              `Using '${preset}' preset with ${eventSignatures.length} event signatures`
            )
          );
        }
      }

      // Set the title
      const title = `${options.title} (${network})`;

      if (options.verbose) {
        console.log(
          chalk.blue(`Starting scanner on ${network}: ${networkUrl}`)
        );
        console.log(
          chalk.blue(`Monitoring ${eventSignatures.length} event types`)
        );
      }

      // Start the scanner
      await createScanner({
        networkUrl,
        eventSignatures,
        title,
      });
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      if (err.stack) {
        console.error(chalk.red(err.stack));
      }
      process.exit(1);
    }
  });

// Execute the CLI
async function main() {
  try {
    // Ensure networks are loaded before parsing arguments
    await fetchNetworks();
    program.parse(process.argv);
  } catch (err) {
    console.error(chalk.red(`Fatal error: ${err.message}`));
    process.exit(1);
  }
}

main();
