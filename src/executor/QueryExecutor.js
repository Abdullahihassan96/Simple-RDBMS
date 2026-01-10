class QueryExecutor {
  constructor(database) {
    this.db = database;
  }

  /**
   * Execute a parsed query
   */
  execute(parsedQuery) {
    switch (parsedQuery.type) {
      case "CREATE_TABLE":
        return this.executeCreateTable(parsedQuery);
      case "INSERT":
        return this.executeInsert(parsedQuery);
      case "SELECT":
        return this.executeSelect(parsedQuery);
      case "UPDATE":
        return this.executeUpdate(parsedQuery);
      case "DELETE":
        return this.executeDelete(parsedQuery);
      case "DROP_TABLE":
        return this.executeDropTable(parsedQuery);
      default:
        throw new Error(`Unknown query type: ${parsedQuery.type}`);
    }
  }

  /**
   * Execute CREATE TABLE
   */
  executeCreateTable(query) {
    const table = this.db.createTable(query.tableName, query.schema);
    return {
      success: true,
      message: `Table '${query.tableName}' created successfully`,
      table,
    };
  }

  /**
   * Execute INSERT
   */
  executeInsert(query) {
    const table = this.db.getTable(query.tableName);
    const row = table.insert(query.row);

    // Rebuild indexes
    this.db.rebuildIndexes(query.tableName);

    return {
      success: true,
      message: `Row inserted into '${query.tableName}'`,
      row,
    };
  }

  /**
   * Execute SELECT
   */
  executeSelect(query) {
    if (query.join) {
      return this.executeJoin(query);
    }

    const table = this.db.getTable(query.tableName);
    let rows = table.getAll();

    // Apply WHERE clause
    if (query.where) {
      rows = this.filterRows(rows, query.where, query.tableName);
    }

    // Project columns
    if (query.columns[0] !== "*") {
      rows = rows.map((row) => {
        const projected = {};
        for (const col of query.columns) {
          projected[col] = row[col];
        }
        return projected;
      });
    }

    return {
      success: true,
      rows,
      count: rows.length,
    };
  }

  /**
   * Execute SELECT with JOIN
   */
  executeJoin(query) {
    const leftTable = this.db.getTable(query.tableName);
    const rightTable = this.db.getTable(query.join.tableName);

    const leftRows = leftTable.getAll();
    const rightRows = rightTable.getAll();

    // Parse ON condition (e.g., "u.id = o.user_id")
    const onMatch = query.join.on.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
    if (!onMatch) {
      throw new Error("Invalid JOIN ON clause");
    }

    const [, leftAlias, leftCol, rightAlias, rightCol] = onMatch;

    // Determine which table is which based on alias
    const leftJoinCol =
      leftAlias === (query.tableAlias || query.tableName.charAt(0))
        ? leftCol
        : rightCol;
    const rightJoinCol =
      rightAlias === (query.join.tableAlias || query.join.tableName.charAt(0))
        ? rightCol
        : leftCol;

    // Perform nested loop join
    const joinedRows = [];
    for (const leftRow of leftRows) {
      for (const rightRow of rightRows) {
        if (leftRow[leftJoinCol] === rightRow[rightJoinCol]) {
          // Merge rows with table prefixes
          const joined = {};

          for (const [key, value] of Object.entries(leftRow)) {
            joined[`${query.tableName}.${key}`] = value;
          }

          for (const [key, value] of Object.entries(rightRow)) {
            joined[`${query.join.tableName}.${key}`] = value;
          }

          joinedRows.push(joined);
        }
      }
    }

    // Project columns
    let result = joinedRows;
    if (query.columns[0] !== "*") {
      result = joinedRows.map((row) => {
        const projected = {};
        for (const col of query.columns) {
          // Handle aliased columns (e.g., "u.name")
          if (col.includes(".")) {
            projected[col] = row[col];
          } else {
            // Try to find the column in joined data
            const matchingKey = Object.keys(row).find((k) =>
              k.endsWith(`.${col}`)
            );
            if (matchingKey) {
              projected[col] = row[matchingKey];
            }
          }
        }
        return projected;
      });
    }

    return {
      success: true,
      rows: result,
      count: result.length,
    };
  }

  /**
   * Execute UPDATE
   */
  executeUpdate(query) {
    const table = this.db.getTable(query.tableName);

    const condition = query.where
      ? (row) => this.evaluateCondition(row, query.where)
      : null;

    const count = table.update(query.updates, condition);

    // Rebuild indexes
    this.db.rebuildIndexes(query.tableName);

    return {
      success: true,
      message: `Updated ${count} row(s)`,
      count,
    };
  }

  /**
   * Execute DELETE
   */
  executeDelete(query) {
    const table = this.db.getTable(query.tableName);

    const condition = query.where
      ? (row) => this.evaluateCondition(row, query.where)
      : () => true; // Delete all if no WHERE clause

    const count = table.delete(condition);

    // Rebuild indexes
    this.db.rebuildIndexes(query.tableName);

    return {
      success: true,
      message: `Deleted ${count} row(s)`,
      count,
    };
  }

  /**
   * Execute DROP TABLE
   */
  executeDropTable(query) {
    this.db.dropTable(query.tableName);
    return {
      success: true,
      message: `Table '${query.tableName}' dropped successfully`,
    };
  }

  /**
   * Filter rows based on WHERE clause (with index optimization)
   */
  filterRows(rows, whereClause, tableName) {
    // Try to use index for simple equality conditions
    if (whereClause.column && whereClause.operator === "=") {
      const indices = this.db.indexManager.lookup(
        tableName,
        whereClause.column,
        whereClause.value
      );

      if (indices !== null) {
        // Use index
        return indices.map((idx) => rows[idx]);
      }
    }

    // Fall back to full table scan
    return rows.filter((row) => this.evaluateCondition(row, whereClause));
  }

  /**
   * Evaluate a condition against a row
   */
  evaluateCondition(row, condition) {
    if (condition.type === "AND") {
      return condition.conditions.every((c) => this.evaluateCondition(row, c));
    }

    if (condition.type === "OR") {
      return condition.conditions.some((c) => this.evaluateCondition(row, c));
    }

    const value = row[condition.column];
    const compareValue = condition.value;

    switch (condition.operator) {
      case "=":
        return value == compareValue;
      case "!=":
        return value != compareValue;
      case ">":
        return value > compareValue;
      case "<":
        return value < compareValue;
      case ">=":
        return value >= compareValue;
      case "<=":
        return value <= compareValue;
      default:
        throw new Error(`Unknown operator: ${condition.operator}`);
    }
  }
}

module.exports = QueryExecutor;
