import { GameState, TRACK, PLAYERS_CFG, PLAYER_KEYS } from './game.js';
import { audio } from './audio.js';

// DOM elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const boardGrid = document.getElementById('board-grid');
const boardOverlays = document.getElementById('board-overlays');
const eventToast = document.getElementById('event-toast');

const startBtn = document.getElementById('start-game-btn');
const rollBtn = document.getElementById('roll-dice-btn');
const diceCube = document.getElementById('dice-cube');
const turnPlayerName = document.getElementById('active-player-name');
const turnIndicator = document.getElementById('active-player-indicator');
const turnMessage = document.getElementById('turn-message');

const scoreboardList = document.getElementById('scoreboard-list');
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const restartBtn = document.getElementById('restart-game-btn');

const victoryModal = document.getElementById('victory-modal');
const winnerTitle = document.getElementById('winner-title');
const winnerMessage = document.getElementById('winner-message');
const victoryRestartBtn = document.getElementById('victory-restart-btn');
const confettiCanvas = document.getElementById('confetti-canvas');

// Game state instance
const state = new GameState();

// AI Speed configurations (ms)
const SPEED_PRESETS = {
  1: { rollDelay: 1000, moveDelay: 350, animStep: 220 }, // Slow
  2: { rollDelay: 600,  moveDelay: 200, animStep: 130 }, // Normal
  3: { rollDelay: 250,  moveDelay: 80,  animStep: 60 },  // Fast
  4: { rollDelay: 40,   moveDelay: 10,  animStep: 1 }    // Ultra
};

let currentSpeed = SPEED_PRESETS[2];
let isAnimating = false;
let aiTimeoutId = null;
let toastTimeoutId = null;

// Confetti animation variables
let confettiCtx = null;
let confettiParticles = [];
let confettiAnimId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initUIListeners();
  initTypePills();
  generateBoardGrid();
  updateAudioButton();
  setupConfettiCanvas();
});

// Setup click and input listeners
function initUIListeners() {
  startBtn.addEventListener('click', handleStartGame);
  rollBtn.addEventListener('click', handleHumanRoll);
  
  speedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    currentSpeed = SPEED_PRESETS[val];
    const labels = { 1: 'Wolna', 2: 'Normalna', 3: 'Szybka', 4: 'Błyskawiczna' };
    speedLabel.textContent = labels[val];
  });

  audioToggleBtn.addEventListener('click', () => {
    audio.toggleMute();
    updateAudioButton();
    audio.init();
  });

  restartBtn.addEventListener('click', () => {
    if (confirm('Zresetować grę i wrócić do ustawień?')) {
      resetToSetup();
    }
  });

  victoryRestartBtn.addEventListener('click', () => {
    stopConfetti();
    victoryModal.classList.add('hidden');
    resetToSetup();
  });

  // Tap 3D dice wrapper to roll
  document.getElementById('dice-3d-wrapper').addEventListener('click', () => {
    if (!rollBtn.disabled && state.phase === 'PLAYING' && state.getActivePlayer().type === 'human') {
      handleHumanRoll();
    }
  });

  // Spacebar / Enter key to roll for human player
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (state.phase === 'PLAYING' && !rollBtn.disabled && state.getActivePlayer().type === 'human') {
        e.preventDefault();
        handleHumanRoll();
      }
    }
  });
}

function initTypePills() {
  document.querySelectorAll('.type-toggle-group').forEach(group => {
    const targetInputId = group.dataset.target;
    const targetInput = document.getElementById(targetInputId);
    const card = group.closest('.selector-card');

    group.querySelectorAll('.type-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const val = pill.dataset.value;
        targetInput.value = val;

        if (val === 'off') {
          card.classList.add('is-off');
        } else {
          card.classList.remove('is-off');
        }
      });
    });
  });
}

function updateAudioButton() {
  const isMuted = audio.isMuted();
  audioToggleBtn.querySelector('.btn-icon').textContent = isMuted ? '🔇' : '🔊';
  audioToggleBtn.style.opacity = isMuted ? '0.6' : '1';
}

