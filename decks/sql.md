---
schema: 1
topic: sql
---

### written
Is SQL a declarative or an imperative language?
- answer: declarative
- explain: You describe the result you want, and the query planner decides how to get it (which indexes, join order and algorithms to use).

### multiple
What is SQL typically used for?
- correct: Querying data in relational databases | Defining tables and schemas | Managing access permissions
- wrong: Laying out web pages | Training neural networks
- explain: SQL covers querying (SELECT), changing data (DML), defining the schema (DDL) and permissions (DCL: GRANT and REVOKE).

### written
Which clause does SQL evaluate first: `SELECT`, `FROM` or `WHERE`?
- answer: FROM
- explain: The logical order is FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT, which is why WHERE cannot use a SELECT alias but ORDER BY can.

### written
Which clause filters groups after `GROUP BY`?
- answer: HAVING
- explain: WHERE filters rows before grouping and cannot use aggregates; HAVING filters groups after aggregation, e.g. HAVING COUNT(*) > 5.

### truefalse
`WHERE x = NULL` returns the rows where `x` is NULL.
- answer: false
- explain: Any comparison with NULL yields UNKNOWN (three-valued logic), and WHERE keeps only TRUE rows; use IS NULL.

### written
Table `t` has 5 rows, and column `x` is NULL in 2 of them. What does this return?
```sql
SELECT COUNT(x) FROM t;
```
- answer: 3
- explain: COUNT(column) skips NULLs while COUNT(*) counts rows (5 here); SUM, AVG, MIN and MAX ignore NULLs too.

### written
Table `emp` has 10 employees spread over 3 departments. How many rows does this return?
```sql
SELECT dept, COUNT(*) FROM emp GROUP BY dept;
```
- answer: 3
- explain: GROUP BY produces one output row per distinct group, and every selected column must be either grouped or aggregated.

### multiple
Which of these are DML statements?
- correct: INSERT | UPDATE | DELETE
- wrong: CREATE TABLE | DROP TABLE
- explain: DML changes the data in tables; DDL (CREATE, ALTER, DROP) changes the schema itself.

### written
Which join returns only the rows that have a match in both tables?
- answer: INNER JOIN | inner | JOIN | inner joins
- explain: INNER JOIN keeps matching pairs only; LEFT JOIN also keeps unmatched rows from the left table and fills the right side with NULLs.

### written
A column (or set of columns) that uniquely identifies each row in a table is called the ___ key.
- answer: primary
- explain: A primary key must be unique and NOT NULL, a table has at most one, and most databases index it automatically.

### written
A column that references the primary key of another table is called a ___ key.
- answer: foreign
- explain: The database rejects values that do not exist in the referenced table (referential integrity) and can cascade deletes and updates.

### truefalse
Adding an index speeds up both reads and writes on a table.
- answer: false
- explain: An index (usually a B-tree) speeds up lookups, joins and sorting on its columns, but every INSERT, UPDATE and DELETE must also update it, and it takes space.

### written
What does the I in ACID stand for?
- answer: Isolation
- explain: Concurrent transactions do not see each other's uncommitted changes; the isolation level (e.g. READ COMMITTED or SERIALIZABLE) trades strictness for concurrency.

### written
Which statement makes all the changes in the current transaction permanent?
- answer: COMMIT
- explain: Changes between BEGIN and COMMIT take effect together; ROLLBACK discards all of them (atomicity).

### written
What is the attack called where user input is concatenated into a query string and ends up executed as SQL?
- answer: SQL injection | injection | SQLi
- explain: Prevent it with parameterised queries (placeholders), so input is always sent as data and never parsed as SQL.

### truefalse
Without `ORDER BY`, SQL returns rows in the order they were inserted.
- answer: false
- explain: Tables are unordered sets, so row order depends on the execution plan (indexes, parallelism) and can change between runs.

### written
Restructuring tables to remove redundancy and update anomalies is called ___.
- answer: normalization | normalisation | database normalization | database normalisation
- explain: In 3NF, every non-key column depends on the key, the whole key and nothing but the key; denormalising trades redundancy for fewer joins.

### multiple
Which of these are aggregate functions?
- correct: COUNT | SUM | AVG | MAX
- wrong: UPPER | COALESCE
- explain: Aggregates collapse many rows into one value (per group); UPPER and COALESCE are scalar functions applied to each row.

### written
Which keyword removes duplicate rows from a SELECT result?
- answer: DISTINCT | SELECT DISTINCT
- explain: DISTINCT applies to the whole selected row, not to one column; similarly, UNION removes duplicates while UNION ALL keeps them and is cheaper.

### written
Which command shows how the database plans to execute a query?
- answer: EXPLAIN | EXPLAIN ANALYZE | EXPLAIN QUERY PLAN
- explain: EXPLAIN shows the chosen plan (e.g. index scan vs full table scan, join method); in PostgreSQL, EXPLAIN ANALYZE also runs the query and reports real timings.
