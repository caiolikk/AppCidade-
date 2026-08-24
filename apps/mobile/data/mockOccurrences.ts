import { statusColors } from "../theme";

export type OccurrenceStatus = keyof typeof statusColors;

export type Occurrence = {
  id: string;
  title: string;
  address: string;
  category: string;
  reportedAgo: string;
  evaluations: number;
  status: OccurrenceStatus;
  tag?: string;
  photoTone: string;
};

export const FILTERS = [
  "Todos",
  "Infraestrutura",
  "Iluminação",
  "Segurança",
  "Limpeza",
  "Sinalização",
];

export const CURRENT_USER = {
  city: "Santos",
  neighborhood: "Ponta da Praia",
};

export const OCCURRENCES: Occurrence[] = [
  {
    id: "1",
    title: "Buraco na calçada",
    address: "Av. Ana Costa 453",
    category: "Infraestrutura",
    reportedAgo: "2h",
    evaluations: 12,
    status: "RESOLVIDA",
    tag: "Problema persistente",
    photoTone: "#C8C8C8",
  },
  {
    id: "2",
    title: "Poste queimado",
    address: "Rua Goiás 210",
    category: "Iluminação",
    reportedAgo: "5h",
    evaluations: 8,
    status: "EM_ATENDIMENTO",
    photoTone: "#BDBDBD",
  },
  {
    id: "3",
    title: "Calçada irregular",
    address: "Av. Conselheiro Nébias 90",
    category: "Infraestrutura",
    reportedAgo: "1d",
    evaluations: 4,
    status: "EM_ANALISE",
    photoTone: "#D0D0D0",
  },
  {
    id: "4",
    title: "Sinalização apagada",
    address: "Av. da Praia 1200",
    category: "Segurança",
    reportedAgo: "3h",
    evaluations: 6,
    status: "RECEBIDA",
    photoTone: "#BEBEBE",
  },
  {
    id: "5",
    title: "Buraco no asfalto",
    address: "Rua Bolívia 55",
    category: "Infraestrutura",
    reportedAgo: "8h",
    evaluations: 15,
    status: "RESOLVIDA",
    photoTone: "#C4C4C4",
  },
  {
    id: "6",
    title: "Lâmpada apagada",
    address: "Rua Paraná 330",
    category: "Iluminação",
    reportedAgo: "12h",
    evaluations: 3,
    status: "REPORTADA",
    photoTone: "#CBCBCB",
  },
  {
    id: "7",
    title: "Ponto sem acessibilidade",
    address: "Av. Vicente de Carvalho 80",
    category: "Infraestrutura",
    reportedAgo: "2d",
    evaluations: 9,
    status: "EM_ANALISE",
    photoTone: "#C0C0C0",
  },
  {
    id: "8",
    title: "Semáforo intermitente",
    address: "Av. Bartolomeu de Gusmão 40",
    category: "Segurança",
    reportedAgo: "4h",
    evaluations: 11,
    status: "EM_ATENDIMENTO",
    photoTone: "#B8B8B8",
  },
  {
    id: "9",
    title: "Meio-fio quebrado",
    address: "Rua Amazonas 18",
    category: "Infraestrutura",
    reportedAgo: "6h",
    evaluations: 2,
    status: "RESOLVIDA",
    photoTone: "#CECECE",
  },
  {
    id: "10",
    title: "Praça sem iluminação",
    address: "Praça Silvio Romero",
    category: "Iluminação",
    reportedAgo: "1d",
    evaluations: 7,
    status: "RECEBIDA",
    photoTone: "#C6C6C6",
  },
  {
    id: "11",
    title: "Tampa de bueiro solta",
    address: "Rua Cuba 77",
    category: "Segurança",
    reportedAgo: "9h",
    evaluations: 10,
    status: "REPORTADA",
    photoTone: "#B6B6B6",
  },
  {
    id: "12",
    title: "Rampa danificada",
    address: "Av. Pres. Wilson 500",
    category: "Infraestrutura",
    reportedAgo: "3d",
    evaluations: 5,
    status: "ARQUIVADA",
    photoTone: "#D2D2D2",
  },
];