function showToast(text, colorKey = 'default') {
  clearTimeout(toastTimeoutId);
  eventToast.textContent = text;
  eventToast.className = 'event-toast';
  if (colorKey !== 'default') {
    eventToast.style.borderColor = `var(--${colorKey}-color)`;
    eventToast.style.boxShadow = `0 0 16px var(--${colorKey}-glow)`;
  } else {
    eventToast.style.borderColor = 'var(--border-glass-bright)';
    eventToast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
  }
  eventToast.classList.remove('hidden');

  toastTimeoutId = setTimeout(() => {
    eventToast.classList.add('hidden');
  }, 2200);
}

// Generate the 15x15 board cells dynamically
function generateBoardGrid() {
  boardGrid.innerHTML = '';

  const skipGridCell = (row, col) => {
    if (row < 6 && col < 6 && !(row === 0 && col === 0)) return true;
    if (row < 6 && col >= 9 && !(row === 0 && col === 9)) return true;
    if (row >= 9 && col >= 9 && !(row === 9 && col === 9)) return true;
    if (row >= 9 && col < 6 && !(row === 9 && col === 0)) return true;
    if (row >= 6 && row <= 8 && col >= 6 && col <= 8 && !(row === 6 && col === 6)) return true;
    return false;
  };

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (skipGridCell(row, col)) continue;

      // 1. Red Base
      if (row === 0 && col === 0) {
        boardGrid.appendChild(createBaseCell('red', 1, 7, 1, 7));
        continue;
      }
      // 2. Green Base
      if (row === 0 && col === 9) {
        boardGrid.appendChild(createBaseCell('green', 10, 16, 1, 7));
        continue;
      }
      // 3. Yellow Base
      if (row === 9 && col === 9) {
        boardGrid.appendChild(createBaseCell('yellow', 10, 16, 10, 16));
        continue;
      }
      // 4. Blue Base
      if (row === 9 && col === 0) {
        boardGrid.appendChild(createBaseCell('blue', 1, 7, 10, 16));
        continue;
      }
      // 5. Center Goal
      if (row === 6 && col === 6) {
        boardGrid.appendChild(createCenterGoalCell());
        continue;
      }

      // 6. Track or Home cell
      const cell = document.createElement('div');
      cell.style.gridColumn = col + 1;
      cell.style.gridRow = row + 1;
      cell.className = 'board-cell';

      const trackIdx = TRACK.findIndex(c => c.x === col && c.y === row);
      if (trackIdx !== -1) {
        cell.classList.add('cell-track');
        cell.dataset.trackIndex = trackIdx;

        if (trackIdx === PLAYERS_CFG.red.startIndex) cell.classList.add('cell-start-red');
        if (trackIdx === PLAYERS_CFG.green.startIndex) cell.classList.add('cell-start-green');
        if (trackIdx === PLAYERS_CFG.yellow.startIndex) cell.classList.add('cell-start-yellow');
        if (trackIdx === PLAYERS_CFG.blue.startIndex) cell.classList.add('cell-start-blue');
      }

      PLAYER_KEYS.forEach(key => {
        const homeIdx = PLAYERS_CFG[key].homePath.findIndex(c => c.x === col && c.y === row);
        if (homeIdx !== -1) {
          cell.classList.add(`cell-home-${key}`);
          cell.dataset.homePlayerId = key;
          cell.dataset.homeIndex = homeIdx;
        }
      });

      boardGrid.appendChild(cell);
    }
  }
}

function createBaseCell(color, colStart, colEnd, rowStart, rowEnd) {
  const base = document.createElement('div');
  base.className = `board-cell cell-base cell-base-${color}`;
  
  if (state.phase !== 'SETUP' && !state.players[color]?.active) {
    base.classList.add('inactive-base');
  }

  base.style.gridColumn = `${colStart} / ${colEnd}`;
  base.style.gridRow = `${rowStart} / ${rowEnd}`;

  for (let i = 0; i < 4; i++) {
    const pocket = document.createElement('div');
    pocket.className = `base-pocket pocket-${color}`;
    pocket.dataset.playerId = color;
    pocket.dataset.slotIndex = i;
    base.appendChild(pocket);
  }
  return base;
}

