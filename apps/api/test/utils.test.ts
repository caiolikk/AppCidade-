import { describe, expect, it } from "vitest";
import { onlyDigits } from "../src/utils/digits.js";
import { normalizeNeighborhood } from "../src/utils/normalize-neighborhood.js";

describe("normalizeNeighborhood", () => {
  it("remove acentos e padroniza espaços", () => {
    expect(normalizeNeighborhood("  Ponta da Praia  ")).toBe("ponta da praia");
    expect(normalizeNeighborhood("Gonzaga")).toBe("gonzaga");
  });
});

describe("onlyDigits", () => {
  it("mantém só números", () => {
    expect(onlyDigits("11030-000")).toBe("11030000");
    expect(onlyDigits("529.982.247-25")).toBe("52998224725");
  });
});
