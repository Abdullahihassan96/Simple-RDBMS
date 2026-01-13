function createSQLParser() {
  /**
   * Main parse method
   */
  function parse(sql) {
    // Clean up SQL
    sql = sql.trim().replace(/\s+/g, " ");

    // Determine query type
    const upperSQL = sql.toUpperCase();

    if (upperSQL.startsWith("CREATE TABLE")) {
      return parseCreateTable(sql);
    } else if (upperSQL.startsWith("INSERT INTO")) {
      return parseInsert(sql);
    } else if (upperSQL.startsWith("SELECT")) {
      return parseSelect(sql);
    } else if (upperSQL.startsWith("UPDATE")) {
      return parseUpdate(sql);
    } else if (upperSQL.startsWith("DELETE FROM")) {
      return parseDelete(sql);
    } else if (upperSQL.startsWith("DROP TABLE")) {
      return parseDropTable(sql);
    } else {
      throw new Error(`Unsupported SQL command: ${sql.substring(0, 20)}...`);
    }
  }

  /**
   * Parse CREATE TABLE statement
   * Example: CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE)
   */
  function parseCreateTable(sql) {
    const match = sql.match(/CREATE TABLE\s+(\w+)\s*\((.*)\)/i);
    if (!match) {
      throw new Error("Invalid CREATE TABLE syntax");
    }

    const tableName = match[1];
    const columnsStr = match[2];

    const columns = [];
    let primaryKey = null;
    const uniqueKeys = [];

    // Split by comma, but respect parentheses
    const columnDefs = splitByComma(columnsStr);

    for (const colDef of columnDefs) {
      const parts = colDef.trim().split(/\s+/);
      const columnName = parts[0];
      const columnType = parts[1] || "TEXT";

      const constraints = [];
      const upperDef = colDef.toUpperCase();

      if (upperDef.includes("PRIMARY KEY")) {
        primaryKey = columnName;
        constraints.push("PRIMARY_KEY");
        constraints.push("NOT_NULL");
      }

      if (upperDef.includes("UNIQUE")) {
        uniqueKeys.push(columnName);
        constraints.push("UNIQUE");
      }

      if (upperDef.includes("NOT NULL")) {
        constraints.push("NOT_NULL");
      }

      columns.push({
        name: columnName,
        type: columnType,
        constraints,
      });
    }

    return {
      type: "CREATE_TABLE",
      tableName,
      schema: {
        columns,
        primaryKey,
        uniqueKeys,
      },
    };
  }

  /**
   * Parse INSERT statement
   * Example: INSERT INTO users (id, name, email) VALUES (1, 'John', 'john@example.com')
   */
  function parseInsert(sql) {
    const match = sql.match(
      /INSERT INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i
    );
    if (!match) {
      throw new Error("Invalid INSERT syntax");
    }

    const tableName = match[1];
    const columnsStr = match[2];
    const valuesStr = match[3];

    const columns = columnsStr.split(",").map((c) => c.trim());
    const values = parseValues(valuesStr);

    const row = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });

    return {
      type: "INSERT",
      tableName,
      row,
    };
  }

  /**
   * Parse SELECT statement
   * Example: SELECT * FROM users WHERE id = 1
   * Example: SELECT name, email FROM users
   * Example: SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id
   */
  function parseSelect(sql) {
    const result = {
      type: "SELECT",
      columns: [],
      tableName: null,
      where: null,
      join: null,
    };

    // Extract columns
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
    if (!selectMatch) {
      throw new Error("Invalid SELECT syntax");
    }

    const columnsStr = selectMatch[1].trim();
    if (columnsStr === "*") {
      result.columns = ["*"];
    } else {
      result.columns = columnsStr.split(",").map((c) => c.trim());
    }

    // Extract table name (handle aliases)
    const fromMatch = sql.match(/FROM\s+(\w+)(?:\s+(\w+))?/i);
    if (!fromMatch) {
      throw new Error("Invalid FROM clause");
    }

    result.tableName = fromMatch[1];
    result.tableAlias = fromMatch[2] || null;

    // Check for JOIN
    const joinMatch = sql.match(
      /JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+(.*?)(?:\s+WHERE|$)/i
    );
    if (joinMatch) {
      result.join = {
        tableName: joinMatch[1],
        tableAlias: joinMatch[2] || null,
        on: joinMatch[3].trim(),
      };
    }

    // Extract WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
    if (whereMatch) {
      result.where = parseWhereClause(whereMatch[1].trim());
    }

    return result;
  }

  /**
   * Parse UPDATE statement
   * Example: UPDATE users SET name = 'Jane' WHERE id = 1
   */
  function parseUpdate(sql) {
    const match = sql.match(
      /UPDATE\s+(\w+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.+))?$/i
    );
    if (!match) {
      throw new Error("Invalid UPDATE syntax");
    }

    const tableName = match[1];
    const setClause = match[2];
    const whereClause = match[3];

    // Parse SET clause
    const updates = {};
    const setPairs = setClause.split(",");
    for (const pair of setPairs) {
      const [col, val] = pair.split("=").map((s) => s.trim());
      updates[col] = parseValue(val);
    }

    return {
      type: "UPDATE",
      tableName,
      updates,
      where: whereClause ? parseWhereClause(whereClause) : null,
    };
  }

  /**
   * Parse DELETE statement
   * Example: DELETE FROM users WHERE id = 1
   */
  function parseDelete(sql) {
    const match = sql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) {
      throw new Error("Invalid DELETE syntax");
    }

    return {
      type: "DELETE",
      tableName: match[1],
      where: match[2] ? parseWhereClause(match[2]) : null,
    };
  }

  /**
   * Parse DROP TABLE statement
   */
  function parseDropTable(sql) {
    const match = sql.match(/DROP TABLE\s+(\w+)/i);
    if (!match) {
      throw new Error("Invalid DROP TABLE syntax");
    }

    return {
      type: "DROP_TABLE",
      tableName: match[1],
    };
  }

  /**
   * Parse WHERE clause into a condition object
   * Example: "id = 1" -> { column: 'id', operator: '=', value: 1 }
   * Example: "name = 'John' AND age > 25" -> compound condition
   */
  function parseWhereClause(whereStr) {
    // Simple implementation - handles basic conditions
    // For production, you'd want a proper expression parser

    // Check for AND/OR (simple version)
    if (whereStr.toUpperCase().includes(" AND ")) {
      const parts = whereStr.split(/\s+AND\s+/i);
      return {
        type: "AND",
        conditions: parts.map((p) => parseSimpleCondition(p.trim())),
      };
    }

    if (whereStr.toUpperCase().includes(" OR ")) {
      const parts = whereStr.split(/\s+OR\s+/i);
      return {
        type: "OR",
        conditions: parts.map((p) => parseSimpleCondition(p.trim())),
      };
    }

    return parseSimpleCondition(whereStr);
  }

  /**
   * Parse a simple condition
   */
  function parseSimpleCondition(condStr) {
    const operators = [">=", "<=", "!=", "=", ">", "<"];

    for (const op of operators) {
      if (condStr.includes(op)) {
        const parts = condStr.split(op).map((s) => s.trim());
        return {
          column: parts[0],
          operator: op,
          value: parseValue(parts[1]),
        };
      }
    }

    throw new Error(`Invalid condition: ${condStr}`);
  }

  /**
   * Parse a single value (handle strings, numbers, booleans)
   */
  function parseValue(val) {
    val = val.trim();

    // String (single or double quotes)
    if (
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"'))
    ) {
      return val.slice(1, -1);
    }

    // Boolean
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;

    // Null
    if (val.toLowerCase() === "null") return null;

    // Number
    if (!isNaN(val)) {
      return val.includes(".") ? parseFloat(val) : parseInt(val, 10);
    }

    return val;
  }

  /**
   * Parse multiple values from VALUES clause
   */
  function parseValues(valuesStr) {
    const values = [];
    let current = "";
    let inString = false;
    let stringChar = null;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];

      if ((char === "'" || char === '"') && !inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar && inString) {
        inString = false;
        current += char;
      } else if (char === "," && !inString) {
        values.push(parseValue(current.trim()));
        current = "";
      } else {
        current += char;
      }
    }

    if (current) {
      values.push(parseValue(current.trim()));
    }

    return values;
  }

  /**
   * Split string by comma, respecting parentheses
   */
  function splitByComma(str) {
    const parts = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === "(") depth++;
      if (char === ")") depth--;

      if (char === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current.trim());
    }

    return parts;
  }

  return {
    parse,
    parseCreateTable,
    parseInsert,
    parseSelect,
    parseUpdate,
    parseDelete,
    parseDropTable,
    parseWhereClause,
    parseSimpleCondition,
    parseValue,
    parseValues,
    splitByComma,
  };
}

module.exports = createSQLParser;