function createCenterGoalCell() {
  const center = document.createElement('div');
  center.id = 'center-goal';
  center.className = 'cell-center-goal';
  center.style.gridColumn = '7 / 10';
  center.style.gridRow = '7 / 10';

  const redActive = state.phase === 'SETUP' || state.players.red?.active;
  const greenActive = state.phase === 'SETUP' || state.players.green?.active;
  const yellowActive = state.phase === 'SETUP' || state.players.yellow?.active;
  const blueActive = state.phase === 'SETUP' || state.players.blue?.active;

  center.innerHTML = `
    <svg viewBox="0 0 100 100" class="center-svg">
      <!-- Left Triangle (Red) -->
      <polygon points="0,0 50,50 0,100" fill="var(--red-color)" opacity="${redActive ? 0.85 : 0.08}" />
      <!-- Top Triangle (Green) -->
      <polygon points="0,0 50,50 100,0" fill="var(--green-color)" opacity="${greenActive ? 0.85 : 0.08}" />
      <!-- Right Triangle (Yellow) -->
      <polygon points="100,0 50,50 100,100" fill="var(--yellow-color)" opacity="${yellowActive ? 0.85 : 0.08}" />
      <!-- Bottom Triangle (Blue) -->
      <polygon points="0,100 50,50 100,100" fill="var(--blue-color)" opacity="${blueActive ? 0.85 : 0.08}" />
      <circle cx="50" cy="50" r="12" fill="#090e1c" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
      <polygon points="50,42 52.5,47.5 58,48 54,52 55,57.5 50,54.5 45,57.5 46,52 42,48 47.5,47.5" fill="#f8fafc" opacity="0.9" />
    </svg>
  `;
  return center;
}

// Start Game
function handleStartGame() {
  audio.init();

  const cfg = {
    red: {
      name: document.getElementById('red-name').value.trim() || 'Czerwony',
      type: document.getElementById('red-type').value
    },
    green: {
      name: document.getElementById('green-name').value.trim() || 'Zielony',
      type: document.getElementById('green-type').value
    },
    yellow: {
      name: document.getElementById('yellow-name').value.trim() || 'Żółty',
      type: document.getElementById('yellow-type').value
    },
    blue: {
      name: document.getElementById('blue-name').value.trim() || 'Niebieski',
      type: document.getElementById('blue-type').value
    }
  };

  const activeCount = Object.values(cfg).filter(p => p.type !== 'off').length;
  if (activeCount < 2) {
    alert('Wybierz przynajmniej 2 aktywnych graczy!');
    return;
  }

  state.setupGame(cfg);
  generateBoardGrid();
  
  setupScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  
  createPawnElements();
  startPlayerTurn();
}

function resetToSetup() {
  clearTimeout(aiTimeoutId);
  clearTimeout(toastTimeoutId);
  eventToast.classList.add('hidden');
  stopConfetti();
  
  state.phase = 'SETUP';
  generateBoardGrid();
  setupScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  boardOverlays.innerHTML = '';
  isAnimating = false;
}

function createPawnElements() {
  boardOverlays.innerHTML = '';
  state.pawns.forEach(p => {
    if (!state.players[p.playerId].active) return;

    const pawnEl = document.createElement('div');
    pawnEl.id = `pawn-${p.playerId}-${p.id}`;
    pawnEl.className = `pawn pawn-${p.playerId}`;
    pawnEl.dataset.playerId = p.playerId;
    pawnEl.dataset.pawnId = p.id;
    
    boardOverlays.appendChild(pawnEl);
  });
  renderPawns();
}

