import { keccak256, toHex } from "viem";
import {
  HypersyncClient,
  Decoder,
  LogField,
  JoinMode,
  BlockField,
  TransactionField,
} from "@envio-dev/hypersync-client";
import blessed from "blessed";
import contrib from "blessed-contrib";
import chalk from "chalk";
import figlet from "figlet";

//=============================================================================
// HYPERSYNC CONFIGURATION
//=============================================================================

// Initialize Hypersync client
const client = HypersyncClient.new({
  url: "http://eth.hypersync.xyz",
});

// Define Uniswap V3 event signatures we want to track
const event_signatures = [
  "PoolCreated(address,address,uint24,int24,address)",
  "Burn(address,int24,int24,uint128,uint256,uint256)",
  "Initialize(uint160,int24)",
  "Mint(address,address,int24,int24,uint128,uint256,uint256)",
  "Swap(address,address,int256,int256,uint160,uint128,int24)",
];

// Create topic0 hashes from event signatures
const topic0_list = event_signatures.map((sig) => keccak256(toHex(sig)));

// Define the Hypersync query to get events we're interested in
let query = {
  fromBlock: 0,
  logs: [
    {
      // Get all events that have any of the topic0 values we want
      topics: [topic0_list],
    },
  ],
  fieldSelection: {
    // Uncomment these fields if you need block data
    // block: [BlockField.Number, BlockField.Timestamp, BlockField.Hash],
    log: [
      // Uncomment these fields if you need more log data
      //   LogField.BlockNumber,
      //   LogField.LogIndex,
      //   LogField.TransactionIndex,
      //   LogField.TransactionHash,
      //   LogField.Data,
      //   LogField.Address,
      LogField.Topic0,
      //   LogField.Topic1,
      //   LogField.Topic2,
      //   LogField.Topic3,
    ],
    // Uncomment these fields if you need transaction data
    // transaction: [
    //   TransactionField.From,
    //   TransactionField.To,
    //   TransactionField.Hash,
    //   TransactionField.Value,
    // ],
  },
  joinMode: JoinMode.JoinTransactions,
};

//=============================================================================
// TUI SETUP
//=============================================================================

// Format numbers with commas
const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Safe JSON stringify that handles circular references and truncates long strings
const safeStringify = (obj, maxLength = 100) => {
  try {
    if (!obj) return "null";
    const str = JSON.stringify(obj);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  } catch (err) {
    return `[Object: stringify failed]`;
  }
};

// Create blessed screen
const screen = blessed.screen({
  smartCSR: true,
  title: "Hypersync Uniswap V3 Event Scanner",
  dockBorders: true,
  fullUnicode: true,
});

// Define UI color scheme
const uiColor = "#87CEFA"; // Original baby blue color

// Create a grid layout
const grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen,
});

// Create ASCII logo - restored to original style
const logo = grid.set(0, 0, 3, 12, blessed.box, {
  content: chalk.hex(uiColor)(
    figlet.textSync("HYPERSYNC", {
      font: "ANSI Shadow", // Restored to original ANSI Shadow font
      horizontalLayout: "full",
    })
  ),
  tags: true,
  align: "center",
  valign: "middle",
  border: {
    type: "line",
    fg: uiColor,
  },
});

// Create subtitle - moved up directly after the logo
const subtitle = grid.set(3, 0, 1, 12, blessed.box, {
  content: chalk.yellow(" Uniswap V3 Event Scanner - Powered by Envio "),
  tags: true,
  align: "center",
  valign: "middle",
  style: {
    fg: "yellow",
    bold: true,
  },
});

// Create a custom progress bar that will reliably show progress
const progressBox = grid.set(4, 0, 1, 12, blessed.box, {
  label: " Scanning Progress ",
  tags: true,
  border: {
    type: "line",
    fg: uiColor,
  },
  style: {
    fg: "white",
  },
});

// Create stats display
const stats = grid.set(5, 0, 2, 6, blessed.box, {
  label: "Stats",
  tags: true,
  border: {
    type: "line",
    fg: uiColor,
  },
  style: {
    fg: "white",
  },
});

// Create event distribution display - replacing event counter and using its space
const eventDistribution = grid.set(5, 6, 2, 6, blessed.box, {
  label: "Event Distribution",
  tags: true,
  border: {
    type: "line",
    fg: uiColor,
  },
  style: {
    fg: "white",
  },
});

// Create log window - reduce height from 6 to 4 rows
const logWindow = grid.set(7, 0, 4, 12, contrib.log, {
  label: "Event Log",
  tags: true,
  border: {
    type: "line",
    fg: uiColor,
  },
  style: {
    fg: "green",
  },
  bufferLength: 30,
});

