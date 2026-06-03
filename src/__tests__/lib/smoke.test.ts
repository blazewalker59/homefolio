import { describe, it, expect } from "vite-plus/test";

describe("test harness", () => {
  it("runs a trivial assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
