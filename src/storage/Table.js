class Table {
  constructor(tableName, metadata, storageEngine) {
    this.tableName = tableName;
    this.metadata = metadata;
    this.storage = storageEngine;
  }

  /**
   * Validate data type
   */
  validateType(value, type) {
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
  coerceType(value, type) {
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
  validateRow(row) {
    const errors = [];

    // Check all columns
    for (const column of this.metadata.columns) {
      const value = row[column.name];

      // Check NOT NULL constraint
      if (column.constraints && column.constraints.includes("NOT_NULL")) {
        if (value === null || value === undefined) {
          errors.push(`Column '${column.name}' cannot be null`);
        }
      }

      // Check type if value is present
      if (value !== null && value !== undefined) {
        if (!this.validateType(value, column.type)) {
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
  validatePrimaryKey(row, existingRows) {
    if (!this.metadata.primaryKey) return true;

    const pkColumn = this.metadata.primaryKey;
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
  validateUniqueKeys(row, existingRows) {
    if (!this.metadata.uniqueKeys || this.metadata.uniqueKeys.length === 0) {
      return true;
    }

    for (const uniqueKey of this.metadata.uniqueKeys) {
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
  prepareRow(row) {
    const preparedRow = {};

    for (const column of this.metadata.columns) {
      const value = row[column.name];

      if (value !== undefined) {
        preparedRow[column.name] = this.coerceType(value, column.type);
      } else {
        preparedRow[column.name] = null;
      }
    }

    return preparedRow;
  }

  /**
   * Insert a row with full validation
   */
  insert(row) {
    // Prepare row
    const preparedRow = this.prepareRow(row);

    // Load existing rows
    const existingRows = this.storage.loadTableData(this.tableName);

    // Validate
    this.validateRow(preparedRow);
    this.validatePrimaryKey(preparedRow, existingRows);
    this.validateUniqueKeys(preparedRow, existingRows);

    // Insert
    return this.storage.insertRow(this.tableName, preparedRow);
  }

  /**
   * Get all rows
   */
  getAll() {
    return this.storage.loadTableData(this.tableName);
  }

  /**
   * Update rows matching a condition
   */
  update(updates, condition) {
    const rows = this.storage.loadTableData(this.tableName);
    let updatedCount = 0;

    const newRows = rows.map((row) => {
      if (!condition || condition(row)) {
        updatedCount++;
        return { ...row, ...updates };
      }
      return row;
    });

    this.storage.saveTableData(this.tableName, newRows);
    return updatedCount;
  }

  /**
   * Delete rows matching a condition
   */
  delete(condition) {
    const rows = this.storage.loadTableData(this.tableName);
    const newRows = rows.filter((row) => !condition(row));
    const deletedCount = rows.length - newRows.length;

    this.storage.saveTableData(this.tableName, newRows);
    return deletedCount;
  }
}

module.exports = Table;
