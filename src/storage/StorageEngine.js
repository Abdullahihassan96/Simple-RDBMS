const fs = require("fs");
const path = require("path");

class StorageEngine {
  constructor(dataDir = "./data") {
    this.dataDir = dataDir;
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a table
   */
  getTablePath(tableName) {
    return path.join(this.dataDir, `${tableName}.json`);
  }

  /**
   * Get the metadata file path for a table
   */
  getMetaPath(tableName) {
    return path.join(this.dataDir, `${tableName}.meta.json`);
  }

  /**
   * Check if a table exists
   */
  tableExists(tableName) {
    return (
      fs.existsSync(this.getTablePath(tableName)) &&
      fs.existsSync(this.getMetaPath(tableName))
    );
  }

  /**
   * Create a new table with schema
   */
  createTable(tableName, schema) {
    if (this.tableExists(tableName)) {
      throw new Error(`Table '${tableName}' already exists`);
    }

    // Write metadata
    const metadata = {
      tableName,
      columns: schema.columns,
      primaryKey: schema.primaryKey || null,
      uniqueKeys: schema.uniqueKeys || [],
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      this.getMetaPath(tableName),
      JSON.stringify(metadata, null, 2)
    );

    // Write empty data file
    fs.writeFileSync(
      this.getTablePath(tableName),
      JSON.stringify({ rows: [] }, null, 2)
    );

    return metadata;
  }

  /**
   * Load table metadata
   */
  getTableMetadata(tableName) {
    if (!this.tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    const metaData = fs.readFileSync(this.getMetaPath(tableName), "utf8");
    return JSON.parse(metaData);
  }

  /**
   * Load all rows from a table
   */
  loadTableData(tableName) {
    if (!this.tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    const data = fs.readFileSync(this.getTablePath(tableName), "utf8");
    return JSON.parse(data).rows;
  }

  /**
   * Save rows to a table
   */
  saveTableData(tableName, rows) {
    if (!this.tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    fs.writeFileSync(
      this.getTablePath(tableName),
      JSON.stringify({ rows }, null, 2)
    );
  }

  /**
   * Insert a single row
   */
  insertRow(tableName, row) {
    const rows = this.loadTableData(tableName);
    rows.push(row);
    this.saveTableData(tableName, rows);
    return row;
  }

  /**
   * Delete table
   */
  dropTable(tableName) {
    if (!this.tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    fs.unlinkSync(this.getTablePath(tableName));
    fs.unlinkSync(this.getMetaPath(tableName));
  }

  /**
   * List all tables
   */
  listTables() {
    const files = fs.readdirSync(this.dataDir);
    const tables = files
      .filter((f) => f.endsWith(".meta.json"))
      .map((f) => f.replace(".meta.json", ""));
    return tables;
  }
}

module.exports = StorageEngine;
