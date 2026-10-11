import { describe, expect, it } from "vitest";
import { decodeText, encodeText } from "./text";

describe("plain-text protocol", () => {
  it("round trips Unicode, separators, nulls, lists and nested records", () => {
    const value = {
      title: "සිංහල தமிழ் 🚗\tA|B\\C\nD\rE",
      empty: "",
      absent: null,
      events: [{ active: true, amount: 1200.25 }],
      omitted: undefined,
    };
    expect(decodeText(encodeText(value))).toEqual({
      ...value,
      omitted: undefined,
    });
    expect(encodeText(value)).not.toContain("omitted");
  });
  it.each([
    "{}",
    "TRAVELER-TEXT-1\nlist\t1\n",
    "TRAVELER-TEXT-1\nboolean\tyes\n",
    "TRAVELER-TEXT-1\nobject\t2\nkey\tx\nnull\nkey\tx\nnull\n",
    "TRAVELER-TEXT-1\nstring\tbad\\x\n",
    "TRAVELER-TEXT-1\nnull\nnull\n",
    "TRAVELER-TEXT-1\nlist\t-1\n",
    "TRAVELER-TEXT-1\nnumber\tNaN\n",
  ])("rejects malformed input %s", (text) =>
    expect(() => decodeText(text)).toThrow(),
  );
  it("does not let incoming field names modify object prototypes", () => {
    const text = "TRAVELER-TEXT-1\nobject\t1\nkey\t__proto__\nstring\tvalue\n";
    const value = decodeText<Record<string, unknown>>(text);
    expect(Object.getPrototypeOf(value)).toBeNull();
    expect(value.__proto__).toBe("value");
  });
});
