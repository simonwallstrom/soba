import { describe, expect, test } from "bun:test";

import { profileFromAnswers } from "./clef";

function response(overrides: Record<string, unknown> = {}) {
  return {
    model: "clef",
    answers: {
      isDinner: { type: "noul", noul: 0.94 },
      base: { type: "choice", choice: "pasta", probabilities: {}, confidence: 0.9 },
      protein: { type: "choice", choice: "pork", probabilities: {}, confidence: 0.8 },
      effort: { type: "score", score: 0.4, legend: {}, probabilities: {}, confidence: 0.7 },
      isTreat: { type: "noul", noul: 0.12 },
      ...overrides,
    },
    usage: { input_tokens: 812, output_tokens: 5 },
  };
}

function effort(score: number) {
  return profileFromAnswers(response({ effort: { type: "score", score } }))?.effort;
}

describe("profileFromAnswers", () => {
  test("turns Clef's answers into a profile", () => {
    expect(profileFromAnswers(response())).toEqual({
      isDinner: true,
      base: "pasta",
      protein: "pork",
      effort: "quick",
      isTreat: false,
    });
  });

  test("takes the nearest effort level for a score between levels", () => {
    expect(effort(0.6)).toBe("normal");
    expect(effort(1.7)).toBe("involved");
  });

  test("keeps a doubtful dinner, but only a clear treat", () => {
    const doubtful = { type: "noul", noul: 0.45 };
    expect(profileFromAnswers(response({ isDinner: doubtful }))?.isDinner).toBe(true);
    expect(profileFromAnswers(response({ isTreat: doubtful }))?.isTreat).toBe(false);
    const sure = { type: "noul", noul: 0.9 };
    expect(profileFromAnswers(response({ isTreat: sure }))?.isTreat).toBe(true);
  });

  test("rejects answers outside the options it asked about", () => {
    expect(profileFromAnswers(response({ base: { type: "choice", choice: "quinoa" } }))).toBeNull();
    expect(profileFromAnswers({ answers: {} })).toBeNull();
  });
});
