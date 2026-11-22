// Layouts fixos de 40 minas para o tabuleiro 18 x 14 (coordenadas x, y).

/** 40 minas em bloco no canto superior direito: colunas 14..17, linhas 0..9. */
export const BLOCO_DIREITA = [];
for (let y = 0; y <= 9; y++) for (let x = 14; x <= 17; x++) BLOCO_DIREITA.push([x, y]);

/** 40 minas espalhadas: linhas pares 0..12, colunas x onde (x + y) % 6 === 0 (completado até 40). */
export const ESPALHADO = (() => {
  const lista = [];
  for (let y = 0; y < 14 && lista.length < 40; y++) {
    for (let x = 0; x < 18 && lista.length < 40; x++) if ((x * 7 + y * 3) % 6 === 0) lista.push([x, y]);
  }
  return lista;
})();