// Exit on Escape, q, or Ctrl+C
screen.key(["escape", "q", "C-c"], function (ch, key) {
  return process.exit(0);
});

// Custom function to update the progress bar display
const updateProgressBar = (progress, label = "") => {
  try {
    // Calculate the width of the progress bar (accounting for borders and label)
    const width = progressBox.width - 4;
    const filledWidth = Math.floor(width * progress);
    const emptyWidth = width - filledWidth;

    // Create the progress bar with colors
    const filledBar = chalk.bgHex(uiColor)(" ".repeat(filledWidth));
    const emptyBar = chalk.bgBlack(" ".repeat(emptyWidth));

    // Update the progress box content
    progressBox.setContent(
      `${filledBar}${emptyBar} ${(progress * 100).toFixed(2)}% ${label}`
    );
  } catch (err) {
    logWindow.log(chalk.red(`Progress update error: ${err.message}`));
  }
};

// Function to update event distribution display using ASCII bars
const updateEventDistribution = (eventCounts) => {
  try {
    // Make sure we have some events before calculating percentages
    const hasEvents = eventCounts.Total > 0;

    // Calculate the total (excluding unknown and total)
    const knownTotal = Math.max(
      eventCounts.PoolCreated +
        eventCounts.Initialize +
        eventCounts.Mint +
        eventCounts.Burn +
        eventCounts.Swap,
      1 // Ensure we don't divide by zero
    );

    // Find max count for scaling
    const maxCount = Math.max(
      eventCounts.PoolCreated,
      eventCounts.Initialize,
      eventCounts.Mint,
      eventCounts.Burn,
      eventCounts.Swap
    );

    // Create percentage bars for each event type
    const createBar = (count, color, maxWidth = 30) => {
      // Calculate scaled width to ensure small values are visible
      let width = 0;
      let percentage = 0;

      if (hasEvents) {
        percentage = count / knownTotal;

        // Use a logarithmic scale for better visualization when values are lopsided
        if (maxCount > 0 && count > 0) {
          // Ensure small values get at least a small bar
          const logScale = Math.log(count + 1) / Math.log(maxCount + 1);
          width = Math.max(1, Math.floor(logScale * maxWidth));
        }
      }

      // Use a more visible character for the bar
      const barChar = "■";
      return (
        color(barChar.repeat(width)) +
        ` ${formatNumber(count)} (${(percentage * 100).toFixed(1)}%)`
      );
    };

    // Add extra spacing for better readability
    const labelWidth = 12;

    // Set the content with each bar on its own line and ensure consistent spacing
    eventDistribution.setContent(
      `${chalk.hex(uiColor)("PoolCreated:".padEnd(labelWidth))} ${createBar(
        eventCounts.PoolCreated,
        chalk.green
      )}\n` +
        `${chalk.hex(uiColor)("Initialize:".padEnd(labelWidth))} ${createBar(
          eventCounts.Initialize,
          chalk.yellow
        )}\n` +
        `${chalk.hex(uiColor)("Mint:".padEnd(labelWidth))} ${createBar(
          eventCounts.Mint,
          chalk.blue // Switch back to blue from teal
        )}\n` +
        `${chalk.hex(uiColor)("Burn:".padEnd(labelWidth))} ${createBar(
          eventCounts.Burn,
          chalk.red
        )}\n` +
        `${chalk.hex(uiColor)("Swap:".padEnd(labelWidth))} ${createBar(
          eventCounts.Swap,
          chalk.magenta
        )}`
    );
  } catch (err) {
    logWindow.log(chalk.red(`Distribution update error: ${err.message}`));
  }
};

// Render the screen
screen.render();

//=============================================================================
// MAIN FUNCTION
//=============================================================================

