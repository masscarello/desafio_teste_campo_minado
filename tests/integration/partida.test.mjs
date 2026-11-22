import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarJogo, abrir, alternarMarca, renderizar, celula, STATUS, indice } from '../../lib/campoMinado.mjs';
import { BLOCO_DIREITA } from '../fixtures.mjs';

/** Jogador automático: abre todas as células seguras conhecidas (usa o gabarito). */
function jogarAteVencer(jogo) {
  let estado = jogo;
  for (let y = 0; y < estado.altura; y++) {
    for (let x = 0; x < estado.largura; x++) {
      if (estado.status === STATUS.VITORIA) return estado;
      const c = celula(estado, x, y);
      if (!c.mina && !c.aberta) estado = abrir(estado, x, y);
    }
  }
  return estado;
}

test('Partida completa (integração)', async (t) => {
  await t.test('TC-26 abrir as 212 células seguras vence o jogo', () => {
    const jogo = jogarAteVencer(criarJogo({ minasFixas: BLOCO_DIREITA }));
    assert.equal(jogo.status, STATUS.VITORIA);
    assert.equal(jogo.celulas.filter((c) => c.aberta).length, 212);
  });

  await t.test('TC-27 com o bloco de minas, um único clique no zero vence', () => {
    const jogo = abrir(criarJogo({ minasFixas: BLOCO_DIREITA }), 0, 0);
    assert.equal(jogo.status, STATUS.VITORIA);
    assert.equal(jogo.jogadas, 1);
  });

  await t.test('TC-28 faltando uma célula segura o jogo continua em andamento', () => {
    let jogo = criarJogo({ minasFixas: BLOCO_DIREITA });
    jogo = abrir(jogo, 13, 5); // só abre uma célula numerada
    assert.equal(jogo.status, STATUS.EM_ANDAMENTO);
  });

  await t.test('TC-29 50 partidas sorteadas jogadas até o fim sempre terminam em vitória', () => {
    for (let semente = 100; semente < 150; semente++) {
      let jogo = abrir(criarJogo({ semente }), 9, 7);
      jogo = jogarAteVencer(jogo);
      assert.equal(jogo.status, STATUS.VITORIA, `semente ${semente}`);
    }
  });

  await t.test('TC-30 renderização em texto mostra marcas, números e minas', () => {
    let jogo = criarJogo({ minasFixas: BLOCO_DIREITA });
    jogo = abrir(jogo, 13, 5);
    jogo = alternarMarca(jogo, 14, 0);
    jogo = alternarMarca(alternarMarca(jogo, 15, 0), 15, 0);
    const linhas = renderizar(jogo).split('\n');
    assert.equal(linhas.length, 14);
    assert.ok(linhas.every((l) => l.length === 18));
    assert.equal(linhas[5][13], '3');
    assert.equal(linhas[0][14], 'F');
    assert.equal(linhas[0][15], '?');
    assert.equal(linhas[0][0], '#');

    const perdido = abrir(jogo, 16, 0);
    const revelado = renderizar(perdido).split('\n');
    assert.equal(revelado[0][16], '*');
    assert.equal(revelado.join('').split('*').length - 1, 40);
    assert.equal(perdido.celulas[indice(perdido, 16, 0)].aberta, true);
  });
});
