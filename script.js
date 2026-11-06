const canvas = document.getElementById("tabuleiro");
const ctx = canvas.getContext("2d");
const canvasProxima = document.getElementById("proxima");
const ctxProxima = canvasProxima.getContext("2d");

const elPontos = document.getElementById("pontos");
const elLinhas = document.getElementById("linhas");
const elNivel = document.getElementById("nivel");
const elPontosFinal = document.getElementById("pontos-final");
const elFim = document.getElementById("fim");
const elPausa = document.getElementById("pausa");
const btnReiniciar = document.getElementById("btn-reiniciar");

const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO = canvas.width / COLUNAS;   

const PECAS = {
  I: { forma: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], cor: "#ff9ccf" },
  O: { forma: [[1,1],[1,1]],                              cor: "#ff5fae" },
  T: { forma: [[0,1,0],[1,1,1],[0,0,0]],                  cor: "#c45a95" },
  S: { forma: [[0,1,1],[1,1,0],[0,0,0]],                  cor: "#f7a8d0" },
  Z: { forma: [[1,1,0],[0,1,1],[0,0,0]],                  cor: "#e0408f" },
  J: { forma: [[1,0,0],[1,1,1],[0,0,0]],                  cor: "#8e2a62" },
  L: { forma: [[0,0,1],[1,1,1],[0,0,0]],                  cor: "#ffc2e0" }
};

const COR_FUNDO_1 = "#f7e3ee";
const COR_FUNDO_2 = "#f1d3e4";

const PONTOS_LINHAS = [0, 100, 300, 500, 800];

let tabuleiro, peca, proxima, sacola;
let pontos, linhas, nivel;
let jogando, pausado;
let ultimoTempo, acumulado;

/* ---------- Peças ---------- */

function sortearTipo() {
  if (sacola.length === 0) {
    sacola = Object.keys(PECAS);
    for (let i = sacola.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sacola[i], sacola[j]] = [sacola[j], sacola[i]];
    }
  }
  return sacola.pop();
}

function novaPeca(tipo) {
  const forma = PECAS[tipo].forma.map(function (linha) { return linha.slice(); });
  return {
    forma: forma,
    cor: PECAS[tipo].cor,
    x: Math.floor((COLUNAS - forma[0].length) / 2),
    y: 0
  };
}

function girar(forma) {
  const n = forma.length;
  const nova = [];
  for (let r = 0; r < n; r++) {
    nova.push([]);
    for (let c = 0; c < n; c++) {
      nova[r][c] = forma[n - 1 - c][r];
    }
  }
  return nova;
}

