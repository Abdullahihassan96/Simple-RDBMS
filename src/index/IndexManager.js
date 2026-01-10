const fs = require("fs");
const path = require("path");

class IndexManager {
  constructor(dataDir = "./data") {
    this.dataDir = dataDir;
    this.indexes = new Map(); // In-memory index cache
  }

  /**
   * Get index file path
   */
  getIndexPath(tableName, columnName) {
    return path.join(this.dataDir, `${tableName}_${columnName}.idx.json`);
  }

  /**
   * Build a hash index for a column
   */
  buildIndex(tableName, columnName, rows) {
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
      this.getIndexPath(tableName, columnName),
      JSON.stringify(indexData, null, 2)
    );

    // Cache in memory
    const cacheKey = `${tableName}.${columnName}`;
    this.indexes.set(cacheKey, index);

    return index;
  }

  /**
   * Load index from disk
   */
  loadIndex(tableName, columnName) {
    const cacheKey = `${tableName}.${columnName}`;

    // Check cache first
    if (this.indexes.has(cacheKey)) {
      return this.indexes.get(cacheKey);
    }

    // Load from disk
    const indexPath = this.getIndexPath(tableName, columnName);

    if (!fs.existsSync(indexPath)) {
      return null;
    }

    const indexData = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    const index = new Map(indexData.entries);

    // Cache it
    this.indexes.set(cacheKey, index);

    return index;
  }

  /**
   * Get row indices for a value using the index
   */
  lookup(tableName, columnName, value) {
    const index = this.loadIndex(tableName, columnName);

    if (!index) {
      return null; // Index doesn't exist
    }

    return index.get(value) || [];
  }

  /**
   * Check if index exists for a column
   */
  hasIndex(tableName, columnName) {
    return fs.existsSync(this.getIndexPath(tableName, columnName));
  }

  /**
   * Delete index
   */
  dropIndex(tableName, columnName) {
    const indexPath = this.getIndexPath(tableName, columnName);

    if (fs.existsSync(indexPath)) {
      fs.unlinkSync(indexPath);
    }

    const cacheKey = `${tableName}.${columnName}`;
    this.indexes.delete(cacheKey);
  }

  /**
   * Rebuild index after data modification
   */
  rebuildIndex(tableName, columnName, rows) {
    this.dropIndex(tableName, columnName);
    return this.buildIndex(tableName, columnName, rows);
  }

  /**
   * Create indexes for primary and unique keys
   */
  createDefaultIndexes(tableName, metadata, rows) {
    // Index primary key
    if (metadata.primaryKey) {
      this.buildIndex(tableName, metadata.primaryKey, rows);
    }

    // Index unique keys
    if (metadata.uniqueKeys) {
      for (const uniqueKey of metadata.uniqueKeys) {
        this.buildIndex(tableName, uniqueKey, rows);
      }
    }
  }
}

module.exports = IndexManager;
