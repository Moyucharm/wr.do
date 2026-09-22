import { describe, expect, it } from "vitest";

import { extractVerificationCode } from "./verification-code";

type VerificationInput = Parameters<typeof extractVerificationCode>[0];

describe("extractVerificationCode", () => {
  it.each<[VerificationInput, string]>([
    [{ subject: "Your verification code is 483920" }, "483920"],
    [{ text: "Your verification code is KQZTMR" }, "KQZTMR"],
    [{ text: "Authentication code: A1B2C3" }, "A1B2C3"],
    [{ html: "<p>Confirmation code: <b>KFG-5XE</b></p>" }, "KFG-5XE"],
    [{ text: "你的验证码：KQZTMR" }, "KQZTMR"],
    [{ text: "123456 is your verification code" }, "123456"],
  ])("extracts a contextual code from %o", (input, expected) => {
    expect(extractVerificationCode(input)).toBe(expected);
  });

  it("prefers a subject candidate over body candidates", () => {
    expect(
      extractVerificationCode({
        subject: "Security code: Subject9",
        text: "Security code: Body123",
        html: "<p>Security code: Html456</p>",
      }),
    ).toBe("Subject9");
  });

  it("recognizes context split across HTML tags", () => {
    expect(
      extractVerificationCode({
        html: "<p>Confirmation <strong>code</strong>: <b>KFG-5XE</b></p>",
      }),
    ).toBe("KFG-5XE");
  });

  it.each<[string, VerificationInput]>([
    ["empty input", {}],
    ["no code context", { subject: "WELCOME 2026", text: "Order 123456" }],
    [
      "CSS content",
      {
        html: "<style>.verification-code { color: #A1B2C3; }</style><p>Welcome</p>",
      },
    ],
    [
      "script content",
      {
        html: "<script>window.otp = '483920';</script><p>Welcome</p>",
      },
    ],
    [
      "URL path and query",
      { text: "Verification code: https://example.com/A1B2C3?otp=483920" },
    ],
    ["email address", { text: "Verification code: A1B2C3@example.com" }],
    [
      "timestamp",
      { text: "Verification code expires at 2026-09-22T12:34:56Z" },
    ],
    [
      "more than ten effective characters",
      { text: "Verification code: ABCDEFGHIJK" },
    ],
    [
      "digits embedded in a longer token",
      { text: "Verification code: prefix123456suffix" },
    ],
    [
      "verification-link-only template",
      {
        html: '<h2>Verify Your Email</h2><p>Please verify your email address by clicking the button below.</p><a href="https://example.com/verify?token=abc123456">Verify Email Now</a>',
      },
    ],
  ])("returns null for %s", (_description, input) => {
    expect(extractVerificationCode(input)).toBeNull();
  });
});
