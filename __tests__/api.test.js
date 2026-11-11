jest.mock("../llmService", () => ({
  generateChallenge: jest.fn(),
  generateChallenges: jest.fn(),
}));

jest.mock("../db", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const app = require("../server");
const { generateChallenge } = require("../llmService");
const pool = require("../db");

describe("POST /api/challenge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("generates and saves a challenge", async () => {
    generateChallenge.mockResolvedValue({
      title: "Take a walk",
      description: "Walk outside for 15 minutes.",
      duration_min: 15,
      difficulty: "easy",
    });
    pool.query.mockResolvedValue({
      rows: [{ id: 12, is_completed: false, created_at: "2026-11-08T12:00:00Z" }],
    });

    const response = await request(app)
      .post("/api/challenge")
      .send({ goal: "Be more active", level: "beginner" });

    expect([200, 201]).toContain(response.status);
    expect(response.body.challenge).toMatchObject({
      title: "Take a walk",
      description: "Walk outside for 15 minutes.",
      duration_min: 15,
      difficulty: "easy",
      id: 12,
    });
    expect(generateChallenge).toHaveBeenCalledWith("Be more active", "beginner");
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO challenges"),
      ["Take a walk", "Walk outside for 15 minutes.", 15, "easy"],
    );
  });
});
