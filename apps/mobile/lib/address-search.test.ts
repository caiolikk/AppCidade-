// Rodar na raiz do repositório: npx vitest run apps/mobile/lib
import { describe, expect, it } from "vitest";
import { SANTOS_SUFFIX, buildSearchQuery, formatAddressLabel } from "./address-search";

describe("buildSearchQuery", () => {
  it("ignora texto curto ou vazio", () => {
    expect(buildSearchQuery("")).toBeNull();
    expect(buildSearchQuery("  ab ")).toBeNull();
  });

  it("endereço sem cidade é procurado em Santos", () => {
    expect(buildSearchQuery("Av. Ana Costa, 300")).toBe(`Av. Ana Costa, 300${SANTOS_SUFFIX}`);
    expect(buildSearchQuery("rua  xv de novembro")).toBe(`rua xv de novembro${SANTOS_SUFFIX}`);
    // Bairro de Santos sem a cidade continua em Santos.
    expect(buildSearchQuery("Rua Azevedo Sodré, 100, Gonzaga")).toBe(`Rua Azevedo Sodré, 100, Gonzaga${SANTOS_SUFFIX}`);
  });

  it("respeita a cidade ou a UF digitada", () => {
    expect(buildSearchQuery("Praça Mauá, Santos")).toBe("Praça Mauá, Santos");
    expect(buildSearchQuery("Av. Presidente Wilson, São Vicente")).toBe("Av. Presidente Wilson, São Vicente");
    expect(buildSearchQuery("Rua X, 10 - Guarujá")).toBe("Rua X, 10 - Guarujá");
    expect(buildSearchQuery("Av. Paulista, 1000 - SP")).toBe("Av. Paulista, 1000 - SP");
    expect(buildSearchQuery("Rua das Flores, Curitiba, PR")).toBe("Rua das Flores, Curitiba, PR");
  });

  it("CEP vai formatado e sem cidade imposta", () => {
    expect(buildSearchQuery("11060001")).toBe("11060-001, Brasil");
    expect(buildSearchQuery("11060-001")).toBe("11060-001, Brasil");
  });

  it("não confunde palavras que contêm o nome de uma cidade", () => {
    // "Santista" não é "Santos": continua ganhando o sufixo.
    expect(buildSearchQuery("Rua Santista, 50")).toBe(`Rua Santista, 50${SANTOS_SUFFIX}`);
    // Duas letras no fim que não são UF (ou não são sigla isolada) não contam como estado.
    expect(buildSearchQuery("RUA XV")).toBe(`RUA XV${SANTOS_SUFFIX}`);
    expect(buildSearchQuery("Rua Oswaldo Cochrane, 12 ap")).toBe(`Rua Oswaldo Cochrane, 12 ap${SANTOS_SUFFIX}`);
  });
});

describe("formatAddressLabel", () => {
  it("monta rua, número, bairro e cidade", () => {
    expect(
      formatAddressLabel(
        { street: "Avenida Ana Costa", streetNumber: "300", district: "Gonzaga", city: "Santos" },
        "ana costa 300",
      ),
    ).toBe("Avenida Ana Costa, 300 · Gonzaga, Santos");
  });

  it("usa o nome quando não há rua e a sub-região quando não há cidade", () => {
    expect(formatAddressLabel({ name: "Praça Mauá", subregion: "Santos" }, "x")).toBe("Praça Mauá · Santos");
  });

  it("sem endereço reverso, mostra o que foi digitado", () => {
    expect(formatAddressLabel(null, "  Av. Ana Costa  ")).toBe("Av. Ana Costa");
    expect(formatAddressLabel({}, "Av. Ana Costa")).toBe("Av. Ana Costa");
  });
});
