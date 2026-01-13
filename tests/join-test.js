const createDatabase = require("../src/Database");

/**
 * JOIN Test Suite
 * Tests SQL JOIN functionality with two related tables
 */

function runJoinTests() {
  const db = createDatabase("./test-data");

  console.log("========================================");
  console.log("  SQL JOIN Test Suite");
  console.log("========================================\n");

  try {
    // Clean up test data if it exists
    console.log("1️⃣  Setting up test tables...\n");

    // Create users table
    const createUsersResult = db.query(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        department TEXT
      )
    `);

    if (createUsersResult.success) {
      console.log("✅ Created 'users' table");
    } else {
      console.log("⚠️  Users table might already exist");
    }

    // Create orders table
    const createOrdersResult = db.query(`
      CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY,
        user_id INTEGER,
        product TEXT,
        amount FLOAT,
        order_date TEXT
      )
    `);

    if (createOrdersResult.success) {
      console.log("✅ Created 'orders' table\n");
    } else {
      console.log("⚠️  Orders table might already exist\n");
    }

    // Insert test data into users
    console.log("2️⃣  Inserting test data...\n");

    const users = [
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice@example.com",
        department: "Engineering",
      },
      {
        id: 2,
        name: "Bob Smith",
        email: "bob@example.com",
        department: "Sales",
      },
      {
        id: 3,
        name: "Carol Williams",
        email: "carol@example.com",
        department: "Engineering",
      },
      {
        id: 4,
        name: "David Brown",
        email: "david@example.com",
        department: "HR",
      },
    ];

    for (const user of users) {
      db.query(
        `INSERT INTO users (id, name, email, department) VALUES (${user.id}, '${user.name}', '${user.email}', '${user.department}')`
      );
    }
    console.log(`✅ Inserted ${users.length} users`);

    // Insert test data into orders
    const orders = [
      {
        order_id: 101,
        user_id: 1,
        product: "Laptop",
        amount: 1500.0,
        order_date: "2026-01-05",
      },
      {
        order_id: 102,
        user_id: 1,
        product: "Mouse",
        amount: 25.0,
        order_date: "2026-01-06",
      },
      {
        order_id: 103,
        user_id: 2,
        product: "Keyboard",
        amount: 75.0,
        order_date: "2026-01-07",
      },
      {
        order_id: 104,
        user_id: 3,
        product: "Monitor",
        amount: 350.0,
        order_date: "2026-01-08",
      },
      {
        order_id: 105,
        user_id: 3,
        product: "USB Cable",
        amount: 10.0,
        order_date: "2026-01-09",
      },
    ];

    for (const order of orders) {
      db.query(
        `INSERT INTO orders (order_id, user_id, product, amount, order_date) VALUES (${order.order_id}, ${order.user_id}, '${order.product}', ${order.amount}, '${order.order_date}')`
      );
    }
    console.log(`✅ Inserted ${orders.length} orders\n`);

    // Test 1: Simple JOIN with all columns
    console.log("3️⃣  Test 1: Simple JOIN - All columns\n");
    console.log(
      "Query: SELECT * FROM users u JOIN orders o ON u.id = o.user_id\n"
    );

    const test1Result = db.query(
      "SELECT * FROM users u JOIN orders o ON u.id = o.user_id"
    );

    if (test1Result.success) {
      console.log(`✅ Found ${test1Result.count} matching records\n`);
      displayResults(test1Result.rows);
    } else {
      console.log(`❌ Error: ${test1Result.error}\n`);
    }

    // Test 2: JOIN with specific columns
    console.log("\n4️⃣  Test 2: JOIN - Specific columns\n");
    console.log(
      "Query: SELECT u.name, o.product, o.amount FROM users u JOIN orders o ON u.id = o.user_id\n"
    );

    const test2Result = db.query(
      "SELECT u.name, o.product, o.amount FROM users u JOIN orders o ON u.id = o.user_id"
    );

    if (test2Result.success) {
      console.log(`✅ Found ${test2Result.count} records\n`);
      displayResults(test2Result.rows);
    } else {
      console.log(`❌ Error: ${test2Result.error}\n`);
    }

    // Test 3: JOIN with WHERE clause
    console.log("\n5️⃣  Test 3: JOIN with WHERE clause\n");
    console.log(
      "Query: SELECT u.name, o.product, o.amount FROM users u JOIN orders o ON u.id = o.user_id WHERE o.amount > 50\n"
    );

    const test3Result = db.query(
      "SELECT u.name, o.product, o.amount FROM users u JOIN orders o ON u.id = o.user_id WHERE o.amount > 50"
    );

    if (test3Result.success) {
      console.log(`✅ Found ${test3Result.count} records with amount > 50\n`);
      displayResults(test3Result.rows);
    } else {
      console.log(`❌ Error: ${test3Result.error}\n`);
    }

    // Test 4: Check database statistics
    console.log("\n6️⃣  Database Statistics\n");
    const stats = db.getStats();
    console.log(`Total Tables: ${stats.tableCount}`);
    for (const [tableName, tableStats] of Object.entries(stats.tables)) {
      console.log(
        `  - ${tableName}: ${tableStats.rowCount} rows, ${tableStats.columnCount} columns`
      );
    }

    console.log("\n========================================");
    console.log("  All JOIN tests completed! ✅");
    console.log("========================================");
  } catch (error) {
    console.error("❌ Test Error:", error.message);
  }
}

/**
 * Display results in a formatted table
 */
function displayResults(rows) {
  if (rows.length === 0) {
    console.log("No results.");
    return;
  }

  // Get all unique column names
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  // Calculate column widths
  const widths = {};
  for (const col of columns) {
    widths[col] = Math.max(
      col.length,
      ...rows.map((row) => String(row[col] ?? "NULL").length)
    );
  }

  // Print header
  const header = columns.map((col) => col.padEnd(widths[col])).join(" | ");
  console.log(header);
  console.log(columns.map((col) => "-".repeat(widths[col])).join("-+-"));

  // Print rows
  for (const row of rows) {
    const rowStr = columns
      .map((col) => {
        const value =
          row[col] === null || row[col] === undefined
            ? "NULL"
            : String(row[col]);
        return value.padEnd(widths[col]);
      })
      .join(" | ");
    console.log(rowStr);
  }
}

// Run the tests
runJoinTests();
