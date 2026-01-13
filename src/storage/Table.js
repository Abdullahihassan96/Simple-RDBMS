function createTable(tableName, metadata, storageEngine) {
  /**
   * Validate data type
   */
  function validateType(value, type) {
    switch (type.toUpperCase()) {
      case "INTEGER":
      case "INT":
        return Number.isInteger(Number(value));
      case "TEXT":
      case "VARCHAR":
        return typeof value === "string";
      case "BOOLEAN":
      case "BOOL":
        return (
          typeof value === "boolean" || value === "true" || value === "false"
        );
      case "FLOAT":
      case "REAL":
        return !isNaN(parseFloat(value));
      default:
        return true;
    }
  }

  /**
   * Coerce value to the correct type
   */
  function coerceType(value, type) {
    if (value === null || value === undefined) return null;

    switch (type.toUpperCase()) {
      case "INTEGER":
      case "INT":
        return parseInt(value, 10);
      case "TEXT":
      case "VARCHAR":
        return String(value);
      case "BOOLEAN":
      case "BOOL":
        if (typeof value === "boolean") return value;
        return value === "true" || value === "1" || value === 1;
      case "FLOAT":
      case "REAL":
        return parseFloat(value);
      default:
        return value;
    }
  }

  /**
   * Validate a row against the schema
   */
  function validateRow(row) {
    const errors = [];

    // Check all columns
    for (const column of metadata.columns) {
      const value = row[column.name];

      // Check NOT NULL constraint
      if (column.constraints && column.constraints.includes("NOT_NULL")) {
        if (value === null || value === undefined) {
          errors.push(`Column '${column.name}' cannot be null`);
        }
      }

      // Check type if value is present
      if (value !== null && value !== undefined) {
        if (!validateType(value, column.type)) {
          errors.push(
            `Invalid type for column '${column.name}'. Expected ${column.type}`
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    return true;
  }

  /**
   * Validate PRIMARY KEY constraint
   */
  function validatePrimaryKey(row, existingRows) {
    if (!metadata.primaryKey) return true;

    const pkColumn = metadata.primaryKey;
    const pkValue = row[pkColumn];

    if (pkValue === null || pkValue === undefined) {
      throw new Error(`Primary key '${pkColumn}' cannot be null`);
    }

    // Check for duplicates
    const duplicate = existingRows.find((r) => r[pkColumn] === pkValue);
    if (duplicate) {
      throw new Error(`Duplicate primary key value: ${pkValue}`);
    }

    return true;
  }

  /**
   * Validate UNIQUE constraints
   */
  function validateUniqueKeys(row, existingRows) {
    if (!metadata.uniqueKeys || metadata.uniqueKeys.length === 0) {
      return true;
    }

    for (const uniqueKey of metadata.uniqueKeys) {
      const value = row[uniqueKey];

      if (value !== null && value !== undefined) {
        const duplicate = existingRows.find((r) => r[uniqueKey] === value);
        if (duplicate) {
          throw new Error(
            `Duplicate unique key value for '${uniqueKey}': ${value}`
          );
        }
      }
    }

    return true;
  }

  /**
   * Prepare row by coercing types and adding defaults
   */
  function prepareRow(row) {
    const preparedRow = {};

    for (const column of metadata.columns) {
      const value = row[column.name];

      if (value !== undefined) {
        preparedRow[column.name] = coerceType(value, column.type);
      } else {
        preparedRow[column.name] = null;
      }
    }

    return preparedRow;
  }

  /**
   * Insert a row with full validation
   */
  function insert(row) {
    // Prepare row
    const preparedRow = prepareRow(row);

    // Load existing rows
    const existingRows = storageEngine.loadTableData(tableName);

    // Validate
    validateRow(preparedRow);
    validatePrimaryKey(preparedRow, existingRows);
    validateUniqueKeys(preparedRow, existingRows);

    // Insert
    return storageEngine.insertRow(tableName, preparedRow);
  }

  /**
   * Get all rows
   */
  function getAll() {
    return storageEngine.loadTableData(tableName);
  }

  /**
   * Update rows matching a condition
   */
  function update(updates, condition) {
    const rows = storageEngine.loadTableData(tableName);
    let updatedCount = 0;

    const newRows = rows.map((row) => {
      if (!condition || condition(row)) {
        updatedCount++;
        return { ...row, ...updates };
      }
      return row;
    });

    storageEngine.saveTableData(tableName, newRows);
    return updatedCount;
  }

  /**
   * Delete rows matching a condition
   */
  function deleteRows(condition) {
    const rows = storageEngine.loadTableData(tableName);
    const newRows = rows.filter((row) => !condition(row));
    const deletedCount = rows.length - newRows.length;

    storageEngine.saveTableData(tableName, newRows);
    return deletedCount;
  }

  return {
    tableName,
    metadata,
    storage: storageEngine,
    validateType,
    coerceType,
    validateRow,
    validatePrimaryKey,
    validateUniqueKeys,
    prepareRow,
    insert,
    getAll,
    update,
    delete: deleteRows,
  };
}

module.exports = createTable;
