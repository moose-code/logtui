/**
 * Core scanner module for logtui
 * Handles connecting to Hypersync and displaying the TUI
 */
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

// Force terminal compatibility mode - stronger settings
process.env.FORCE_COLOR = "1";
process.env.NCURSES_NO_UTF8_ACS = "1";
process.env.TERM = "xterm-color";

// Apply completely silent error handling for Blessed/Terminal issues
const originalConsoleError = console.error;
console.error = function (...args) {
  // Check if this is a terminal capability error
  if (args.length > 0 && typeof args[0] === "string") {
    const errorMsg = args[0];
    if (
      errorMsg.includes("Error on xterm") ||
      errorMsg.includes("Setulc") ||
      errorMsg.includes("stack") ||
      errorMsg.includes("term") ||
      errorMsg.includes("escape sequence")
    ) {
      return; // Silently ignore these errors
    }
  }
  originalConsoleError.apply(console, args);
};

// Apply monkey patch to process.stderr.write to catch any remaining errors
const originalStderrWrite = process.stderr.write;
process.stderr.write = function (buffer, encoding, fd) {
  const str = buffer.toString();
  if (
    str.includes("Error on xterm") ||
    str.includes("Setulc") ||
    str.includes("stack") ||
    str.includes("var v") ||
    str.includes("terminal capability") ||
    str.includes("xterm-256color") ||
    str.toLowerCase().includes("setulc")
  ) {
    return true; // Pretend we wrote it but don't actually write
  }
  return originalStderrWrite.apply(process.stderr, arguments);
};

/**
 * Format numbers with commas
 * @param {number|string} num - Number to format
 * @returns {string} Formatted number
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Safe JSON stringify that handles circular references
 * @param {Object} obj - Object to stringify
 * @param {number} maxLength - Maximum length before truncating
 * @returns {string} Stringified object
 */
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

/**
 * Create and run the scanner with TUI
 * @param {Object} options - Scanner options
 * @param {string} options.networkUrl - Hypersync network URL
 * @param {Array<string>} options.eventSignatures - Event signatures to scan for
 * @param {string} options.title - Title for the TUI
 * @returns {Promise<void>}
 */
