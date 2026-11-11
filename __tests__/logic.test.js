const { calculateBmr } = require("../llmService");

describe("calculateBmr", () => {
  test("calculates BMR for a male profile", () => {
    expect(
      calculateBmr({ weightKg: 80, heightCm: 180, age: 30, sex: "male" }),
    ).toBe(1780);
  });

  test("calculates BMR for a female profile", () => {
    expect(
      calculateBmr({ weightKg: 65, heightCm: 165, age: 28, sex: "female" }),
    ).toBeCloseTo(1380.25);
  });

  test("rejects invalid profile values", () => {
    expect(() =>
      calculateBmr({ weightKg: 0, heightCm: 180, age: 30, sex: "male" }),
    ).toThrow("Invalid values for BMR calculation.");
  });
});