function renderPawns() {
  const cellPawnMap = {};

  state.pawns.forEach(p => {
    if (p.state === 'goal') return;

    const coords = getPawnCoords(p);
    const key = `${coords.x},${coords.y}`;

    if (!cellPawnMap[key]) {
      cellPawnMap[key] = [];
    }
    
    const el = document.getElementById(`pawn-${p.playerId}-${p.id}`);
    if (el) {
      cellPawnMap[key].push(el);
      el.className = `pawn pawn-${p.playerId}`;
      el.style.transform = '';
    }
  });

  for (const key in cellPawnMap) {
    const elements = cellPawnMap[key];
    const [x, y] = key.split(',').map(Number);
    const count = elements.length;

    elements.forEach((el, index) => {
      el.style.left = `calc(${x} * 100% / 15 + 2px)`;
      el.style.top = `calc(${y} * 100% / 15 + 2px)`;

      if (count > 1) {
        el.classList.add(`stacked-offset-${index}`);
      }
    });
  }

  // Position goal pawns neatly
  PLAYER_KEYS.forEach(key => {
    const goalPawns = state.pawns.filter(p => p.playerId === key && p.state === 'goal');
    const cfg = PLAYERS_CFG[key];
    
    goalPawns.forEach((p, index) => {
      const el = document.getElementById(`pawn-${p.playerId}-${p.id}`);
      if (el) {
        el.className = `pawn pawn-${p.playerId}`;
        el.style.left = `calc(${cfg.goalPoint.x} * 100% / 15 + 2px)`;
        el.style.top = `calc(${cfg.goalPoint.y} * 100% / 15 + 2px)`;
        el.style.transform = `scale(0.65) translate(${(index % 2) * 10 - 5}px, ${Math.floor(index / 2) * 10 - 5}px)`;
      }
    });
  });
}

function getPawnCoords(pawn) {
  const cfg = PLAYERS_CFG[pawn.playerId];
  if (pawn.state === 'base') {
    return cfg.basePockets[pawn.position];
  } else if (pawn.state === 'track') {
    return TRACK[pawn.position];
  } else if (pawn.state === 'home') {
    return cfg.homePath[pawn.position];
  } else if (pawn.state === 'goal') {
    return cfg.goalPoint;
  }
  return {x: 0, y: 0};
}

// Start player's turn
function startPlayerTurn() {
  if (state.phase !== 'PLAYING') {
    if (state.phase === 'FINISHED') handleVictory();
    return;
  }

  const pKey = state.getActivePlayerKey();
  const player = state.getActivePlayer();

  diceCube.className = `dice-cube show-${state.diceValue}`;
  turnIndicator.className = `active-player-indicator ${pKey}`;
  turnPlayerName.textContent = player.name;

  clearPawnHighlights();
  updateScoreboard();

  if (player.type === 'human') {
    rollBtn.disabled = false;
    rollBtn.textContent = 'Rzuć Kostką';
    turnMessage.textContent = 'Rzuć kostką';
  } else {
    rollBtn.disabled = true;
    rollBtn.textContent = 'Rzut bota...';
    turnMessage.textContent = 'Bot rzuca...';
    aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
  }
}

// Human Roll
function handleHumanRoll() {
  if (state.phase !== 'PLAYING' || isAnimating) return;
  rollBtn.disabled = true;
  rollBtn.textContent = '...';
  const roll = state.rollDice();
  animateDiceRoll(roll, () => {
    if (state.phase !== 'PLAYING') return;
    handleRollResult();
  });
}

// AI Roll
function handleAIRoll() {
  if (state.phase !== 'PLAYING' || isAnimating) return;
  const roll = state.rollDice();
  animateDiceRoll(roll, () => {
    if (state.phase !== 'PLAYING') return;
    handleRollResult();
  });
}

// 3D Dice Animation
function animateDiceRoll(finalValue, callback) {
  audio.playRoll();
  diceCube.className = 'dice-cube rolling';
  
  setTimeout(() => {
    if (state.phase !== 'PLAYING') return;
    diceCube.className = `dice-cube show-${finalValue}`;

    setTimeout(() => {
      if (state.phase !== 'PLAYING') return;
      callback();
    }, 700);
  }, 600);
}

