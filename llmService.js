const XP_BY_DIFFICULTY = {
  Easy: 10,
  Medium: 20,
  Hard: 30,
};
const GROQ_MODEL = "openai/gpt-oss-120b";
const GOAL_CATEGORY_TERMS = {
  fitness: ["fitness", "exercise", "workout", "nutrition"],
  book: ["book", "reading", "read", "literature"],
  finance: ["finance", "budget", "savings", "spending", "money"],
  habit: ["habit", "quit", "recovery", "craving"],
};

function findGoalCategoryMismatches(challenges, goalType) {
  const allowedTerms = GOAL_CATEGORY_TERMS[goalType];
  return challenges.filter((challenge) => {
    const categoryTerms = challenge.category.toLowerCase().split(/[^a-z0-9]+/);
    return !allowedTerms.some((term) => categoryTerms.includes(term));
  });
}

function parseChallenges(content) {
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("The LLM returned an empty response.");
  }

  let jsonText = content.trim();
  const fencedJson = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedJson) {
    jsonText = fencedJson[1].trim();
  } else if (!jsonText.startsWith("[")) {
    const start = jsonText.indexOf("[");
    const end = jsonText.lastIndexOf("]");
    if (start !== -1 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }
  }

  let challenges;
  try {
    challenges = JSON.parse(jsonText);
  } catch {
    throw new Error("The LLM returned invalid JSON.");
  }

  if (!Array.isArray(challenges) || challenges.length < 4 || challenges.length > 6) {
    throw new Error("The LLM response must be an array of 4 to 6 challenges.");
  }

  const valid = challenges.every((challenge) => {
    return (
      challenge !== null &&
      typeof challenge === "object" &&
      !Array.isArray(challenge) &&
      Number.isInteger(challenge.id) &&
      typeof challenge.category === "string" &&
      challenge.category.trim() !== "" &&
      typeof challenge.title === "string" &&
      challenge.title.trim() !== "" &&
      typeof challenge.description === "string" &&
      challenge.description.trim() !== "" &&
      Object.hasOwn(XP_BY_DIFFICULTY, challenge.difficulty) &&
      challenge.xp === XP_BY_DIFFICULTY[challenge.difficulty] &&
      challenge.done === false
    );
  });

  if (!valid) {
    throw new Error("The LLM response contains a challenge with an invalid format.");
  }

  return challenges;
}

function calculateBmr({ weightKg, heightCm, age, sex }) {
  const normalizedSex = String(sex || "").toLowerCase();
  if (
    ![weightKg, heightCm, age].every(
      (value) => Number.isFinite(value) && value > 0,
    ) ||
    !["male", "female"].includes(normalizedSex)
  ) {
    throw new Error("Invalid values for BMR calculation.");
  }

  return (
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (normalizedSex === "male" ? 5 : -161)
  );
}

