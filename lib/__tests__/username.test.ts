import { describe, expect, it } from "vitest";

import { normaliseUsernameQuery, validateUsername } from "@/lib/username";

describe("normaliseUsernameQuery", () => {
  it("strips a leading @ and lowercases", () => {
    expect(normaliseUsernameQuery("@Bob")).toBe("bob");
    expect(normaliseUsernameQuery("@@bob")).toBe("bob");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseUsernameQuery("  BOB  ")).toBe("bob");
    expect(normaliseUsernameQuery(" @ bob ")).toBe("bob");
  });

  it("keeps underscores and digits", () => {
    expect(normaliseUsernameQuery("b_o_1")).toBe("b_o_1");
  });

  it("rejects anything that could not be a username", () => {
    expect(normaliseUsernameQuery("ab")).toBeNull();
    expect(normaliseUsernameQuery("a".repeat(21))).toBeNull();
    expect(normaliseUsernameQuery("bo b")).toBeNull();
    expect(normaliseUsernameQuery("bo-b")).toBeNull();
    expect(normaliseUsernameQuery("bob!")).toBeNull();
    expect(normaliseUsernameQuery("")).toBeNull();
  });

  it("accepts the shortest and longest allowed", () => {
    expect(normaliseUsernameQuery("abc")).toBe("abc");
    expect(normaliseUsernameQuery("a".repeat(20))).toBe("a".repeat(20));
  });
});

describe("validateUsername", () => {
  it("accepts a valid username", () => {
    expect(validateUsername("bob_1")).toBeNull();
    expect(validateUsername("@Bob")).toBeNull();
  });

  it("requires something to be entered", () => {
    expect(validateUsername("   ")).toBe("Please enter a username.");
  });

  it("explains what is wrong rather than just failing", () => {
    expect(validateUsername("ab")).toBe("Usernames need at least 3 characters.");
    expect(validateUsername("a".repeat(21))).toBe(
      "Usernames can be at most 20 characters."
    );
    expect(validateUsername("bo-b")).toBe(
      "Usernames can use letters, numbers and underscores only."
    );
  });
});
