import { describe, expect, it } from "vitest";
import { formatSize, cn } from "./utils";

describe("file manager utilities", () => {
  it("formats file sizes for the list", () => {
    expect(formatSize(0)).toBe("0 KB");
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("merges utility classes", () => {
    expect(cn("px-2", "px-4", "text-sm")).toContain("px-4");
    expect(cn("px-2", "px-4")).not.toContain("px-2");
  });
});
