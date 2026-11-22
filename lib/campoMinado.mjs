/**
 * Campo Minado 18 x 14 com 40 minas — implementação funcional.
 *
 * Todo o estado do jogo é um objeto simples e IMUTÁVEL: cada ação
 * (abrir, marcar, abrirVizinhas) devolve um NOVO estado, sem alterar o anterior.
 * Coordenadas usam o padrão (x, y): x = coluna (0..17), y = linha (0..13).
 */

export const LARGURA = 18;
export const ALTURA = 14;
export const MINAS = 40;

export const STATUS = Object.freeze({
  NOVO: 'novo',
  EM_ANDAMENTO: 'em_andamento',
  VITORIA: 'vitoria',
  DERROTA: 'derrota',
});

export const MARCA = Object.freeze({ NENHUMA: 'nenhuma', BANDEIRA: 'bandeira', DUVIDA: 'duvida' });

/** Gerador pseudoaleatório Mulberry32 (determinístico a partir de uma semente). */
export function geradorComSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const celulaVazia = () => Object.freeze({ mina: false, aberta: false, marca: MARCA.NENHUMA, adjacentes: 0 });

function congelar(estado) {
  return Object.freeze({ ...estado, celulas: Object.freeze(estado.celulas.map((c) => Object.freeze({ ...c }))) });
}

export function dentro(estado, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < estado.largura && y < estado.altura;
}

function exigirDentro(estado, x, y) {
  if (!dentro(estado, x, y)) throw new RangeError(`Coordenada inválida: (${x}, ${y})`);
}

function exigirAtivo(estado) {
  if (estado.status === STATUS.VITORIA || estado.status === STATUS.DERROTA) {
    throw new Error('Jogo encerrado');
  }
}

export const indice = (estado, x, y) => y * estado.largura + x;

export function vizinhas(estado, x, y) {
  const lista = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && dentro(estado, x + dx, y + dy)) lista.push([x + dx, y + dy]);
    }
  }
  return lista;
}

function calcularAdjacentes(estado, celulas) {
  return celulas.map((c, i) => {
    const x = i % estado.largura;
    const y = Math.floor(i / estado.largura);
    const adjacentes = vizinhas(estado, x, y).filter(([vx, vy]) => celulas[indice(estado, vx, vy)].mina).length;
    return { ...c, adjacentes };
  });
}

/**
 * Cria um novo jogo.
 * @param {object} [cfg]
 * @param {number} [cfg.largura=18] @param {number} [cfg.altura=14] @param {number} [cfg.minas=40]
 * @param {number} [cfg.semente] semente do sorteio (reprodutível)
 * @param {Array<[number,number]>} [cfg.minasFixas] posições (x, y) fixas — usado em testes
 */
export function criarJogo({ largura = LARGURA, altura = ALTURA, minas = MINAS, semente = Date.now(), minasFixas } = {}) {
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 2 || altura < 2) {
    throw new Error('Dimensões inválidas');
  }
  const total = largura * altura;
  if (!Number.isInteger(minas) || minas < 1 || minas > total - 1) {
    throw new Error('Número de minas inválido');
  }
  let estado = {
    largura,
    altura,
    totalMinas: minas,
    semente,
    status: STATUS.NOVO,
    jogadas: 0,
    minasPosicionadas: false,
    celulas: Array.from({ length: total }, celulaVazia),
  };
  if (minasFixas) {
    if (minasFixas.length !== minas) throw new Error('Quantidade de minas fixas diferente do total');
    const usadas = new Set();
    const celulas = estado.celulas.map((c) => ({ ...c }));
    for (const [x, y] of minasFixas) {
      exigirDentro(estado, x, y);
      const i = indice(estado, x, y);
      if (usadas.has(i)) throw new Error('Mina repetida');
      usadas.add(i);
      celulas[i].mina = true;
    }
    estado = { ...estado, minasPosicionadas: true, celulas: calcularAdjacentes(estado, celulas) };
  }
  return congelar(estado);
}

/** Sorteia as minas (Fisher-Yates) excluindo apenas a célula do primeiro clique. */
function posicionarMinas(estado, xSeguro, ySeguro) {
  const rng = geradorComSemente(estado.semente);
  const proibida = indice(estado, xSeguro, ySeguro);
  const candidatas = estado.celulas.map((_, i) => i).filter((i) => i !== proibida);
  for (let i = candidatas.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
  }
  const escolhidas = new Set(candidatas.slice(0, estado.totalMinas));
  const celulas = estado.celulas.map((c, i) => ({ ...c, mina: escolhidas.has(i) }));
  return { ...estado, minasPosicionadas: true, celulas: calcularAdjacentes(estado, celulas) };
}

