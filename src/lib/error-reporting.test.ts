import { describe, expect, it, beforeEach } from "vitest";
import {
  buildAppErrorReport,
  clearRecentAppErrors,
  peekRecentAppErrors,
  reportAppError,
} from "./error-reporting";

describe("reportAppError", () => {
  beforeEach(() => {
    clearRecentAppErrors();
  });

  it("builds structured reports", () => {
    const report = buildAppErrorReport(new Error("boom"), { boundary: "test" });
    expect(report.message).toBe("boom");
    expect(report.context.boundary).toBe("test");
    expect(report.environment).toBe("server");
  });

  it("buffers recent reports", () => {
    reportAppError(new Error("one"), { id: 1 });
    reportAppError(new Error("two"), { id: 2 });
    const recent = peekRecentAppErrors();
    expect(recent[0]?.message).toBe("two");
    expect(recent[1]?.message).toBe("one");
  });
});
