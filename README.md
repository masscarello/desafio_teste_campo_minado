# desafio_teste_campo_minado

## Especificação do desafio — Campo Minado (18 x 14, 40 minas)

Desafio proposto por **Laura**. Casos de teste para o **Campo Minado** com tabuleiro de **18 colunas x 14 linhas** (252 células) e **40 minas**, escritos em JavaScript para testar JavaScript.

### Regras implementadas (`lib/campoMinado.mjs`)

- Estado do jogo **imutável**: cada ação (`abrir`, `alternarMarca`, `abrirVizinhas`) devolve um novo estado, sem alterar o anterior.
- Coordenadas no formato **(x, y)**: `x` = coluna (0 a 17) e `y` = linha (0 a 13).
- As 40 minas são sorteadas (Fisher-Yates com semente) **no primeiro clique**, que nunca cai em mina.
- Cada célula guarda quantas minas existem nas até 8 vizinhas.
- Célula com 0 minas vizinhas abre a região em cascata (busca em largura).
- Marcas em ciclo: **nenhuma → bandeira → dúvida (?) → nenhuma**. Só a bandeira bloqueia a abertura e desconta do contador.
- **Abrir vizinhas (chord):** numa célula numerada com todas as bandeiras ao redor, abre as demais vizinhas (se a bandeira estiver errada, explode).
- Abrir mina = **derrota**; abrir as 212 células seguras = **vitória**. Após o fim, nenhuma ação é aceita.
- `renderizar()` desenha o tabuleiro em texto (`#`, `F`, `?`, `.`, `1`–`8`, `*`).

---

## Estrutura do projeto

```
desafio_teste_campo_minado/
├── lib/                 # código do jogo (ES Modules)
├── tests/
│   ├── fixtures.mjs     # dados fixos usados pelos testes
│   ├── unit/            # testes unitários (cada regra isolada)
│   └── integration/     # testes de integração (partidas completas)
└── package.json
```

Arquivos `.mjs`:

```
lib/campoMinado.mjs
tests/fixtures.mjs
tests/integration/partida.test.mjs
tests/unit/acoes.test.mjs
tests/unit/tabuleiro.test.mjs
```

## Como executar os testes

Requisito: **Node.js 20 ou superior**. Não há dependências para instalar: os testes usam o executor nativo do Node (`node:test`) e `node:assert/strict`.

```bash
npm test                  # todos os testes
npm run test:unit         # só os unitários
npm run test:integration  # só os de integração
```

## Funcionamento dos casos de teste

- Os testes estão divididos em **unitários** (`tests/unit`), que verificam cada regra isoladamente, e de **integração** (`tests/integration`), que jogam partidas completas do início ao fim.
- Cada arquivo usa `test()` como grupo e `t.test()` como subteste. Cada caso tem um identificador **TC-xx** no nome.
- Os casos seguem o padrão **Arrange → Act → Assert** (preparar o cenário, executar a ação e conferir o resultado).
- Onde o jogo usa sorteio, os testes passam uma **semente** fixa (gerador pseudoaleatório) ou usam os cenários de `tests/fixtures.mjs`, então o resultado é sempre o mesmo em qualquer máquina.
- Situações de erro são verificadas com `assert.throws`, conferindo a mensagem ou o tipo do erro (`RangeError`, por exemplo).
- Os testes de integração rodam **dezenas ou centenas de partidas automáticas** para garantir que o jogo sempre termina de forma consistente.
- Ao rodar `npm test`, o Node mostra cada caso como `ok` (passou) ou `not ok` (falhou) e o total no final.

### Lista de casos de teste (30 casos)

| ID | Tipo | Grupo | O que é verificado |
|---|---|---|---|
| TC-01 | Unitário | Configuração do tabuleiro 18 x 14 | constantes do desafio: 18 colunas, 14 linhas e 40 minas |
| TC-02 | Unitário | Configuração do tabuleiro 18 x 14 | jogo novo tem 252 células, todas fechadas e sem minas sorteadas |
| TC-03 | Unitário | Configuração do tabuleiro 18 x 14 | após o primeiro clique existem exatamente 40 minas (30 sementes) |
| TC-04 | Unitário | Configuração do tabuleiro 18 x 14 | a mesma semente gera o mesmo tabuleiro (reprodutível) |
| TC-05 | Unitário | Configuração do tabuleiro 18 x 14 | configuração inválida é rejeitada |
| TC-06 | Unitário | Configuração do tabuleiro 18 x 14 | contador de minas restantes começa em 40 |
| TC-07 | Unitário | Primeiro clique e vizinhança | o primeiro clique nunca acerta mina (todas as 252 células) |
| TC-08 | Unitário | Primeiro clique e vizinhança | quantidade de vizinhas: canto 3, borda 5, interior 8 |
| TC-09 | Unitário | Primeiro clique e vizinhança | número de cada célula = minas nas vizinhas (conferência completa) |
| TC-10 | Unitário | Primeiro clique e vizinhança | bordas do bloco de minas mostram 1, 2 e 3 |
| TC-11 | Unitário | Abrir células | célula com 0 minas adjacentes abre a região em cascata |
| TC-12 | Unitário | Abrir células | célula numerada abre somente ela mesma |
| TC-13 | Unitário | Abrir células | abrir mina gera derrota e registra onde explodiu |
| TC-14 | Unitário | Abrir células | as ações não alteram o estado anterior (imutabilidade) |
| TC-15 | Unitário | Abrir células | reabrir célula aberta devolve o mesmo estado e não conta jogada |
| TC-16 | Unitário | Abrir células | coordenada fora de 18 x 14 lança RangeError |
| TC-17 | Unitário | Abrir células | depois da derrota nenhuma ação é aceita |
| TC-18 | Unitário | Marcas: bandeira e dúvida | marca alterna nenhuma → bandeira → dúvida → nenhuma |
| TC-19 | Unitário | Marcas: bandeira e dúvida | apenas bandeiras descontam do contador de minas |
| TC-20 | Unitário | Marcas: bandeira e dúvida | célula com bandeira não abre; com dúvida abre normalmente |
| TC-21 | Unitário | Marcas: bandeira e dúvida | não é possível marcar célula aberta |
| TC-22 | Unitário | Abrir vizinhas (chord) | com as bandeiras corretas, abre as vizinhas restantes |
| TC-23 | Unitário | Abrir vizinhas (chord) | sem bandeiras suficientes nada acontece |
| TC-24 | Unitário | Abrir vizinhas (chord) | bandeira errada faz o chord explodir uma mina |
| TC-25 | Unitário | Abrir vizinhas (chord) | chord em tabuleiro espalhado respeita as bandeiras |
| TC-26 | Integração | Partida completa (integração) | abrir as 212 células seguras vence o jogo |
| TC-27 | Integração | Partida completa (integração) | com o bloco de minas, um único clique no zero vence |
| TC-28 | Integração | Partida completa (integração) | faltando uma célula segura o jogo continua em andamento |
| TC-29 | Integração | Partida completa (integração) | 50 partidas sorteadas jogadas até o fim sempre terminam em vitória |
| TC-30 | Integração | Partida completa (integração) | renderização em texto mostra marcas, números e minas |

## Colaborador(es)

| Nome | R.A. |
|---|---|
| Matheus De Oliveira Mascarello | 241207402 |