const main = async () => {
  // Count events by type
  const eventCounts = {
    PoolCreated: 0,
    Burn: 0,
    Initialize: 0,
    Mint: 0,
    Swap: 0,
    Unknown: 0,
    Total: 0,
  };

  const startTime = performance.now();

  // Log startup
  logWindow.log(
    chalk.yellow("Initializing Hypersync Uniswap V3 Event Scanner...")
  );
  screen.render();

  try {
    //=========================================================================
    // STEP 1: Get blockchain height using Hypersync
    //=========================================================================
    const height = await client.getHeight();
    logWindow.log(
      `Starting scan from block ${chalk.hex(uiColor)("0")} to ${chalk.hex(
        uiColor
      )(formatNumber(height))}`
    );
    screen.render();

    //=========================================================================
    // STEP 2: Create a decoder for the event signatures
    //=========================================================================
    const decoder = Decoder.fromSignatures(event_signatures);
    logWindow.log("Event decoder initialized");
    screen.render();

    //=========================================================================
    // STEP 3: Stream events from Hypersync
    //=========================================================================
    logWindow.log(chalk.green("Starting event stream..."));
    screen.render();
    const stream = await client.stream(query, {});

    // Update subtitle
    subtitle.setContent(
      chalk.yellow(
        ` Streaming Uniswap V3 Events from Ethereum Mainnet - Block Height: ${formatNumber(
          height
        )} `
      )
    );
    screen.render();

    //=========================================================================
    // STEP 4: Process streaming data
    //=========================================================================
    let lastLogUpdate = 0;
    let lastDistributionUpdate = 0;

    // Initialize progress bar
    updateProgressBar(0, `Block: 0/${formatNumber(height)}`);

    // Initialize distribution display
    updateEventDistribution(eventCounts);

    screen.render();

    while (true) {
      // Get the next batch of data from Hypersync
      const res = await stream.recv();

      // Quit if we reached the tip of the blockchain
      if (res === null) {
        logWindow.log(chalk.green("✓ Reached the tip of the blockchain!"));
        updateProgressBar(
          1,
          `Block: ${formatNumber(height)}/${formatNumber(height)}`
        );
        screen.render();
        break;
      }

      // Make sure we have a nextBlock value
      if (!res.nextBlock) {
        logWindow.log(chalk.yellow("Warning: Missing nextBlock in response"));
        continue;
      }

      // Process logs if any exist in this batch
      if (
        res.data &&
        res.data.logs &&
        Array.isArray(res.data.logs) &&
        res.data.logs.length > 0
      ) {
        // Process logs based on their topic0 value
        res.data.logs.forEach((log) => {
          if (!log) return; // Skip if log is null

          eventCounts.Total++;

          if (!log.topics || !Array.isArray(log.topics) || !log.topics[0]) {
            eventCounts.Unknown++;
            return;
          }

          const topic0 = log.topics[0];

          // Match topic0 to determine event type
          if (topic0 === topic0_list[0]) {
            eventCounts.PoolCreated++;
          } else if (topic0 === topic0_list[1]) {
            eventCounts.Burn++;
          } else if (topic0 === topic0_list[2]) {
            eventCounts.Initialize++;
          } else if (topic0 === topic0_list[3]) {
            eventCounts.Mint++;
          } else if (topic0 === topic0_list[4]) {
            eventCounts.Swap++;
          } else {
            eventCounts.Unknown++;
          }
        });

        // Log a decoded event sample occasionally
        try {
          if (eventCounts.Total % 1000 === 0 && res.data.logs[0]) {
            const decodedLogs = await decoder.decodeLogs([res.data.logs[0]]);
            if (
              decodedLogs &&
              Array.isArray(decodedLogs) &&
              decodedLogs.length > 0 &&
              decodedLogs[0]
            ) {
              const eventInfo = decodedLogs[0].event
                ? safeStringify(decodedLogs[0].event)
                : "No event data";
              logWindow.log(
                chalk.hex(uiColor)(
                  `Sample event at block ${res.nextBlock}: ${eventInfo}`
                )
              );
              screen.render();
            }
          }
        } catch (decodeError) {
          logWindow.log(chalk.yellow(`Decode warning: ${decodeError.message}`));
        }
      }

      // Update the fromBlock for the next iteration
      if (res.nextBlock) {
        query.fromBlock = res.nextBlock;
      }

      // Calculate time stats
      const currentTime = performance.now();
      const seconds = Math.max((currentTime - startTime) / 1000, 0.1); // Avoid division by zero
      const eventsPerSecond = (eventCounts.Total / seconds).toFixed(1);

      // Calculate progress
      const progress = Math.min(res.nextBlock / height, 1);

      // Update the progress bar
      updateProgressBar(
        progress,
        `Block: ${formatNumber(res.nextBlock)}/${formatNumber(height)}`
      );

      // Update stats display
      try {
        stats.setContent(
          `${chalk.hex(uiColor)("Current Block")}: ${formatNumber(
            res.nextBlock
          )}\n` +
            `${chalk.hex(uiColor)("Progress")}: ${(progress * 100).toFixed(
              2
            )}%\n` +
            `${chalk.hex(uiColor)("Total Events")}: ${formatNumber(
              eventCounts.Total
            )}\n` +
            `${chalk.hex(uiColor)("Elapsed Time")}: ${seconds.toFixed(1)}s\n` +
            `${chalk.hex(uiColor)("Speed")}: ${formatNumber(
              eventsPerSecond
            )} events/s`
        );
      } catch (statsError) {
        logWindow.log(
          chalk.yellow(`Stats update warning: ${statsError.message}`)
        );
      }

      // Update event distribution periodically
      if (res.nextBlock - lastDistributionUpdate >= 10000) {
        updateEventDistribution(eventCounts);
        lastDistributionUpdate = res.nextBlock;
      }

      // Log progress periodically to avoid too many updates
      if (res.nextBlock - lastLogUpdate >= 50000) {
        logWindow.log(
          `${chalk.hex(uiColor)("Block")} ${formatNumber(
            res.nextBlock
          )} | ${formatNumber(
            eventCounts.Total
          )} events | ${eventsPerSecond} events/s`
        );
        lastLogUpdate = res.nextBlock;
      }

      // Render the updated screen
      screen.render();
    }

    //=========================================================================
    // Final summary
    //=========================================================================
    const totalTime = Math.max((performance.now() - startTime) / 1000, 0.1); // Avoid division by zero

    // Update final stats
    stats.setContent(
      `${chalk.hex(uiColor)("Blocks Scanned")}: ${formatNumber(height)}\n` +
        `${chalk.hex(uiColor)("Total Events")}: ${formatNumber(
          eventCounts.Total
        )}\n` +
        `${chalk.hex(uiColor)("Elapsed Time")}: ${totalTime.toFixed(1)}s\n` +
        `${chalk.hex(uiColor)("Avg Speed")}: ${formatNumber(
          Math.round(eventCounts.Total / totalTime)
        )} events/s`
    );

    // Final distribution update
    updateEventDistribution(eventCounts);

    // Log completion
    logWindow.log(chalk.green("✓ Scan complete!"));
    logWindow.log(
      chalk.yellow(`Total processing time: ${totalTime.toFixed(2)} seconds`)
    );
    logWindow.log(
      chalk.yellow(
        `Average speed: ${formatNumber(
          Math.round(eventCounts.Total / totalTime)
        )} events/second`
      )
    );

    // Bold final message
    subtitle.setContent(chalk.green.bold(" Scan Complete - Press Q to Exit "));

    // Render final screen
    screen.render();

    // Wait for user to exit
    await new Promise((resolve) => setTimeout(resolve, 1000000000));
  } catch (error) {
    logWindow.log(chalk.red(`Error: ${error.message}`));
    screen.render();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    process.exit(1);
  }
};