function colide(forma, x, y) {
  for (let r = 0; r < forma.length; r++) {
    for (let c = 0; c < forma[r].length; c++) {
      if (!forma[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= COLUNAS || ny >= LINHAS) return true;
      if (ny >= 0 && tabuleiro[ny][nx]) return true;
    }
  }
  return false;
}

/* ---------- Regras do jogo ---------- */

function iniciar() {
  tabuleiro = [];
  for (let r = 0; r < LINHAS; r++) tabuleiro.push(new Array(COLUNAS).fill(0));

  sacola = [];
  pontos = 0;
  linhas = 0;
  nivel = 1;
  jogando = true;
  pausado = false;
  elFim.hidden = true;
  elPausa.hidden = true;

  proxima = novaPeca(sortearTipo());
  surgirPeca();
  atualizarPlacar();

  acumulado = 0;
  ultimoTempo = performance.now();
  requestAnimationFrame(ciclo);
}

function surgirPeca() {
  peca = proxima;
  proxima = novaPeca(sortearTipo());
  desenharProxima();

  if (colide(peca.forma, peca.x, peca.y)) fimDeJogo();
}

function intervaloQueda() {
  return Math.max(100, 800 - (nivel - 1) * 70);
}

function ciclo(agora) {
  if (!jogando) return;

  if (!pausado) {
    acumulado += agora - ultimoTempo;
    if (acumulado >= intervaloQueda()) {
      acumulado = 0;
      descer(false);
    }
  }
  ultimoTempo = agora;

  desenhar();
  requestAnimationFrame(ciclo);
}

function descer(manual) {
  if (!colide(peca.forma, peca.x, peca.y + 1)) {
    peca.y++;
    if (manual) {
      pontos += 1;
      atualizarPlacar();
    }
    return;
  }
  travar();
}

function quedaDireta() {
  let celulas = 0;
  while (!colide(peca.forma, peca.x, peca.y + 1)) {
    peca.y++;
    celulas++;
  }
  pontos += celulas * 2;
  travar();
}

function travar() {
  for (let r = 0; r < peca.forma.length; r++) {
    for (let c = 0; c < peca.forma[r].length; c++) {
      if (!peca.forma[r][c]) continue;
      const ny = peca.y + r;
      if (ny < 0) { fimDeJogo(); return; }
      tabuleiro[ny][peca.x + c] = peca.cor;
    }
  }

  limparLinhas();
  atualizarPlacar();
  if (jogando) surgirPeca();
}

function limparLinhas() {
  let limpas = 0;
  for (let r = LINHAS - 1; r >= 0; r--) {
    if (tabuleiro[r].every(function (celula) { return celula !== 0; })) {
      tabuleiro.splice(r, 1);
      tabuleiro.unshift(new Array(COLUNAS).fill(0));
      limpas++;
      r++;                                
    }
  }

  if (limpas > 0) {
    pontos += PONTOS_LINHAS[limpas] * nivel;
    linhas += limpas;
    nivel = Math.floor(linhas / 10) + 1;
  }
}

function mover(dx) {
  if (!colide(peca.forma, peca.x + dx, peca.y)) peca.x += dx;
}

function girarPeca() {
  const nova = girar(peca.forma);
  const tentativas = [0, -1, 1, -2, 2];
  for (let i = 0; i < tentativas.length; i++) {
    if (!colide(nova, peca.x + tentativas[i], peca.y)) {
      peca.forma = nova;
      peca.x += tentativas[i];
      return;
    }
  }
}

function alternarPausa() {
  if (!jogando) return;
  pausado = !pausado;
  elPausa.hidden = !pausado;
  ultimoTempo = performance.now();
}

function fimDeJogo() {
  jogando = false;
  elPontosFinal.textContent = pontos;
  desenhar();
  elFim.hidden = false;
  btnReiniciar.focus();
}

function atualizarPlacar() {
  elPontos.textContent = pontos;
  elLinhas.textContent = linhas;
  elNivel.textContent = nivel;
}

/* ---------- Desenho ---------- */

function desenharQuadrado(contexto, x, y, tamanho, cor) {
  contexto.fillStyle = cor;
  contexto.fillRect(x * tamanho + 1, y * tamanho + 1, tamanho - 2, tamanho - 2);
  contexto.fillStyle = "rgba(255, 255, 255, 0.28)";
  contexto.fillRect(x * tamanho + 1, y * tamanho + 1, tamanho - 2, 4);
}

function desenhar() {
  for (let r = 0; r < LINHAS; r++) {
    for (let c = 0; c < COLUNAS; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? COR_FUNDO_1 : COR_FUNDO_2;
      ctx.fillRect(c * TAMANHO, r * TAMANHO, TAMANHO, TAMANHO);
    }
  }

  for (let r = 0; r < LINHAS; r++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (tabuleiro[r][c]) desenharQuadrado(ctx, c, r, TAMANHO, tabuleiro[r][c]);
    }
  }

  if (!peca) return;

  let yFantasma = peca.y;
  while (!colide(peca.forma, peca.x, yFantasma + 1)) yFantasma++;
  ctx.globalAlpha = 0.28;
  desenharForma(ctx, peca.forma, peca.x, yFantasma, TAMANHO, peca.cor);
  ctx.globalAlpha = 1;

  desenharForma(ctx, peca.forma, peca.x, peca.y, TAMANHO, peca.cor);
}

function desenharForma(contexto, forma, x, y, tamanho, cor) {
  for (let r = 0; r < forma.length; r++) {
    for (let c = 0; c < forma[r].length; c++) {
      if (forma[r][c] && y + r >= 0) {
        desenharQuadrado(contexto, x + c, y + r, tamanho, cor);
      }
    }
  }
}

function desenharProxima() {
  ctxProxima.fillStyle = COR_FUNDO_1;
  ctxProxima.fillRect(0, 0, canvasProxima.width, canvasProxima.height);

  const tam = 30;
  const forma = proxima.forma;

  let minR = 99, maxR = -1, minC = 99, maxC = -1;
  for (let r = 0; r < forma.length; r++) {
    for (let c = 0; c < forma[r].length; c++) {
      if (!forma[r][c]) continue;
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    }
  }
  const largura = (maxC - minC + 1) * tam;
  const altura = (maxR - minR + 1) * tam;
  const ox = (canvasProxima.width - largura) / 2;
  const oy = (canvasProxima.height - altura) / 2;

  ctxProxima.save();
  ctxProxima.translate(ox - minC * tam, oy - minR * tam);
  desenharForma(ctxProxima, forma, 0, 0, tam, proxima.cor);
  ctxProxima.restore();
}

/* ---------- Teclado ---------- */

document.addEventListener("keydown", function (e) {
  const teclasDoJogo = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
  if (teclasDoJogo.includes(e.key)) e.preventDefault(); 

  if (e.key === "p" || e.key === "P") {
    alternarPausa();
    return;
  }

  if (!jogando || pausado) return;

  if (e.key === "ArrowLeft") mover(-1);
  else if (e.key === "ArrowRight") mover(1);
  else if (e.key === "ArrowUp") girarPeca();
  else if (e.key === "ArrowDown") { descer(true); acumulado = 0; }
  else if (e.key === " ") quedaDireta();

  desenhar();
});

btnReiniciar.addEventListener("click", iniciar);

iniciar();