async function generateChallenges(userData) {
  const provider = process.env.LLM_PROVIDER || "groq";
  if (provider !== "groq") {
    throw new Error(`Unsupported LLM provider: ${provider}.`);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const goal = userData?.goal;
  if (!goal || typeof goal !== "object" || Array.isArray(goal)) {
    throw new Error("A goal object is required.");
  }

  let goalInstruction;
  let goalContext = { ...goal };

  if (goal.type === "fitness") {
    const currentWeightKg = Number(goal.currentWeightKg);
    const targetWeightKg = Number(goal.targetWeightKg);
    const heightCm = Number(goal.heightCm);
    const age = Number(goal.age);
    const deadlineWeeks = Number(goal.deadlineWeeks);
    const sex = String(goal.sex || "").toLowerCase();
    const activityLevel = String(goal.activityLevel || "").toLowerCase();
    const activityFactors = { low: 1.2, medium: 1.55, high: 1.725 };

    if (
      ![currentWeightKg, targetWeightKg, heightCm, age, deadlineWeeks].every(
        (value) => Number.isFinite(value) && value > 0,
      ) ||
      !["male", "female"].includes(sex) ||
      !Object.hasOwn(activityFactors, activityLevel)
    ) {
      throw new Error("The fitness goal contains invalid values.");
    }

    const bmr = calculateBmr({
      weightKg: currentWeightKg,
      heightCm,
      age,
      sex,
    });
    const dailyCalories = Math.round(bmr * activityFactors[activityLevel]);
    goalContext = {
      ...goalContext,
      bmrCaloriesPerDay: Math.round(bmr),
      estimatedDailyCalories: dailyCalories,
    };
    goalInstruction =
      "Fitness goal: every challenge must strictly relate to this fitness goal and be a specific, measurable, safe one-day fitness, exercise, or nutrition action; do not include reading, finance, or unrelated tasks. Use only FITNESS, EXERCISE, WORKOUT, or NUTRITION as categories. Use the computed BMR and estimated daily calories as context; do not claim these are a prescription. This is not medical advice.";
  } else if (goal.type === "book") {
    const totalPages = Number(goal.totalPages);
    const deadlineDays = Number(goal.deadlineDays);
    if (
      typeof goal.bookTitle !== "string" ||
      !goal.bookTitle.trim() ||
      ![totalPages, deadlineDays].every((value) => Number.isFinite(value) && value > 0)
    ) {
      throw new Error("The book goal contains invalid values.");
    }

    goalContext = {
      ...goalContext,
      pagesPerDay: Number((totalPages / deadlineDays).toFixed(2)),
    };
    goalInstruction =
      "Book goal: every challenge must strictly relate to reading the named book or supporting the reading goal: reading pages, notes, summarizing, reflection on the book, distraction-free reading time, or a reading habit. All actions must be specific, measurable, and doable in one day. Do not include fitness, steps, or any unrelated tasks. Use only BOOK, READING, READ, or LITERATURE as categories. Use the computed pages per day as the reading target.";
  } else if (goal.type === "finance") {
    if (
      !Number.isFinite(Number(goal.monthlyIncome)) ||
      Number(goal.monthlyIncome) <= 0 ||
      !Number.isFinite(Number(goal.savingsGoal)) ||
      Number(goal.savingsGoal) <= 0 ||
      typeof goal.mainSpendingProblem !== "string" ||
      !goal.mainSpendingProblem.trim()
    ) {
      throw new Error("The finance goal contains invalid values.");
    }
    goalInstruction =
      "Finance goal: every challenge must strictly relate to this finance goal and be a specific, measurable one-day budgeting, spending-awareness, or savings action tailored to the stated spending problem and savings goal; do not include fitness, reading, or unrelated tasks. Use only FINANCE, BUDGET, SAVINGS, SPENDING, or MONEY as categories. Avoid guarantees and investment recommendations. This is not financial advice.";
  } else if (goal.type === "habit") {
    if (
      typeof goal.habitName !== "string" ||
      !goal.habitName.trim() ||
      !Number.isFinite(Number(goal.daysClean)) ||
      Number(goal.daysClean) < 0 ||
      typeof goal.reason !== "string" ||
      !goal.reason.trim()
    ) {
      throw new Error("The habit goal contains invalid values.");
    }
    goalInstruction =
      "Habit goal: every challenge must strictly relate to quitting or avoiding the named habit or directly supporting recovery, cravings management, or the user's reason for quitting; do not include fitness, reading, finance, or unrelated tasks. All actions must be specific, measurable, and doable in one day. Use only HABIT, QUIT, RECOVERY, or CRAVING as categories. Be encouraging and nonjudgmental.";
  } else {
    throw new Error("Unsupported goal type.");
  }

  const prompt = [
    "Create 4 to 6 personalized daily challenges using the user's information below.",
    "Every challenge must be specific, measurable, and doable in one day.",
    "Return only a valid JSON array with no prose or markdown.",
    'Each item must have exactly these fields: {"id": number, "category": string, "title": string, "description": string, "difficulty": "Easy" | "Medium" | "Hard", "xp": number, "done": false}.',
    "Use xp 10 for Easy, 20 for Medium, and 30 for Hard.",
    goalInstruction,
    "User goal and calculated context:",
    JSON.stringify(goalContext),
  ].join("\n");

  let requestPrompt = prompt;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || GROQ_MODEL,
        messages: [{ role: "user", content: requestPrompt }],
        temperature: 0.7,
      }),
    });

  if (!response.ok) {
    const responseBody = await response.text();
    const safeResponseBody = apiKey
      ? responseBody.replaceAll(apiKey, "[REDACTED]")
      : responseBody;
    throw new Error(
      `Groq API request failed with status ${response.status}: ${
        safeResponseBody || "No response body."
      }`,
    );
  }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    const challenges = parseChallenges(content);
    const mismatches = findGoalCategoryMismatches(challenges, goal.type);

    if (mismatches.length === 0) {
      return challenges;
    }

    requestPrompt = `${prompt}\nThe previous response used categories that did not match the selected goal. Regenerate every challenge strictly for this goal and use only the goal-specific categories listed above.`;
  }

  throw new Error("The LLM returned challenge categories unrelated to the selected goal.");
}

async function generateChallenge(goal, level) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const systemPrompt = [
    "Return STRICTLY valid JSON with fields: title (string), description (string), duration_min (number), difficulty (string, one of: easy/medium/hard). No markdown, no code fences.",
    "Generate one practical, safe, achievable challenge based on the user's goal and level.",
  ].join(" ");
  let userPrompt = JSON.stringify({ goal, level });
  let lastParseError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API request failed with status ${response.status}.`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    try {
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("The LLM returned an empty response.");
      }

      const parsed = JSON.parse(content);
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        typeof parsed.title !== "string" ||
        !parsed.title.trim() ||
        typeof parsed.description !== "string" ||
        !parsed.description.trim() ||
        typeof parsed.duration_min !== "number" ||
        parsed.duration_min <= 0 ||
        !["easy", "medium", "hard"].includes(parsed.difficulty)
      ) {
        throw new Error("The LLM returned a challenge with an invalid format.");
      }

      return {
        title: parsed.title.trim(),
        description: parsed.description.trim(),
        duration_min: parsed.duration_min,
        difficulty: parsed.difficulty,
      };
    } catch (error) {
      lastParseError = error;
      if (attempt === 0) {
        userPrompt = `${JSON.stringify({ goal, level })}\nReturn ONLY JSON.`;
      }
    }
  }

  throw new Error(
    `The LLM did not return a valid challenge after two attempts: ${lastParseError.message}`,
  );
}

module.exports = { calculateBmr, generateChallenge, generateChallenges };
