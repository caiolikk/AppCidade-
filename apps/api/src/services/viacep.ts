import { HttpError } from "../utils/http-error.js";
import { onlyDigits } from "../utils/digits.js";
import { normalizeNeighborhood } from "../utils/normalize-neighborhood.js";

export type ViaCepAddress = {
  cep: string;
  city: string;
  uf: string;
  neighborhood: string;
  normalizedNeighborhood: string;
};

type ViaCepResponse = {
  erro?: boolean | string;
  cep?: string;
  uf?: string;
  localidade?: string;
  bairro?: string;
};

const VIACEP_TIMEOUT_MS = 8000;

export async function lookupSantosCep(cepInput: string): Promise<ViaCepAddress> {
  const cep = onlyDigits(cepInput);

  if (cep.length !== 8) {
    throw new HttpError(400, "CEP deve ter 8 dígitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    signal: AbortSignal.timeout(VIACEP_TIMEOUT_MS),
  }).catch(() => {
    throw new HttpError(503, "Não foi possível consultar o CEP agora. Tente novamente.");
  });

  if (!response.ok) {
    throw new HttpError(503, "Não foi possível consultar o CEP agora. Tente novamente.");
  }

  const data = (await response.json()) as ViaCepResponse;

  if (data.erro === true || data.erro === "true") {
    throw new HttpError(400, "CEP não encontrado.");
  }

  const uf = (data.uf ?? "").trim().toUpperCase();
  const city = (data.localidade ?? "").trim();
  const neighborhood = (data.bairro ?? "").trim();

  if (uf !== "SP") {
    throw new HttpError(400, "O Cidade+ atende apenas o município de Santos/SP.");
  }

  if (normalizeNeighborhood(city) !== "santos") {
    throw new HttpError(400, "O Cidade+ atende apenas o município de Santos/SP.");
  }

  if (!neighborhood) {
    throw new HttpError(400, "Não foi possível identificar o bairro deste CEP.");
  }

  return {
    cep,
    city,
    uf,
    neighborhood,
    normalizedNeighborhood: normalizeNeighborhood(neighborhood),
  };
}