function verificarVitoria(estado) {
  const fechadasSeguras = estado.celulas.some((c) => !c.mina && !c.aberta);
  return fechadasSeguras ? estado : { ...estado, status: STATUS.VITORIA };
}

/** Abre a célula (x, y). Células com 0 minas adjacentes abrem a região por busca em largura. */
export function abrir(anterior, x, y) {
  exigirAtivo(anterior);
  exigirDentro(anterior, x, y);
  let estado = anterior.minasPosicionadas ? { ...anterior } : posicionarMinas(anterior, x, y);
  const alvo = estado.celulas[indice(estado, x, y)];
  if (alvo.aberta || alvo.marca === MARCA.BANDEIRA) return anterior;

  const celulas = estado.celulas.map((c) => ({ ...c }));
  estado = { ...estado, celulas, jogadas: estado.jogadas + 1, status: STATUS.EM_ANDAMENTO };

  if (alvo.mina) {
    celulas[indice(estado, x, y)].aberta = true;
    return congelar({ ...estado, status: STATUS.DERROTA, explodiu: [x, y] });
  }

  const fila = [[x, y]];
  while (fila.length) {
    const [cx, cy] = fila.shift();
    const c = celulas[indice(estado, cx, cy)];
    if (c.aberta || c.mina || c.marca === MARCA.BANDEIRA) continue;
    c.aberta = true;
    c.marca = MARCA.NENHUMA;
    if (c.adjacentes === 0) fila.push(...vizinhas(estado, cx, cy));
  }
  return congelar(verificarVitoria(estado));
}

/** Alterna a marca de uma célula fechada: nenhuma → bandeira → dúvida → nenhuma. */
export function alternarMarca(anterior, x, y) {
  exigirAtivo(anterior);
  exigirDentro(anterior, x, y);
  const i = indice(anterior, x, y);
  if (anterior.celulas[i].aberta) throw new Error('Não é possível marcar célula aberta');
  const ciclo = { [MARCA.NENHUMA]: MARCA.BANDEIRA, [MARCA.BANDEIRA]: MARCA.DUVIDA, [MARCA.DUVIDA]: MARCA.NENHUMA };
  const celulas = anterior.celulas.map((c, j) => (j === i ? { ...c, marca: ciclo[c.marca] } : c));
  return congelar({ ...anterior, celulas });
}

/**
 * "Abrir vizinhas" (chord): numa célula aberta cujo número já foi
 * completado com bandeiras, abre todas as vizinhas sem bandeira.
 */
export function abrirVizinhas(anterior, x, y) {
  exigirAtivo(anterior);
  exigirDentro(anterior, x, y);
  const c = anterior.celulas[indice(anterior, x, y)];
  if (!c.aberta || c.adjacentes === 0) return anterior;
  const viz = vizinhas(anterior, x, y);
  const bandeiras = viz.filter(([vx, vy]) => anterior.celulas[indice(anterior, vx, vy)].marca === MARCA.BANDEIRA).length;
  if (bandeiras !== c.adjacentes) return anterior;
  let estado = anterior;
  for (const [vx, vy] of viz) {
    if (estado.status === STATUS.DERROTA || estado.status === STATUS.VITORIA) break;
    const v = estado.celulas[indice(estado, vx, vy)];
    if (!v.aberta && v.marca !== MARCA.BANDEIRA) estado = abrir(estado, vx, vy);
  }
  return estado;
}

export const contarMinas = (estado) => estado.celulas.filter((c) => c.mina).length;
export const contarBandeiras = (estado) => estado.celulas.filter((c) => c.marca === MARCA.BANDEIRA).length;
export const minasRestantes = (estado) => estado.totalMinas - contarBandeiras(estado);
export const celula = (estado, x, y) => (exigirDentro(estado, x, y), estado.celulas[indice(estado, x, y)]);

/**
 * Desenha o tabuleiro em texto: '#' fechada, 'F' bandeira, '?' dúvida,
 * '.' aberta sem minas, '1'..'8' número, '*' mina (só quando revelada ou ao perder).
 */
export function renderizar(estado, revelarTudo = estado.status === STATUS.DERROTA) {
  const linhas = [];
  for (let y = 0; y < estado.altura; y++) {
    let linha = '';
    for (let x = 0; x < estado.largura; x++) {
      const c = estado.celulas[indice(estado, x, y)];
      if (c.aberta || revelarTudo) linha += c.mina ? '*' : c.adjacentes === 0 ? '.' : String(c.adjacentes);
      else linha += c.marca === MARCA.BANDEIRA ? 'F' : c.marca === MARCA.DUVIDA ? '?' : '#';
    }
    linhas.push(linha);
  }
  return linhas.join('\n');
}
