const fs = require("fs");
const path = require("path");

function createIndexManager(dataDir = "./data") {
  const indexes = new Map(); // In-memory index cache

  /**
   * Get index file path
   */
  function getIndexPath(tableName, columnName) {
    return path.join(dataDir, `${tableName}_${columnName}.idx.json`);
  }

  /**
   * Build a hash index for a column
   */
  function buildIndex(tableName, columnName, rows) {
    const index = new Map();

    rows.forEach((row, rowIndex) => {
      const value = row[columnName];

      if (value !== null && value !== undefined) {
        if (!index.has(value)) {
          index.set(value, []);
        }
        index.get(value).push(rowIndex);
      }
    });

    // Save to disk
    const indexData = {
      tableName,
      columnName,
      entries: Array.from(index.entries()),
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      getIndexPath(tableName, columnName),
      JSON.stringify(indexData, null, 2)
    );

    // Cache in memory
    const cacheKey = `${tableName}.${columnName}`;
    indexes.set(cacheKey, index);

    return index;
  }

  /**
   * Load index from disk
   */
  function loadIndex(tableName, columnName) {
    const cacheKey = `${tableName}.${columnName}`;

    // Check cache first
    if (indexes.has(cacheKey)) {
      return indexes.get(cacheKey);
    }

    // Load from disk
    const indexPath = getIndexPath(tableName, columnName);

    if (!fs.existsSync(indexPath)) {
      return null;
    }

    const indexData = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    const index = new Map(indexData.entries);

    // Cache it
    indexes.set(cacheKey, index);

    return index;
  }

  /**
   * Get row indices for a value using the index
   */
  function lookup(tableName, columnName, value) {
    const index = loadIndex(tableName, columnName);

    if (!index) {
      return null; // Index doesn't exist
    }

    return index.get(value) || [];
  }

  /**
   * Check if index exists for a column
   */
  function hasIndex(tableName, columnName) {
    return fs.existsSync(getIndexPath(tableName, columnName));
  }

  /**
   * Delete index
   */
  function dropIndex(tableName, columnName) {
    const indexPath = getIndexPath(tableName, columnName);

    if (fs.existsSync(indexPath)) {
      fs.unlinkSync(indexPath);
    }

    const cacheKey = `${tableName}.${columnName}`;
    indexes.delete(cacheKey);
  }

  /**
   * Rebuild index after data modification
   */
  function rebuildIndex(tableName, columnName, rows) {
    dropIndex(tableName, columnName);
    return buildIndex(tableName, columnName, rows);
  }

  /**
   * Create indexes for primary and unique keys
   */
  function createDefaultIndexes(tableName, metadata, rows) {
    // Index primary key
    if (metadata.primaryKey) {
      buildIndex(tableName, metadata.primaryKey, rows);
    }

    // Index unique keys
    if (metadata.uniqueKeys) {
      for (const uniqueKey of metadata.uniqueKeys) {
        buildIndex(tableName, uniqueKey, rows);
      }
    }
  }

  return {
    dataDir,
    indexes,
    getIndexPath,
    buildIndex,
    loadIndex,
    lookup,
    hasIndex,
    dropIndex,
    rebuildIndex,
    createDefaultIndexes,
  };
}

module.exports = createIndexManager;
