import { describe, expect, it } from "vitest";
import { answersMatch, describeRequest, mockDraft, normalizeAnswer } from "../pack-helper";

describe("pack helper", () => {
  it("matches answers the way a parent would", () => {
    expect(normalizeAnswer("The T. rex!")).toBe("t rex");
    expect(answersMatch(["Triceratops"], "a triceratops")).toBe(true);
    expect(answersMatch(["tiny arms", "small arms"], "Small arms")).toBe(true);
    expect(answersMatch(["birds"], "a bird")).toBe(true);
    expect(answersMatch(["eggs"], "they laid eggs")).toBe(true);
    expect(answersMatch(["birds"], "crocodiles")).toBe(false);
    expect(answersMatch(["Triceratops"], "")).toBe(false);
  });

  it("tells the writer who's playing and how many of each", () => {
    const text = describeRequest({
      request: "My kids are 6 and 8 and learning about dinosaurs",
      count: 6,
      kind: "mixed",
      players: [
        { name: "Mom", role: "parent", gradeBand: null },
        { name: "Ava", role: "kid", gradeBand: "K-2" },
        { name: "Leo", role: "kid", gradeBand: "3-5" },
      ],
    });
    expect(text).toContain("Ava (grades K-2), Leo (grades 3-5)");
    expect(text).toContain("exactly 6 items, about half trivia questions and half riddles");
  });

  it("mock drafts respect the kind and count", () => {
    expect(mockDraft({ request: "x", count: 2, kind: "riddle", players: [] }).questions.map((q) => q.kind)).toEqual(["riddle", "riddle"]);
    expect(mockDraft({ request: "x", count: 6, kind: "mixed", players: [] }).questions).toHaveLength(6);
  });
});
