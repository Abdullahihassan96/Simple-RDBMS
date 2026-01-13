const createStorageEngine = require("./storage/StorageEngine");
const createTable = require("./storage/Table");
const createSQLParser = require("./parser/SQLParser");
const createQueryExecutor = require("./executor/QueryExecutor");
const createIndexManager = require("./index/IndexManager");

function createDatabase(dataDir = "./data") {
  const storage = createStorageEngine(dataDir);
  const parser = createSQLParser();
  const indexManager = createIndexManager(dataDir);
  const tables = new Map();

  // Create executor after defining the database object
  let executor;

  /**
   * Execute a SQL query
   */
  function query(sql) {
    try {
      // Parse SQL
      const parsedQuery = parser.parse(sql);

      // Execute query
      const result = executor.execute(parsedQuery);

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
  function createTableFunc(tableName, schema) {
    const metadata = storage.createTable(tableName, schema);
    const table = createTable(tableName, metadata, storage);
    tables.set(tableName, table);

    // Create indexes for primary and unique keys
    indexManager.createDefaultIndexes(tableName, metadata, []);

    return table;
  }

  /**
   * Get a table instance
   */
  function getTable(tableName) {
    // Check cache
    if (tables.has(tableName)) {
      return tables.get(tableName);
    }

    // Load from storage
    const metadata = storage.getTableMetadata(tableName);
    const table = createTable(tableName, metadata, storage);
    tables.set(tableName, table);

    return table;
  }

  /**
   * Drop a table
   */
  function dropTable(tableName) {
    // Drop indexes
    const metadata = storage.getTableMetadata(tableName);

    if (metadata.primaryKey) {
      indexManager.dropIndex(tableName, metadata.primaryKey);
    }

    if (metadata.uniqueKeys) {
      for (const uniqueKey of metadata.uniqueKeys) {
        indexManager.dropIndex(tableName, uniqueKey);
      }
    }

    // Drop table
    storage.dropTable(tableName);
    tables.delete(tableName);
  }

  /**
   * List all tables
   */
  function listTables() {
    return storage.listTables();
  }

  /**
   * Rebuild indexes for a table
   */
  function rebuildIndexes(tableName) {
    const metadata = storage.getTableMetadata(tableName);
    const rows = storage.loadTableData(tableName);

    if (metadata.primaryKey) {
      indexManager.rebuildIndex(tableName, metadata.primaryKey, rows);
    }

    if (metadata.uniqueKeys) {
      for (const uniqueKey of metadata.uniqueKeys) {
        indexManager.rebuildIndex(tableName, uniqueKey, rows);
      }
    }
  }

  /**
   * Get database statistics
   */
  function getStats() {
    const tablesList = listTables();
    const stats = {
      tableCount: tablesList.length,
      tables: {},
    };

    for (const tableName of tablesList) {
      const rows = storage.loadTableData(tableName);
      const metadata = storage.getTableMetadata(tableName);

      stats.tables[tableName] = {
        rowCount: rows.length,
        columnCount: metadata.columns.length,
        columns: metadata.columns.map((c) => c.name),
      };
    }

    return stats;
  }

  // Create the database object
  const db = {
    storage,
    parser,
    indexManager,
    tables,
    query,
    createTable: createTableFunc,
    getTable,
    dropTable,
    listTables,
    rebuildIndexes,
    getStats,
  };

  // Now initialize executor with the database object
  executor = createQueryExecutor(db);
  db.executor = executor;

  return db;
}

module.exports = createDatabase;