// Process roll results
function handleRollResult() {
  if (state.phase !== 'PLAYING') return;
  const val = state.diceValue;
  diceCube.className = `dice-cube show-${val}`;
  
  const validMoves = state.getValidMoves();
  const player = state.getActivePlayer();
  const key = state.getActivePlayerKey();

  if (validMoves.length === 0) {
    const maxRolls = state.getMaxRollsForCurrentTurn();
    const remainingRolls = maxRolls - state.rollCount;

    if (remainingRolls > 0) {
      turnMessage.textContent = `Brak ruchu. Rzut ${state.rollCount}/${maxRolls}`;
      
      if (player.type === 'human') {
        rollBtn.disabled = false;
        rollBtn.textContent = 'Rzuć Ponownie';
      } else {
        aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
      }
    } else {
      turnMessage.textContent = 'Brak ruchu';
      
      aiTimeoutId = setTimeout(() => {
        if (state.phase !== 'PLAYING') return;
        state.endTurn();
        startPlayerTurn();
      }, currentSpeed.rollDelay);
    }
  } else {
    if (player.type === 'human') {
      turnMessage.textContent = `Wybierz pionek (+${val})`;
      highlightSelectablePawns(validMoves);
    } else {
      aiTimeoutId = setTimeout(() => {
        if (state.phase !== 'PLAYING') return;
        const bestPawn = state.getBestAIMove();
        executePawnMovement(bestPawn);
      }, currentSpeed.moveDelay);
    }
  }
}

function highlightSelectablePawns(pawns) {
  pawns.forEach(p => {
    const el = document.getElementById(`pawn-${p.playerId}-${p.id}`);
    if (el) {
      el.classList.add('selectable');
      el.style.pointerEvents = 'auto';
      
      const clickHandler = () => {
        if (isAnimating || state.phase !== 'PLAYING') return;
        clearPawnHighlights();
        executePawnMovement(p);
      };
      
      el._clickHandler = clickHandler;
      el.addEventListener('click', clickHandler);
    }
  });
}

function clearPawnHighlights() {
  state.pawns.forEach(p => {
    const el = document.getElementById(`pawn-${p.playerId}-${p.id}`);
    if (el) {
      el.classList.remove('selectable');
      if (el._clickHandler) {
        el.removeEventListener('click', el._clickHandler);
        el._clickHandler = null;
      }
    }
  });
}

function calculatePawnPathCoords(pawn, diceVal) {
  const coordsPath = [];
  const cfg = PLAYERS_CFG[pawn.playerId];
  
  if (pawn.state === 'base') {
    coordsPath.push(TRACK[cfg.startIndex]);
  } else if (pawn.state === 'track') {
    for (let i = 1; i <= diceVal; i++) {
      const step = pawn.stepCount + i;
      if (step <= 50) {
        coordsPath.push(TRACK[(pawn.position + i) % 52]);
      } else if (step < 56) {
        coordsPath.push(cfg.homePath[step - 51]);
      } else {
        coordsPath.push(cfg.goalPoint);
      }
    }
  } else if (pawn.state === 'home') {
    for (let i = 1; i <= diceVal; i++) {
      const nextPos = pawn.position + i;
      if (nextPos < 5) {
        coordsPath.push(cfg.homePath[nextPos]);
      } else {
        coordsPath.push(cfg.goalPoint);
      }
    }
  }
  return coordsPath;
}

