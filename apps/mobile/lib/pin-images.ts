// GERADO por scripts/generate-pins.ps1 - nao edite a mao.
// Pins do mapa pre-renderizados (categoria x status x normal/selecionado).
// require() de imagem local devolve um id numerico (aceito por Marker.image e Image.source).

export const PIN_IMAGES: Record<string, number> = {
  "infraestrutura/analise": require("../assets/pins/pin-infraestrutura-analise.png"),
  "infraestrutura/analise-sel": require("../assets/pins/pin-infraestrutura-analise-sel.png"),
  "infraestrutura/andamento": require("../assets/pins/pin-infraestrutura-andamento.png"),
  "infraestrutura/andamento-sel": require("../assets/pins/pin-infraestrutura-andamento-sel.png"),
  "infraestrutura/resolvido": require("../assets/pins/pin-infraestrutura-resolvido.png"),
  "infraestrutura/resolvido-sel": require("../assets/pins/pin-infraestrutura-resolvido-sel.png"),
  "infraestrutura/negado": require("../assets/pins/pin-infraestrutura-negado.png"),
  "infraestrutura/negado-sel": require("../assets/pins/pin-infraestrutura-negado-sel.png"),
  "limpeza/analise": require("../assets/pins/pin-limpeza-analise.png"),
  "limpeza/analise-sel": require("../assets/pins/pin-limpeza-analise-sel.png"),
  "limpeza/andamento": require("../assets/pins/pin-limpeza-andamento.png"),
  "limpeza/andamento-sel": require("../assets/pins/pin-limpeza-andamento-sel.png"),
  "limpeza/resolvido": require("../assets/pins/pin-limpeza-resolvido.png"),
  "limpeza/resolvido-sel": require("../assets/pins/pin-limpeza-resolvido-sel.png"),
  "limpeza/negado": require("../assets/pins/pin-limpeza-negado.png"),
  "limpeza/negado-sel": require("../assets/pins/pin-limpeza-negado-sel.png"),
  "seguranca/analise": require("../assets/pins/pin-seguranca-analise.png"),
  "seguranca/analise-sel": require("../assets/pins/pin-seguranca-analise-sel.png"),
  "seguranca/andamento": require("../assets/pins/pin-seguranca-andamento.png"),
  "seguranca/andamento-sel": require("../assets/pins/pin-seguranca-andamento-sel.png"),
  "seguranca/resolvido": require("../assets/pins/pin-seguranca-resolvido.png"),
  "seguranca/resolvido-sel": require("../assets/pins/pin-seguranca-resolvido-sel.png"),
  "seguranca/negado": require("../assets/pins/pin-seguranca-negado.png"),
  "seguranca/negado-sel": require("../assets/pins/pin-seguranca-negado-sel.png"),
  "transito/analise": require("../assets/pins/pin-transito-analise.png"),
  "transito/analise-sel": require("../assets/pins/pin-transito-analise-sel.png"),
  "transito/andamento": require("../assets/pins/pin-transito-andamento.png"),
  "transito/andamento-sel": require("../assets/pins/pin-transito-andamento-sel.png"),
  "transito/resolvido": require("../assets/pins/pin-transito-resolvido.png"),
  "transito/resolvido-sel": require("../assets/pins/pin-transito-resolvido-sel.png"),
  "transito/negado": require("../assets/pins/pin-transito-negado.png"),
  "transito/negado-sel": require("../assets/pins/pin-transito-negado-sel.png"),
  "outros/analise": require("../assets/pins/pin-outros-analise.png"),
  "outros/analise-sel": require("../assets/pins/pin-outros-analise-sel.png"),
  "outros/andamento": require("../assets/pins/pin-outros-andamento.png"),
  "outros/andamento-sel": require("../assets/pins/pin-outros-andamento-sel.png"),
  "outros/resolvido": require("../assets/pins/pin-outros-resolvido.png"),
  "outros/resolvido-sel": require("../assets/pins/pin-outros-resolvido-sel.png"),
  "outros/negado": require("../assets/pins/pin-outros-negado.png"),
  "outros/negado-sel": require("../assets/pins/pin-outros-negado-sel.png"),
};

/** Tamanho logico (pt/dp) de cada variante; a ponta da cauda fica na base (anchor y = 1). */
export const PIN_SIZE = { normal: { width: 50, height: 60 }, selected: { width: 60, height: 70 } } as const;
