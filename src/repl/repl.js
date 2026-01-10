const readline = require("readline");
const Database = require("../Database");

class REPL {
  constructor() {
    this.db = new Database("./data");
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "mydb> ",
    });
  }

  /**
   * Start the REPL
   */
  start() {
    console.log("========================================");
    console.log("  Simple RDBMS - Interactive Mode");
    console.log("========================================");
    console.log("Type your SQL commands and press Enter.");
    console.log("Type .help for available commands.");
    console.log("Type .exit to quit.\n");

    this.rl.prompt();

    this.rl.on("line", (line) => {
      const input = line.trim();

      // Handle special commands
      if (input.startsWith(".")) {
        this.handleSpecialCommand(input);
      } else if (input) {
        this.executeSQL(input);
      }

      this.rl.prompt();
    });

    this.rl.on("close", () => {
      console.log("\nGoodbye!");
      process.exit(0);
    });
  }

  /**
   * Handle special dot commands
   */
  handleSpecialCommand(command) {
    const parts = command.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case ".help":
        this.showHelp();
        break;

      case ".tables":
        this.showTables();
        break;

      case ".schema":
        if (parts[1]) {
          this.showSchema(parts[1]);
        } else {
          console.log("Usage: .schema <table_name>");
        }
        break;

      case ".stats":
        this.showStats();
        break;

      case ".exit":
      case ".quit":
        this.rl.close();
        break;

      default:
        console.log(`Unknown command: ${cmd}`);
        console.log("Type .help for available commands.");
    }
  }

  /**
   * Execute SQL command
   */
  executeSQL(sql) {
    const startTime = Date.now();
    const result = this.db.query(sql);
    const duration = Date.now() - startTime;

    if (result.success) {
      if (result.rows) {
        // SELECT query
        this.displayResults(result.rows);
        console.log(`\n${result.count} row(s) in ${duration}ms`);
      } else {
        // Other queries
        console.log(result.message);
        console.log(`Done in ${duration}ms`);
      }
    } else {
      console.log(`Error: ${result.error}`);
    }
  }

  /**
   * Display query results in table format
   */
  displayResults(rows) {
    if (rows.length === 0) {
      console.log("No results.");
      return;
    }

    // Get all unique column names
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

    // Calculate column widths
    const widths = {};
    for (const col of columns) {
      widths[col] = Math.max(
        col.length,
        ...rows.map((row) => String(row[col] ?? "NULL").length)
      );
    }

    // Print header
    const header = columns.map((col) => col.padEnd(widths[col])).join(" | ");
    console.log("\n" + header);
    console.log(columns.map((col) => "-".repeat(widths[col])).join("-+-"));

    // Print rows
    for (const row of rows) {
      const rowStr = columns
        .map((col) => {
          const value =
            row[col] === null || row[col] === undefined
              ? "NULL"
              : String(row[col]);
          return value.padEnd(widths[col]);
        })
        .join(" | ");
      console.log(rowStr);
    }
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log("\nAvailable Commands:");
    console.log("  .help              - Show this help message");
    console.log("  .tables            - List all tables");
    console.log("  .schema <table>    - Show table schema");
    console.log("  .stats             - Show database statistics");
    console.log("  .exit              - Exit the REPL");
    console.log("\nSupported SQL:");
    console.log("  CREATE TABLE <name> (<columns>)");
    console.log("  INSERT INTO <table> (<cols>) VALUES (<vals>)");
    console.log("  SELECT <cols> FROM <table> [WHERE <condition>]");
    console.log("  SELECT <cols> FROM <t1> JOIN <t2> ON <condition>");
    console.log("  UPDATE <table> SET <col>=<val> [WHERE <condition>]");
    console.log("  DELETE FROM <table> [WHERE <condition>]");
    console.log("  DROP TABLE <name>");
  }

  /**
   * Show all tables
   */
  showTables() {
    const tables = this.db.listTables();

    if (tables.length === 0) {
      console.log("No tables found.");
      return;
    }

    console.log("\nTables:");
    for (const table of tables) {
      console.log(`  - ${table}`);
    }
  }

  /**
   * Show table schema
   */
  showSchema(tableName) {
    try {
      const metadata = this.db.storage.getTableMetadata(tableName);

      console.log(`\nTable: ${tableName}`);
      console.log("Columns:");

      for (const col of metadata.columns) {
        const constraints =
          col.constraints.length > 0 ? ` [${col.constraints.join(", ")}]` : "";
        console.log(`  ${col.name} ${col.type}${constraints}`);
      }

      if (metadata.primaryKey) {
        console.log(`\nPrimary Key: ${metadata.primaryKey}`);
      }

      if (metadata.uniqueKeys.length > 0) {
        console.log(`Unique Keys: ${metadata.uniqueKeys.join(", ")}`);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }

  /**
   * Show database statistics
   */
  showStats() {
    const stats = this.db.getStats();

    console.log("\nDatabase Statistics:");
    console.log(`Total Tables: ${stats.tableCount}`);

    if (stats.tableCount > 0) {
      console.log("\nTable Details:");
      for (const [tableName, tableStats] of Object.entries(stats.tables)) {
        console.log(`  ${tableName}:`);
        console.log(`    Rows: ${tableStats.rowCount}`);
        console.log(
          `    Columns: ${tableStats.columnCount} (${tableStats.columns.join(
            ", "
          )})`
        );
      }
    }
  }
}

// Run REPL if this file is executed directly
if (require.main === module) {
  const repl = new REPL();
  repl.start();
}

module.exports = REPL;
