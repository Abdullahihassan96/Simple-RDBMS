# Simple RDBMS

A lightweight, file-based relational database management system built with Node.js using functional programming patterns.

## Features

- **SQL Support**: CREATE TABLE, INSERT, SELECT, UPDATE, DELETE, DROP TABLE
- **JOIN Operations**: Support for INNER JOIN with multiple table queries
- **Indexing**: Primary key and unique constraint indexes
- **Storage**: JSON file-based storage system
- **Web Interface**: Task manager demo with SQL executor
- **REPL**: Interactive command-line interface
- **REST API**: Express server with query endpoints

## Installation

```bash
npm install
```

## Usage

### Web Interface

Start the web server:

```bash
npm start
```

Visit `http://localhost:3000` to access:

- **Task Manager**: CRUD interface for task management
- **SQL Executor**: Run custom SQL queries
- **Stats Dashboard**: View database statistics

### REPL (Command Line)

```bash
npm run repl
```

Interactive SQL shell for direct database queries.

## SQL Examples

### Create Tables

```sql
CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  name TEXT,
  country TEXT
)

CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title TEXT,
  author_id INTEGER,
  year INTEGER
)
```

### Insert Data

```sql
INSERT INTO authors (id, name, country) VALUES (1, 'George Orwell', 'United Kingdom')

INSERT INTO books (id, title, author_id, year) VALUES (1, '1984', 1, 1949)
```

### Select Queries

```sql
-- Select all books
SELECT * FROM books

-- Select specific columns
SELECT title, year FROM books

-- Filter by condition
SELECT * FROM books WHERE year > 1900

-- Filter with multiple conditions
SELECT title, year FROM books WHERE year > 1940 AND year < 1950
```

### JOIN Queries

```sql
-- Basic JOIN
SELECT books.title, authors.name, books.year
FROM books
JOIN authors ON books.author_id = authors.id

-- JOIN with filter
SELECT books.title, authors.name, books.year
FROM books
JOIN authors ON books.author_id = authors.id
WHERE books.year > 1945

-- JOIN with specific author
SELECT books.title, books.year
FROM books
JOIN authors ON books.author_id = authors.id
WHERE authors.name = 'George Orwell'
```

### Update Records

```sql
UPDATE books SET year = 1950 WHERE id = 1
```

### Delete Records

```sql
DELETE FROM books WHERE id = 1
```

### Drop Tables

```sql
DROP TABLE books
DROP TABLE authors
```

## Project Structure

```
simple-rdbms/
├── src/
│   ├── Database.js          # Main database interface
│   ├── parser/
│   │   └── SQLParser.js     # SQL query parser
│   ├── executor/
│   │   └── QueryExecutor.js # Query execution engine
│   ├── storage/
│   │   ├── StorageEngine.js # File I/O operations
│   │   └── Table.js         # Table management
│   ├── index/
│   │   └── IndexManager.js  # Index management
│   └── repl/
│       └── repl.js          # Interactive REPL
├── web-app/
│   ├── server.js            # Express server
│   ├── index.html           # Web UI
│   ├── app.js               # Frontend JavaScript
│   └── styles.css           # Frontend styles
├── data/                    # Database files (JSON)
└── tests/                   # Test suites
```

## API Endpoints

### Tasks

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### SQL Executor

- `POST /api/query` - Execute custom SQL query
  ```json
  {
    "sql": "SELECT * FROM tasks WHERE status = 'pending'"
  }
  ```

### Stats

- `GET /api/stats` - Get database statistics

## Running Tests

```bash
# Run JOIN tests
node tests/join-test.js
```

## Architecture

The system uses a **factory function pattern** instead of classes:

- `createDatabase()` - Main database interface
- `createStorageEngine()` - Handles file operations
- `createTable()` - Manages table data
- `createSQLParser()` - Parses SQL strings
- `createQueryExecutor()` - Executes queries
- `createIndexManager()` - Manages indexes
- `createREPL()` - Interactive shell

## Data Storage

Tables are stored as JSON files in the `data/` directory:

- `tablename.json` - Table data
- `tablename.meta.json` - Table metadata (columns, constraints)
- `tablename_columnname.idx.json` - Index files

## Supported Data Types

- `INTEGER` - Numeric values
- `TEXT` - String values

## Constraints

- `PRIMARY KEY` - Unique identifier with index
- `UNIQUE` - Unique values with index

## License

MIT
