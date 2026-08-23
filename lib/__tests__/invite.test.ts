import { describe, expect, it } from "vitest";

import { normaliseInviteCode, validateSignupInput, type SignupInput } from "@/lib/invite";

const valid: SignupInput = {
  email: "alex@example.com",
  password: "pass12345",
  passwordConfirm: "pass12345",
  code: "ABCD1234",
};

describe("normaliseInviteCode", () => {
  it("upper-cases and strips separators", () => {
    expect(normaliseInviteCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(normaliseInviteCode("ab.cd_ef")).toBe("ABCDEF");
    expect(normaliseInviteCode("a b c d")).toBe("ABCD");
  });

  it("handles empty and junk input", () => {
    expect(normaliseInviteCode("")).toBe("");
    expect(normaliseInviteCode("---")).toBe("");
  });

  it("leaves an already-canonical code alone", () => {
    expect(normaliseInviteCode("ABCD1234")).toBe("ABCD1234");
  });

  // The hook stores codes against `^[A-Z0-9]{8,64}$` and normalises input with
  // its own copy of this function. If the two ever drift, valid codes stop
  // matching — so pin the shape of the output here.
  it("always produces upper-case alphanumerics only", () => {
    const messy = " a1-b2_c3.d4 e5/f6 ";
    expect(normaliseInviteCode(messy)).toMatch(/^[A-Z0-9]*$/);
  });
});

describe("validateSignupInput", () => {
  it("accepts a well-formed sign-up", () => {
    expect(validateSignupInput(valid)).toBeNull();
  });

  it("requires an email address", () => {
    expect(validateSignupInput({ ...valid, email: "  " })).toBe(
      "Please enter your email address."
    );
  });

  it("rejects an address with no usable @", () => {
    expect(validateSignupInput({ ...valid, email: "not-an-address" })).toBe(
      "Please enter a valid email address."
    );
    expect(validateSignupInput({ ...valid, email: "@example.com" })).toBe(
      "Please enter a valid email address."
    );
    expect(validateSignupInput({ ...valid, email: "alex@" })).toBe(
      "Please enter a valid email address."
    );
  });

  it("requires a password of at least eight characters", () => {
    expect(validateSignupInput({ ...valid, password: "", passwordConfirm: "" })).toBe(
      "Please choose a password."
    );
    expect(
      validateSignupInput({ ...valid, password: "short12", passwordConfirm: "short12" })
    ).toBe("Please choose a password of at least 8 characters.");
  });

  it("requires the two passwords to match", () => {
    expect(validateSignupInput({ ...valid, passwordConfirm: "different1" })).toBe(
      "The two passwords do not match."
    );
  });

  it("requires an invite code with something in it", () => {
    expect(validateSignupInput({ ...valid, code: "" })).toBe(
      "Please enter your invite code."
    );
    // Separators alone normalise away to nothing.
    expect(validateSignupInput({ ...valid, code: "----" })).toBe(
      "Please enter your invite code."
    );
  });

  it("accepts a code typed with separators", () => {
    expect(validateSignupInput({ ...valid, code: "abcd-1234" })).toBeNull();
  });
});
