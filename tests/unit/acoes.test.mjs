import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarJogo, abrir, alternarMarca, abrirVizinhas, celula, minasRestantes, contarBandeiras,
  STATUS, MARCA,
} from '../../lib/campoMinado.mjs';
import { BLOCO_DIREITA, ESPALHADO } from '../fixtures.mjs';

const novo = () => criarJogo({ minasFixas: BLOCO_DIREITA });

test('Abrir células', async (t) => {
  await t.test('TC-11 célula com 0 minas adjacentes abre a região em cascata', () => {
    const jogo = abrir(novo(), 0, 13);
    assert.equal(celula(jogo, 0, 0).aberta, true);
    assert.equal(celula(jogo, 13, 4).aberta, true, 'borda numerada da região também abre');
    assert.equal(celula(jogo, 14, 0).aberta, false, 'minas continuam fechadas');
  });

  await t.test('TC-12 célula numerada abre somente ela mesma', () => {
    const jogo = abrir(novo(), 13, 5);
    const abertas = jogo.celulas.filter((c) => c.aberta).length;
    assert.equal(abertas, 1);
  });

  await t.test('TC-13 abrir mina gera derrota e registra onde explodiu', () => {
    const jogo = abrir(novo(), 15, 3);
    assert.equal(jogo.status, STATUS.DERROTA);
    assert.deepEqual(jogo.explodiu, [15, 3]);
  });

  await t.test('TC-14 as ações não alteram o estado anterior (imutabilidade)', () => {
    const antes = novo();
    const depois = abrir(antes, 0, 0);
    assert.notEqual(antes, depois);
    assert.ok(antes.celulas.every((c) => !c.aberta));
    assert.throws(() => { antes.celulas[0].aberta = true; }, TypeError);
  });

  await t.test('TC-15 reabrir célula aberta devolve o mesmo estado e não conta jogada', () => {
    const j1 = abrir(novo(), 13, 5);
    const j2 = abrir(j1, 13, 5);
    assert.equal(j2, j1);
    assert.equal(j2.jogadas, 1);
  });

  await t.test('TC-16 coordenada fora de 18 x 14 lança RangeError', () => {
    const jogo = novo();
    for (const [x, y] of [[-1, 0], [18, 0], [0, 14], [1.5, 2], [0, -1]]) {
      assert.throws(() => abrir(jogo, x, y), RangeError);
    }
  });

  await t.test('TC-17 depois da derrota nenhuma ação é aceita', () => {
    const perdido = abrir(novo(), 14, 0);
    assert.throws(() => abrir(perdido, 0, 0), /encerrado/);
    assert.throws(() => alternarMarca(perdido, 0, 0), /encerrado/);
    assert.throws(() => abrirVizinhas(perdido, 0, 0), /encerrado/);
  });
});

test('Marcas: bandeira e dúvida', async (t) => {
  await t.test('TC-18 marca alterna nenhuma → bandeira → dúvida → nenhuma', () => {
    let jogo = novo();
    const marcas = [];
    for (let i = 0; i < 3; i++) {
      jogo = alternarMarca(jogo, 14, 0);
      marcas.push(celula(jogo, 14, 0).marca);
    }
    assert.deepEqual(marcas, [MARCA.BANDEIRA, MARCA.DUVIDA, MARCA.NENHUMA]);
  });

  await t.test('TC-19 apenas bandeiras descontam do contador de minas', () => {
    let jogo = alternarMarca(alternarMarca(novo(), 14, 0), 15, 0);
    assert.equal(minasRestantes(jogo), 38);
    jogo = alternarMarca(jogo, 15, 0); // vira dúvida
    assert.equal(contarBandeiras(jogo), 1);
    assert.equal(minasRestantes(jogo), 39);
  });

  await t.test('TC-20 célula com bandeira não abre; com dúvida abre normalmente', () => {
    let jogo = alternarMarca(novo(), 14, 0);
    assert.equal(abrir(jogo, 14, 0), jogo, 'bandeira protege a mina');
    jogo = alternarMarca(novo(), 0, 0);
    jogo = alternarMarca(jogo, 0, 0); // dúvida
    jogo = abrir(jogo, 0, 0);
    assert.equal(celula(jogo, 0, 0).aberta, true);
  });

  await t.test('TC-21 não é possível marcar célula aberta', () => {
    const jogo = abrir(novo(), 13, 5);
    assert.throws(() => alternarMarca(jogo, 13, 5), /célula aberta/);
  });
});

test('Abrir vizinhas (chord)', async (t) => {
  await t.test('TC-22 com as bandeiras corretas, abre as vizinhas restantes', () => {
    // (13,10) tem 1 mina adjacente: (14,9)
    let jogo = abrir(novo(), 13, 10);
    jogo = alternarMarca(jogo, 14, 9);
    jogo = abrirVizinhas(jogo, 13, 10);
    assert.equal(celula(jogo, 12, 11).aberta, true);
    assert.notEqual(jogo.status, STATUS.DERROTA);
  });

  await t.test('TC-23 sem bandeiras suficientes nada acontece', () => {
    const jogo = abrir(novo(), 13, 5);
    assert.equal(abrirVizinhas(jogo, 13, 5), jogo);
  });

  await t.test('TC-24 bandeira errada faz o chord explodir uma mina', () => {
    // (13,10) tem como mina (14,9); marcamos (12,9) — que é segura — por engano
    let jogo = abrir(novo(), 13, 10);
    jogo = alternarMarca(jogo, 12, 9);
    jogo = abrirVizinhas(jogo, 13, 10);
    assert.equal(jogo.status, STATUS.DERROTA);
    assert.deepEqual(jogo.explodiu, [14, 9]);
  });

  await t.test('TC-25 chord em tabuleiro espalhado respeita as bandeiras', () => {
    let jogo = criarJogo({ minasFixas: ESPALHADO });
    const minas = new Set(ESPALHADO.map(([x, y]) => `${x},${y}`));
    // procura uma célula segura numerada para testar
    let alvo;
    for (let y = 1; y < 13 && !alvo; y++) for (let x = 1; x < 17 && !alvo; x++) {
      if (!minas.has(`${x},${y}`) && celula(jogo, x, y).adjacentes > 0) alvo = [x, y];
    }
    jogo = abrir(jogo, ...alvo);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (minas.has(`${alvo[0] + dx},${alvo[1] + dy}`)) jogo = alternarMarca(jogo, alvo[0] + dx, alvo[1] + dy);
    }
    jogo = abrirVizinhas(jogo, ...alvo);
    assert.notEqual(jogo.status, STATUS.DERROTA);
  });
});