// Display initial message
logWindow.log(chalk.green("Starting Hypersync Uniswap V3 Event Scanner..."));
logWindow.log(chalk.yellow("Press Q to exit at any time"));
screen.render();

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  try {
    logWindow.log(chalk.red(`Unhandled error: ${error.message}`));
    screen.render();
  } catch (err) {
    console.error("Fatal error:", error);
  }
});

// Start the application
main().catch((error) => {
  try {
    logWindow.log(chalk.red(`Fatal error: ${error.message}`));
    screen.render();
    setTimeout(() => process.exit(1), 3000);
  } catch (err) {
    console.error("Error in main:", error);
    process.exit(1);
  }
});

// Find an eventName based on topic0
const decodedEventName = (topic0) => {
  if (!topic0) return "Unknown";
  const idx = topic0_list.findIndex((t) => t === topic0);
  if (idx < 0) return "Unknown";
  // Extract name from signature (e.g. "Swap" from "Swap(...)")
  return event_signatures[idx].split("(")[0];
};

// Format the sample event for display
const formatSampleEvent = (event, name) => {
  try {
    // Show different info depending on the event type
    switch (name) {
      case "Swap":
        return `${chalk.hex(uiColor)("Swap")}: Amount0=${formatNumber(
          Math.abs(parseInt(event.data[0]))
        )}, Amount1=${formatNumber(Math.abs(parseInt(event.data[1])))}`;
      case "Mint":
        return `${chalk.hex(uiColor)("Mint")}: Amount=${formatNumber(
          parseInt(event.data[2])
        )}`;
      case "Burn":
        return `${chalk.hex(uiColor)("Burn")}: Amount=${formatNumber(
          parseInt(event.data[2])
        )}`;
      case "PoolCreated":
        return `${chalk.hex(uiColor)(
          "PoolCreated"
        )}: Token0=${event.data[0].slice(
          0,
          10
        )}..., Token1=${event.data[1].slice(0, 10)}...`;
      case "Initialize":
        return `${chalk.hex(uiColor)(
          "Initialize"
        )}: SqrtPriceX96=${formatNumber(parseInt(event.data[0]))}`;
      default:
        return `${chalk.hex(uiColor)(name)}`;
    }
  } catch (err) {
    return `${chalk.hex(uiColor)(name)}: [Format Error]`;
  }
};
