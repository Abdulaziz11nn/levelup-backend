require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { generateChallenge, generateChallenges } = require("./llmService");
const pool = require("./db");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on("finish", () => {
    console.log(
      `${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`,
    );
  });
  next();
});
app.use(express.json());

app.get("/health", (request, response) => {
  response.json({ ok: true });
});

app.get("/api/health", (request, response) => {
  response.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/challenges", async (request, response) => {
  try {
    const result = await pool.query(
      "SELECT id, user_id, title, description, duration_min, difficulty, is_completed, created_at FROM challenges ORDER BY id",
    );
    response.json({ challenges: result.rows });
  } catch (error) {
    console.error("Challenge lookup failed:", error);
    response.status(500).json({ error: "Unable to load challenges." });
  }
});

app.post("/api/challenges", async (request, response) => {
  if (!request.body?.goal || typeof request.body.goal !== "object") {
    response.status(400).json({
      error: "A goal object is required.",
    });
    return;
  }

  try {
    const challenges = await generateChallenges({ goal: request.body.goal });
    const client = await pool.connect();
    const savedChallenges = [];
    try {
      await client.query("BEGIN");
      for (const challenge of challenges) {
        const result = await client.query(
          "INSERT INTO challenges (title, description, duration_min, difficulty, is_completed) VALUES ($1, $2, $3, $4, $5) RETURNING id, is_completed",
          [
            challenge.title,
            challenge.description,
            challenge.duration_min ?? null,
            challenge.difficulty,
            Boolean(challenge.done),
          ],
        );
        savedChallenges.push({
          ...challenge,
          id: result.rows[0].id,
          done: result.rows[0].is_completed,
        });
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    response.json(savedChallenges);
  } catch (error) {
    console.error("Challenge generation or save failed:", error);
    response.status(500).json({
      error: "Challenge generation or save failed.",
    });
  }
});

app.post("/api/challenge", async (request, response) => {
  const { goal, level } = request.body ?? {};
  if (
    typeof goal !== "string" ||
    !goal.trim() ||
    typeof level !== "string" ||
    !level.trim()
  ) {
    response.status(400).json({
      error: "goal and level are required (strings)",
    });
    return;
  }

  try {
    const challenge = await generateChallenge(goal, level);
    const result = await pool.query(
      "INSERT INTO challenges (title, description, duration_min, difficulty) VALUES ($1, $2, $3, $4) RETURNING id, is_completed, created_at",
      [
        challenge.title,
        challenge.description,
        challenge.duration_min,
        challenge.difficulty,
      ],
    );
    response.json({
      challenge: { ...challenge, ...result.rows[0] },
    });
  } catch (error) {
    console.error("Challenge generation or save failed:", error);
    response.status(502).json({
      error: error instanceof Error ? error.message : "Challenge generation failed.",
    });
  }
});

app.patch("/api/challenges/:id", async (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    response.status(400).json({ error: "A valid challenge ID is required." });
    return;
  }

  try {
    const result = await pool.query(
      "UPDATE challenges SET is_completed = TRUE WHERE id = $1 RETURNING id, user_id, title, description, duration_min, difficulty, is_completed, created_at",
      [id],
    );
    if (result.rowCount === 0) {
      response.status(404).json({ error: "Challenge not found." });
      return;
    }
    response.json({ challenge: result.rows[0] });
  } catch (error) {
    console.error("Challenge update failed:", error);
    response.status(500).json({ error: "Unable to update challenge." });
  }
});

if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`LEVELUP backend listening on port ${port}.`);
  });
}

module.exports = app;
