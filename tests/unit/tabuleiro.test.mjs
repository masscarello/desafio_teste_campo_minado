import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarJogo, abrir, contarMinas, vizinhas, celula, minasRestantes,
  STATUS, LARGURA, ALTURA, MINAS,
} from '../../lib/campoMinado.mjs';
import { BLOCO_DIREITA } from '../fixtures.mjs';

test('Configuração do tabuleiro 18 x 14', async (t) => {
  await t.test('TC-01 constantes do desafio: 18 colunas, 14 linhas e 40 minas', () => {
    assert.deepEqual([LARGURA, ALTURA, MINAS], [18, 14, 40]);
  });

  await t.test('TC-02 jogo novo tem 252 células, todas fechadas e sem minas sorteadas', () => {
    // Arrange / Act
    const jogo = criarJogo({ semente: 1 });
    // Assert
    assert.equal(jogo.celulas.length, 252);
    assert.equal(jogo.status, STATUS.NOVO);
    assert.equal(jogo.minasPosicionadas, false);
    assert.equal(contarMinas(jogo), 0, 'minas só são sorteadas no primeiro clique');
    assert.ok(jogo.celulas.every((c) => !c.aberta));
  });

  await t.test('TC-03 após o primeiro clique existem exatamente 40 minas (30 sementes)', () => {
    for (let semente = 1; semente <= 30; semente++) {
      const jogo = abrir(criarJogo({ semente }), 9, 7);
      assert.equal(contarMinas(jogo), 40, `semente ${semente}`);
    }
  });

  await t.test('TC-04 a mesma semente gera o mesmo tabuleiro (reprodutível)', () => {
    const a = abrir(criarJogo({ semente: 42 }), 0, 0);
    const b = abrir(criarJogo({ semente: 42 }), 0, 0);
    const c = abrir(criarJogo({ semente: 43 }), 0, 0);
    const minas = (j) => j.celulas.map((x) => x.mina);
    assert.deepEqual(minas(a), minas(b));
    assert.notDeepEqual(minas(a), minas(c));
  });

  await t.test('TC-05 configuração inválida é rejeitada', () => {
    assert.throws(() => criarJogo({ minas: 0 }), /minas inválido/);
    assert.throws(() => criarJogo({ minas: 252 }), /minas inválido/);
    assert.throws(() => criarJogo({ largura: 1 }), /Dimensões/);
    assert.throws(() => criarJogo({ minasFixas: [[0, 0]] }), /diferente do total/);
    const repetida = [...BLOCO_DIREITA.slice(0, 39), [14, 0]];
    assert.throws(() => criarJogo({ minasFixas: repetida }), /repetida/);
  });

  await t.test('TC-06 contador de minas restantes começa em 40', () => {
    assert.equal(minasRestantes(criarJogo()), 40);
  });
});

test('Primeiro clique e vizinhança', async (t) => {
  await t.test('TC-07 o primeiro clique nunca acerta mina (todas as 252 células)', () => {
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < 18; x++) {
        const jogo = abrir(criarJogo({ semente: x * 100 + y }), x, y);
        assert.notEqual(jogo.status, STATUS.DERROTA, `clique em (${x}, ${y})`);
        assert.equal(celula(jogo, x, y).mina, false);
      }
    }
  });

  await t.test('TC-08 quantidade de vizinhas: canto 3, borda 5, interior 8', () => {
    const jogo = criarJogo();
    assert.equal(vizinhas(jogo, 0, 0).length, 3);
    assert.equal(vizinhas(jogo, 17, 13).length, 3);
    assert.equal(vizinhas(jogo, 9, 0).length, 5);
    assert.equal(vizinhas(jogo, 0, 7).length, 5);
    assert.equal(vizinhas(jogo, 9, 7).length, 8);
  });

  await t.test('TC-09 número de cada célula = minas nas vizinhas (conferência completa)', () => {
    const jogo = abrir(criarJogo({ semente: 2026 }), 5, 5);
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < 18; x++) {
        const esperado = vizinhas(jogo, x, y).filter(([vx, vy]) => celula(jogo, vx, vy).mina).length;
        assert.equal(celula(jogo, x, y).adjacentes, esperado);
      }
    }
  });

  await t.test('TC-10 bordas do bloco de minas mostram 1, 2 e 3', () => {
    const jogo = criarJogo({ minasFixas: BLOCO_DIREITA });
    assert.equal(celula(jogo, 13, 0).adjacentes, 2); // canto do bloco, encostado na borda de cima
    assert.equal(celula(jogo, 13, 5).adjacentes, 3); // lateral do bloco
    assert.equal(celula(jogo, 13, 10).adjacentes, 1); // diagonal do canto inferior
    assert.equal(celula(jogo, 15, 10).adjacentes, 3); // abaixo do bloco
    assert.equal(celula(jogo, 5, 5).adjacentes, 0);
  });
});
