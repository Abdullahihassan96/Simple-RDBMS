const StorageEngine = require("./storage/StorageEngine");
const Table = require("./storage/Table");
const SQLParser = require("./parser/SQLParser");
const QueryExecutor = require("./executor/QueryExecutor");
const IndexManager = require("./index/IndexManager");

class Database {
  constructor(dataDir = "./data") {
    this.storage = new StorageEngine(dataDir);
    this.parser = new SQLParser();
    this.executor = new QueryExecutor(this);
    this.indexManager = new IndexManager(dataDir);
    this.tables = new Map();
  }

  /**
   * Execute a SQL query
   */
  query(sql) {
    try {
      // Parse SQL
      const parsedQuery = this.parser.parse(sql);

      // Execute query
      const result = this.executor.execute(parsedQuery);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new table
   */
  createTable(tableName, schema) {
    const metadata = this.storage.createTable(tableName, schema);
    const table = new Table(tableName, metadata, this.storage);
    this.tables.set(tableName, table);

    // Create indexes for primary and unique keys
    this.indexManager.createDefaultIndexes(tableName, metadata, []);

    return table;
  }

  /**
   * Get a table instance
   */
  getTable(tableName) {
    // Check cache
    if (this.tables.has(tableName)) {
      return this.tables.get(tableName);
    }

    // Load from storage
    const metadata = this.storage.getTableMetadata(tableName);
    const table = new Table(tableName, metadata, this.storage);
    this.tables.set(tableName, table);

    return table;
  }

  /**
   * Drop a table
   */
  dropTable(tableName) {
    // Drop indexes
    const metadata = this.storage.getTableMetadata(tableName);

    if (metadata.primaryKey) {
      this.indexManager.dropIndex(tableName, metadata.primaryKey);
    }

    if (metadata.uniqueKeys) {
      for (const uniqueKey of metadata.uniqueKeys) {
        this.indexManager.dropIndex(tableName, uniqueKey);
      }
    }

    // Drop table
    this.storage.dropTable(tableName);
    this.tables.delete(tableName);
  }

  /**
   * List all tables
   */
  listTables() {
    return this.storage.listTables();
  }

  /**
   * Rebuild indexes for a table
   */
  rebuildIndexes(tableName) {
    const metadata = this.storage.getTableMetadata(tableName);
    const rows = this.storage.loadTableData(tableName);

    if (metadata.primaryKey) {
      this.indexManager.rebuildIndex(tableName, metadata.primaryKey, rows);
    }

    if (metadata.uniqueKeys) {
      for (const uniqueKey of metadata.uniqueKeys) {
        this.indexManager.rebuildIndex(tableName, uniqueKey, rows);
      }
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    const tables = this.listTables();
    const stats = {
      tableCount: tables.length,
      tables: {},
    };

    for (const tableName of tables) {
      const rows = this.storage.loadTableData(tableName);
      const metadata = this.storage.getTableMetadata(tableName);

      stats.tables[tableName] = {
        rowCount: rows.length,
        columnCount: metadata.columns.length,
        columns: metadata.columns.map((c) => c.name),
      };
    }

    return stats;
  }
}

module.exports = Database;
