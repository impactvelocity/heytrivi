import { describe, expect, it } from "vitest";
import { MASK, findPhrases, maskArgs, maskText } from "../mask";
import { fixName } from "../speech";

describe("name mishearings (R10.10)", () => {
  it("maps common mishearings to Hey Trivi", () => {
    expect(fixName("hey trivia let's play")).toBe("Hey Trivi let's play");
    expect(fixName("Hey Trevi, for the garbage")).toBe("Hey Trivi, for the garbage");
    expect(fixName("a trivi what's the score")).toBe("Hey Trivi what's the score");
    expect(fixName("Alexa, a trivia, quiz us")).toBe("Alexa, Hey Trivi, quiz us");
    expect(fixName("let's play hey tree vee")).toBe("let's play Hey Trivi");
  });
  it("leaves ordinary words alone", () => {
    expect(fixName("ask us a trivia question")).toBe("ask us a trivia question");
    expect(fixName("that was a fun trivia night")).toBe("that was a fun trivia night");
  });
});

describe("parent phrase masking (R13.6)", () => {
  it("masks parentPhrase arguments anywhere in a message", () => {
    const msg = { method: "tools/call", params: { name: "spend_points", arguments: { player: "Sally", parentPhrase: "purple pancakes" } } };
    expect(maskArgs(msg).params.arguments).toEqual({ player: "Sally", parentPhrase: MASK });
    expect(msg.params.arguments.parentPhrase).toBe("purple pancakes");
    const found = new Set<string>();
    findPhrases(msg, found);
    expect([...found]).toEqual(["purple pancakes"]);
  });
  it("masks the phrase in free text ignoring case and punctuation", () => {
    expect(maskText("Mom: Purple, pancakes!", ["purple pancakes"])).toBe(`Mom: ${MASK}`);
    expect(maskText("I like purple and pancakes", ["purple pancakes"])).toBe("I like purple and pancakes");
  });
});