// Animate pawn step-by-step
async function executePawnMovement(pawn) {
  if (!pawn || state.phase !== 'PLAYING') return;
  isAnimating = true;
  const coordsPath = calculatePawnPathCoords(pawn, state.diceValue);
  const el = document.getElementById(`pawn-${pawn.playerId}-${pawn.id}`);
  
  if (el) {
    el.className = `pawn pawn-${pawn.playerId}`;
  }

  for (let i = 0; i < coordsPath.length; i++) {
    if (state.phase !== 'PLAYING') {
      isAnimating = false;
      return;
    }
    const coords = coordsPath[i];
    
    await new Promise(resolve => {
      audio.playMove();
      if (el) {
        el.style.left = `calc(${coords.x} * 100% / 15 + 2px)`;
        el.style.top = `calc(${coords.y} * 100% / 15 + 2px)`;
      }
      setTimeout(resolve, currentSpeed.animStep);
    });
  }

  if (state.phase !== 'PLAYING') {
    isAnimating = false;
    return;
  }

  const result = state.movePawn(pawn);
  
  if (result) {
    if (pawn.state === 'goal') {
      showToast('🏁 Pionek na mecie!', pawn.playerId);
    }

    if (result.captureEvent) {
      audio.playCapture();
      showToast('💥 Zbicie pionka!', result.captureEvent.attacker);
    }
  }

  renderPawns();
  isAnimating = false;

  const turnChanged = state.endTurn();

  if (state.phase === 'FINISHED') {
    handleVictory();
  } else {
    if (!turnChanged && state.diceValue === 6) {
      showToast('🎲 Szóstka! Dodatkowy rzut', state.getActivePlayerKey());
    }
    startPlayerTurn();
  }
}

// Render dynamic scoreboard
function updateScoreboard() {
  scoreboardList.innerHTML = '';

  PLAYER_KEYS.forEach(key => {
    const player = state.players[key];
    if (!player?.active) return;

    const pawns = state.pawns.filter(p => p.playerId === key);
    const card = document.createElement('div');
    card.className = `score-card ${key}`;

    if (state.getActivePlayerKey() === key && state.phase === 'PLAYING') {
      card.style.borderColor = `var(--${key}-color)`;
      card.style.boxShadow = `0 0 12px var(--${key}-glow)`;
    }

    const info = document.createElement('div');
    info.className = 'score-player-info';
    
    const dot = document.createElement('div');
    dot.className = `score-color-dot ${key}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'score-player-name';
    nameSpan.textContent = player.name;

    const typeTag = document.createElement('span');
    typeTag.className = 'score-type-tag';
    typeTag.textContent = player.type === 'human' ? 'G' : 'BOT';

    info.appendChild(dot);
    info.appendChild(nameSpan);
    info.appendChild(typeTag);

    const pawnsDiv = document.createElement('div');
    pawnsDiv.className = 'score-pawns-container';

    pawns.forEach(p => {
      const pDot = document.createElement('div');
      pDot.className = 'score-pawn-dot';
      pDot.textContent = p.id + 1;
      
      if (p.state === 'base') pDot.classList.add('in-base');
      if (p.state === 'track' || p.state === 'home') pDot.classList.add('on-track');
      if (p.state === 'goal') pDot.classList.add('at-goal');

      pawnsDiv.appendChild(pDot);
    });

    card.appendChild(info);
    card.appendChild(pawnsDiv);
    scoreboardList.appendChild(card);
  });
}

// Victory handling
function handleVictory() {
  audio.playWin();
  const winner = state.players[state.winner];
  
  winnerTitle.textContent = `Zwycięstwo!`;
  winnerMessage.innerHTML = `🏆 Gracz <strong>${winner.name}</strong> doprowadził wszystkie pionki na metę!`;
  
  victoryModal.classList.remove('hidden');
  startConfetti();
}

// Confetti animation
function setupConfettiCanvas() {
  if (!confettiCanvas) return;
  confettiCtx = confettiCanvas.getContext('2d');
  resizeConfettiCanvas();
  window.addEventListener('resize', resizeConfettiCanvas);
}

function resizeConfettiCanvas() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function startConfetti() {
  if (!confettiCanvas || !confettiCtx) return;
  resizeConfettiCanvas();
  confettiParticles = [];
  const colors = ['#ff334b', '#10b981', '#f59e0b', '#0ea5e9', '#ffffff', '#a855f7'];

  for (let i = 0; i < 150; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 6
    });
  }

  function loop() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y > confettiCanvas.height) {
        p.y = -10;
        p.x = Math.random() * confettiCanvas.width;
      }

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    });

    confettiAnimId = requestAnimationFrame(loop);
  }

  loop();
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  if (confettiCtx && confettiCanvas) {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}
