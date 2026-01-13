const fs = require("fs");
const path = require("path");

function createStorageEngine(dataDir = "./data") {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  /**
   * Get the file path for a table
   */
  function getTablePath(tableName) {
    return path.join(dataDir, `${tableName}.json`);
  }

  /**
   * Get the metadata file path for a table
   */
  function getMetaPath(tableName) {
    return path.join(dataDir, `${tableName}.meta.json`);
  }

  /**
   * Check if a table exists
   */
  function tableExists(tableName) {
    return (
      fs.existsSync(getTablePath(tableName)) &&
      fs.existsSync(getMetaPath(tableName))
    );
  }

  /**
   * Create a new table with schema
   */
  function createTable(tableName, schema) {
    if (tableExists(tableName)) {
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

    fs.writeFileSync(getMetaPath(tableName), JSON.stringify(metadata, null, 2));

    // Write empty data file
    fs.writeFileSync(
      getTablePath(tableName),
      JSON.stringify({ rows: [] }, null, 2)
    );

    return metadata;
  }

  /**
   * Load table metadata
   */
  function getTableMetadata(tableName) {
    if (!tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    const metaData = fs.readFileSync(getMetaPath(tableName), "utf8");
    return JSON.parse(metaData);
  }

  /**
   * Load all rows from a table
   */
  function loadTableData(tableName) {
    if (!tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    const data = fs.readFileSync(getTablePath(tableName), "utf8");
    return JSON.parse(data).rows;
  }

  /**
   * Save rows to a table
   */
  function saveTableData(tableName, rows) {
    if (!tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    fs.writeFileSync(
      getTablePath(tableName),
      JSON.stringify({ rows }, null, 2)
    );
  }

  /**
   * Insert a single row
   */
  function insertRow(tableName, row) {
    const rows = loadTableData(tableName);
    rows.push(row);
    saveTableData(tableName, rows);
    return row;
  }

  /**
   * Delete table
   */
  function dropTable(tableName) {
    if (!tableExists(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    fs.unlinkSync(getTablePath(tableName));
    fs.unlinkSync(getMetaPath(tableName));
  }

  /**
   * List all tables
   */
  function listTables() {
    const files = fs.readdirSync(dataDir);
    const tables = files
      .filter((f) => f.endsWith(".meta.json"))
      .map((f) => f.replace(".meta.json", ""));
    return tables;
  }

  return {
    dataDir,
    getTablePath,
    getMetaPath,
    tableExists,
    createTable,
    getTableMetadata,
    loadTableData,
    saveTableData,
    insertRow,
    dropTable,
    listTables,
  };
}

module.exports = createStorageEngine;