export async function createScanner({
  networkUrl,
  eventSignatures,
  title = "Event Scanner",
}) {
  // Initialize Hypersync client
  const client = HypersyncClient.new({
    url: networkUrl,
  });

  // Create topic0 hashes from event signatures
  const topic0_list = eventSignatures.map((sig) => keccak256(toHex(sig)));

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
      log: [LogField.Topic0],
    },
    joinMode: JoinMode.JoinTransactions,
  };

  // Track event counts - will be populated dynamically
  const eventCounts = {
    Total: 0,
    Unknown: 0,
  };

  // Create a mapping of topic0 hash to event name
  const topic0ToName = {};

  // Initialize event counts for each signature
  eventSignatures.forEach((sig) => {
    const name = sig.split("(")[0];
    const topic0 = keccak256(toHex(sig));
    topic0ToName[topic0] = name;
    eventCounts[name] = 0;
  });

  //=============================================================================
  // TUI SETUP
  //=============================================================================

  // Create blessed screen with improved compatibility settings
  const screen = blessed.screen({
    smartCSR: true,
    title,
    dockBorders: true,
    fullUnicode: true,
    forceUnicode: true,
    autoPadding: true,
    terminal: "xterm-color", // Use simpler terminal type
    fastCSR: true,
    useBCE: true, // Use Background Color Erase for better rendering
  });

  // Define UI color scheme
  const uiColor = "#87CEFA"; // Baby blue color

  // Create custom hex color function with fallback for terminal compatibility
  const safeHexColor = (text) => {
    try {
      return chalk.hex(uiColor)(text);
    } catch (e) {
      return chalk.blue(text); // Fallback to standard blue
    }
  };

  // Create a grid layout
  const grid = new contrib.grid({
    rows: 12,
    cols: 12,
    screen: screen,
  });

  // Create ASCII logo
  const logo = grid.set(0, 0, 3, 12, blessed.box, {
    content: safeHexColor(
      figlet.textSync("ENVIO.DEV", {
        font: "ANSI Shadow",
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

  // Create subtitle
  const subtitle = grid.set(3, 0, 1, 12, blessed.box, {
    content: chalk.yellow(` ${title} - Powered by Envio `),
    tags: true,
    align: "center",
    valign: "middle",
    style: {
      fg: "yellow",
      bold: true,
    },
  });

  // Create a custom progress bar
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

  // Create event distribution display
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

  // Create log window
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

      // Create the progress bar with colors - using hexColor with fallback
      let filledBar;
      try {
        filledBar = chalk.bgHex(uiColor)(" ".repeat(filledWidth));
      } catch (e) {
        filledBar = chalk.bgBlue(" ".repeat(filledWidth));
      }
      const emptyBar = chalk.bgBlack(" ".repeat(emptyWidth));

      // Update the progress box content
      progressBox.setContent(
        `${filledBar}${emptyBar} ${(progress * 100).toFixed(2)}% ${label}`
      );
    } catch (err) {
      // Silently handle errors
    }
  };

  // Function to update event distribution display using ASCII bars
  const updateEventDistribution = (eventCounts) => {
    try {
      // Make sure we have some events before calculating percentages
      const hasEvents = eventCounts.Total > 0;

      // Get all event names (excluding Unknown and Total)
      const eventNames = Object.keys(eventCounts).filter(
        (key) => key !== "Unknown" && key !== "Total"
      );

      // Calculate the total (excluding unknown and total)
      const knownTotal = Math.max(
        eventNames.reduce((sum, name) => sum + eventCounts[name], 0),
        1 // Ensure we don't divide by zero
      );

      // Find max count for scaling
      const maxCount = Math.max(
        ...eventNames.map((name) => eventCounts[name]),
        1
      );

      // Create percentage bars for each event type - using simpler color approach
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
        // Use safe color approach
        return (
          color(barChar.repeat(width)) +
          ` ${formatNumber(count)} (${(percentage * 100).toFixed(1)}%)`
        );
      };

      // Add extra spacing for better readability
      const labelWidth = 12;

      // Use basic colors for better terminal compatibility
      const colors = [
        chalk.green, // Green
        chalk.yellow, // Yellow
        chalk.blue, // Blue
        chalk.red, // Red
        chalk.magenta, // Magenta
        chalk.cyan, // Cyan
        chalk.white, // White
      ];

      // Set the content with each bar on its own line
      const content = eventNames
        .map((name, index) => {
          const color = colors[index % colors.length];
          // Use safeHexColor for better compatibility
          return `${safeHexColor(name.padEnd(labelWidth))} ${createBar(
            eventCounts[name],
            color
          )}`;
        })
        .join("\n");

      eventDistribution.setContent(content);
    } catch (err) {
      // Silently handle errors
    }
  };

  // Render the screen
  screen.render();

  //=============================================================================
  // MAIN FUNCTION
  //=============================================================================

  const startTime = performance.now();

  // Log startup
  logWindow.log(chalk.yellow(`Initializing Event Scanner...`));
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
    const decoder = Decoder.fromSignatures(eventSignatures);
    logWindow.log("Event decoder initialized");
    screen.render();

    //=========================================================================
    // STEP 3: Stream events from Hypersync
    //=========================================================================
    logWindow.log(chalk.green("Starting event stream..."));
    screen.render();
    const stream = await client.stream(query, {});

    // Update subtitle to show network
    subtitle.setContent(
      chalk.yellow(` ${title} - Block Height: ${formatNumber(height)} `)
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
          const eventName = topic0ToName[topic0] || "Unknown";

          if (eventName === "Unknown") {
            eventCounts.Unknown++;
          } else {
            eventCounts[eventName] = (eventCounts[eventName] || 0) + 1;
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
          `${safeHexColor("Current Block")}: ${formatNumber(res.nextBlock)}\n` +
            `${safeHexColor("Progress")}: ${(progress * 100).toFixed(2)}%\n` +
            `${safeHexColor("Total Events")}: ${formatNumber(
              eventCounts.Total
            )}\n` +
            `${safeHexColor("Elapsed Time")}: ${seconds.toFixed(1)}s\n` +
            `${safeHexColor("Speed")}: ${formatNumber(
              eventsPerSecond
            )} events/s`
        );
      } catch (statsError) {
        // Silently handle errors
      }

      // Update event distribution periodically
      if (res.nextBlock - lastDistributionUpdate >= 10000) {
        updateEventDistribution(eventCounts);
        lastDistributionUpdate = res.nextBlock;
      }

      // Log progress periodically to avoid too many updates
      if (res.nextBlock - lastLogUpdate >= 50000) {
        logWindow.log(
          `${safeHexColor("Block")} ${formatNumber(
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
      `${safeHexColor("Blocks Scanned")}: ${formatNumber(height)}\n` +
        `${safeHexColor("Total Events")}: ${formatNumber(
          eventCounts.Total
        )}\n` +
        `${safeHexColor("Elapsed Time")}: ${totalTime.toFixed(1)}s\n` +
        `${safeHexColor("Avg Speed")}: ${formatNumber(
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
}
