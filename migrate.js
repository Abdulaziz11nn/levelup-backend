const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./db");

async function migrate() {
  let exitCode = 0;

  try {
    const sql = await fs.readFile(path.join(__dirname, "init.sql"), "utf8");
    await pool.query(sql);
    console.log("Database migration completed.");
  } catch (error) {
    console.error("Database migration failed:", error);
    exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (error) {
      console.error("Could not close the database pool:", error);
      exitCode = 1;
    }
  }

  process.exitCode = exitCode;
}

migrate();
