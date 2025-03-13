#!/usr/bin/env node

/**
 * LogTUI - Command Line Interface
 *
 * A terminal-based UI for monitoring blockchain events using Hypersync
 */
import { Command } from "commander";
import chalk from "chalk";
import { createScanner } from "../lib/scanner.js";
import {
  getNetworkUrl,
  getEventSignatures,
  hasPreset,
  NETWORKS,
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
    "Network to connect to (e.g., ethereum, arbitrum, optimism)",
    "ethereum"
  )
  .option("-e, --events <events...>", "Custom event signatures to monitor")
  .option("-n, --network <network>", "Network to connect to")
  .option(
    "-t, --title <title>",
    "Custom title for the scanner",
    "Blockchain Event Scanner"
  )
  .option("-l, --list-presets", "List available event presets and exit")
  .option("-v, --verbose", "Show additional info in the console")
  .action(async (presetArg, networkArg, options) => {
    try {
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
        Object.keys(NETWORKS).forEach((network) => {
          console.log(`${chalk.green(network)}: ${NETWORKS[network]}`);
        });

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
            'logtui -e "Transfer(address,address,uint256)" -n ethereum'
          )} - Scan for custom events`
        );
        console.log();
        process.exit(0);
      }

      // Determine the network to use
      const network = options.network || networkArg || "ethereum";
      let networkUrl;

      try {
        networkUrl = getNetworkUrl(network);
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
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
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);
