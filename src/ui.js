import { GameState, TRACK, PLAYERS_CFG, PLAYER_KEYS } from './game.js';
import { audio } from './audio.js';

// DOM elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const boardGrid = document.getElementById('board-grid');
const boardOverlays = document.getElementById('board-overlays');

const startBtn = document.getElementById('start-game-btn');
const rollBtn = document.getElementById('roll-dice-btn');
const diceCube = document.getElementById('dice-cube');
const turnPlayerName = document.getElementById('active-player-name');
const turnIndicator = document.getElementById('active-player-indicator');
const turnMessage = document.getElementById('turn-message');

const scoreboardList = document.getElementById('scoreboard-list');
const consoleLogs = document.getElementById('console-logs');
const clearConsoleBtn = document.getElementById('clear-console-btn');

const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const restartBtn = document.getElementById('restart-game-btn');

const victoryModal = document.getElementById('victory-modal');
const winnerTitle = document.getElementById('winner-title');
const winnerMessage = document.getElementById('winner-message');
const victoryRestartBtn = document.getElementById('victory-restart-btn');

// Game state instance
const state = new GameState();

// AI Speed configurations (ms)
const SPEED_PRESETS = {
  1: { rollDelay: 1200, moveDelay: 400, animStep: 250 }, // Slow
  2: { rollDelay: 700,  moveDelay: 250, animStep: 150 }, // Normal
  3: { rollDelay: 300,  moveDelay: 100, animStep: 80 },  // Fast
  4: { rollDelay: 50,   moveDelay: 10,  animStep: 1 }    // Ultra/Instant
};

let currentSpeed = SPEED_PRESETS[2];
let isAnimating = false;
let aiTimeoutId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initUIListeners();
  generateBoardGrid();
  updateAudioButtonText();
});

// Setup click and input listeners
function initUIListeners() {
  startBtn.addEventListener('click', handleStartGame);
  rollBtn.addEventListener('click', handleHumanRoll);
  clearConsoleBtn.addEventListener('click', () => { consoleLogs.innerHTML = ''; });
  
  speedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    currentSpeed = SPEED_PRESETS[val];
    const labels = { 1: 'Wolna', 2: 'Normalna', 3: 'Szybka', 4: 'Błyskawiczna' };
    speedLabel.textContent = labels[val];
  });

  audioToggleBtn.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    updateAudioButtonText();
    // Warm context on click
    audio.init();
  });

  document.getElementById('cheat-win-btn').addEventListener('click', () => {
    window.cheatWin(state.getActivePlayerKey());
  });

  restartBtn.addEventListener('click', () => {
    if (confirm('Czy na pewno chcesz zresetować grę i wrócić do ustawień?')) {
      resetToSetup();
    }
  });

  victoryRestartBtn.addEventListener('click', () => {
    victoryModal.classList.add('hidden');
    resetToSetup();
  });

  // Make 3D dice cube clickable as well
  document.getElementById('dice-3d-wrapper').addEventListener('click', () => {
    if (!rollBtn.disabled) {
      handleHumanRoll();
    }
  });
}

function updateAudioButtonText() {
  audioToggleBtn.innerHTML = audio.isMuted() ? '🔇 Wyciszony' : '🔊 Dźwięk';
  audioToggleBtn.style.opacity = audio.isMuted() ? '0.6' : '1';
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
      // 5. Center Goal (3x3 area)
      if (row === 6 && col === 6) {
        boardGrid.appendChild(createCenterGoalCell());
        continue;
      }

      // 6. Individual Track or Home Cell
      const cell = document.createElement('div');
      cell.style.gridColumn = col + 1;
      cell.style.gridRow = row + 1;
      cell.className = 'board-cell';

      // Identify track cell indices
      const trackIdx = TRACK.findIndex(c => c.x === col && c.y === row);
      if (trackIdx !== -1) {
        cell.classList.add('cell-track');
        cell.dataset.trackIndex = trackIdx;

        // Highlight starting positions
        if (trackIdx === PLAYERS_CFG.red.startIndex) cell.classList.add('cell-start-red');
        if (trackIdx === PLAYERS_CFG.green.startIndex) cell.classList.add('cell-start-green');
        if (trackIdx === PLAYERS_CFG.yellow.startIndex) cell.classList.add('cell-start-yellow');
        if (trackIdx === PLAYERS_CFG.blue.startIndex) cell.classList.add('cell-start-blue');
      }

      // Identify home paths
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
  
  // Grey out base if player is disabled/off
  if (state.phase !== 'SETUP' && !state.players[color].active) {
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

  const redActive = state.phase === 'SETUP' || state.players.red.active;
  const greenActive = state.phase === 'SETUP' || state.players.green.active;
  const yellowActive = state.phase === 'SETUP' || state.players.yellow.active;
  const blueActive = state.phase === 'SETUP' || state.players.blue.active;

  // Inline SVG for triangles pointing to center
  center.innerHTML = `
    <svg viewBox="0 0 100 100" class="center-svg">
      <!-- Left Triangle (Red) -->
      <polygon points="0,0 50,50 0,100" fill="var(--red-color-dark)" stroke="var(--red-color)" stroke-width="1.5" style="opacity: ${redActive ? 0.8 : 0.05}" />
      ${redActive ? '<text x="12" y="54" fill="var(--text-primary)" font-size="12" font-weight="bold">🔴</text>' : ''}
      
      <!-- Top Triangle (Green) -->
      <polygon points="0,0 50,50 100,0" fill="var(--green-color-dark)" stroke="var(--green-color)" stroke-width="1.5" style="opacity: ${greenActive ? 0.8 : 0.05}" />
      ${greenActive ? '<text x="42" y="24" fill="var(--text-primary)" font-size="12" font-weight="bold">🟢</text>' : ''}
      
      <!-- Right Triangle (Yellow) -->
      <polygon points="100,0 50,50 100,100" fill="var(--yellow-color-dark)" stroke="var(--yellow-color)" stroke-width="1.5" style="opacity: ${yellowActive ? 0.8 : 0.05}" />
      ${yellowActive ? '<text x="72" y="54" fill="var(--text-primary)" font-size="12" font-weight="bold">🟡</text>' : ''}
      
      <!-- Bottom Triangle (Blue) -->
      <polygon points="0,100 50,50 100,100" fill="var(--blue-color-dark)" stroke="var(--blue-color)" stroke-width="1.5" style="opacity: ${blueActive ? 0.8 : 0.05}" />
      ${blueActive ? '<text x="42" y="86" fill="var(--text-primary)" font-size="12" font-weight="bold">🔵</text>' : ''}
    </svg>
  `;
  return center;
}

// Start Game from setup configuration
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

  // Count active players
  const activeCount = Object.values(cfg).filter(p => p.type !== 'off').length;
  if (activeCount < 2) {
    alert('Do gry wymaganych jest przynajmniej 2 aktywnych graczy!');
    return;
  }

  state.setupGame(cfg);
  generateBoardGrid(); // Re-render the board to reflect which bases are active vs inactive
  
  setupScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  logMessage('Rozpoczęto nową grę!', 'success');
  
  // Create pawn elements
  createPawnElements();
  
  // Kickoff turn
  startPlayerTurn();
}

function resetToSetup() {
  clearTimeout(aiTimeoutId);
  state.phase = 'SETUP';
  generateBoardGrid(); // Reset bases back to default active styles
  setupScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  boardOverlays.innerHTML = '';
  isAnimating = false;
}

// Create pawn elements and place them
function createPawnElements() {
  boardOverlays.innerHTML = '';
  state.pawns.forEach(p => {
    // Only create DOM pawn nodes for players who are active in this game session!
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

// Position pawns on the board (including stacking)
function renderPawns() {
  // Map of "x,y" -> Array of pawn elements
  const cellPawnMap = {};

  state.pawns.forEach(p => {
    if (p.state === 'goal') return; // Hide or pile at goal

    const coords = getPawnCoords(p);
    const key = `${coords.x},${coords.y}`;

    if (!cellPawnMap[key]) {
      cellPawnMap[key] = [];
    }
    
    const el = document.getElementById(`pawn-${p.playerId}-${p.id}`);
    if (el) {
      cellPawnMap[key].push(el);
      // Remove any stack offsets
      el.className = `pawn pawn-${p.playerId}`;
      el.style.transform = '';
    }
  });

  // Apply positions & stacking offset coordinates
  for (const key in cellPawnMap) {
    const elements = cellPawnMap[key];
    const [x, y] = key.split(',').map(Number);
    const count = elements.length;

    elements.forEach((el, index) => {
      el.style.left = `calc(${x} * 100% / 15 + 2px)`;
      el.style.top = `calc(${y} * 100% / 15 + 2px)`;

      // Apply staggering offsets for stacks
      if (count > 1) {
        el.classList.add(`stacked-offset-${index}`);
      }
    });
  }

  // Handle goal pawns separately (neat pile at their goal point)
  PLAYER_KEYS.forEach(key => {
    const goalPawns = state.pawns.filter(p => p.playerId === key && p.state === 'goal');
    const cfg = PLAYERS_CFG[key];
    
    goalPawns.forEach((p, index) => {
      const el = document.getElementById(`pawn-${p.playerId}-${p.id}`);
      if (el) {
        el.className = `pawn pawn-${p.playerId}`;
        el.style.left = `calc(${cfg.goalPoint.x} * 100% / 15 + 2px)`;
        el.style.top = `calc(${cfg.goalPoint.y} * 100% / 15 + 2px)`;
        el.style.transform = `scale(0.7) translate(${(index % 2) * 8 - 4}px, ${Math.floor(index / 2) * 8 - 4}px)`;
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

// Start a turn
function startPlayerTurn() {
  if (state.phase === 'FINISHED') {
    handleVictory();
    return;
  }

  const pKey = state.getActivePlayerKey();
  const player = state.getActivePlayer();

  // Reset dice class to match current value without animation
  diceCube.className = `dice-cube show-${state.diceValue}`;
  
  // Highlight active player indicator
  turnIndicator.className = `active-player-indicator ${pKey}`;
  turnPlayerName.textContent = player.name;

  // Clear previous selectable highlights
  clearPawnHighlights();

  updateScoreboard();

  if (player.type === 'human') {
    rollBtn.disabled = false;
    rollBtn.textContent = 'Rzuć Kostką';
    turnMessage.textContent = 'Twoja tura! Rzuć kostką.';
  } else {
    // AI Turn
    rollBtn.disabled = true;
    rollBtn.textContent = 'Komputer Rzuca...';
    turnMessage.textContent = `Tura komputera (${player.name})...`;
    
    // Auto roll after delay
    aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
  }
}

// Human Roll Dice Action
function handleHumanRoll() {
  rollBtn.disabled = true;
  rollBtn.textContent = 'Rzucanie...';
  const roll = state.rollDice();
  animateDiceRoll(roll, () => {
    logMessage(`Gracz ${state.getActivePlayer().name} wyrzucił: **${roll}**`, state.getActivePlayerKey());
    handleRollResult();
  });
}

// AI Roll Dice Action
function handleAIRoll() {
  const roll = state.rollDice();
  animateDiceRoll(roll, () => {
    logMessage(`Komputer ${state.getActivePlayer().name} wyrzucił: **${roll}**`, state.getActivePlayerKey());
    handleRollResult();
  });
}

// Animate dice spinning in 3D
function animateDiceRoll(finalValue, callback) {
  audio.playRoll();
  
  diceCube.className = 'dice-cube rolling';
  
  setTimeout(() => {
    // Land on the exact value we rolled!
    diceCube.className = `dice-cube show-${finalValue}`;

    setTimeout(() => {
      callback();
    }, 1000); // Wait for transition to finish
  }, 800); // Spin for 800ms
}

// Process the roll value and find valid moves
function handleRollResult() {
  const val = state.diceValue;
  diceCube.className = `dice-cube show-${val}`;
  
  const validMoves = state.getValidMoves();
  const player = state.getActivePlayer();
  const key = state.getActivePlayerKey();

  if (validMoves.length === 0) {
    // No moves available
    const maxRolls = state.getMaxRollsForCurrentTurn();
    const remainingRolls = maxRolls - state.rollCount;

    if (remainingRolls > 0) {
      logMessage(`Brak ruchu. Pozostało rzutów: **${remainingRolls}**`, 'system');
      turnMessage.textContent = `Brak ruchu dla wartości ${val}. Rzuć ponownie! (${remainingRolls} szanse)`;
      
      if (player.type === 'human') {
        rollBtn.disabled = false;
        rollBtn.textContent = 'Rzuć Ponownie';
      } else {
        aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
      }
    } else {
      // Out of rolls, pass turn
      logMessage(`Brak dopuszczalnych ruchów dla wartości ${val}. Strata tury.`, 'system');
      turnMessage.textContent = 'Brak dopuszczalnych ruchów. Tura przechodzi dalej.';
      
      setTimeout(() => {
        state.endTurn();
        startPlayerTurn();
      }, currentSpeed.rollDelay);
    }
  } else {
    // Valid moves exist!
    if (player.type === 'human') {
      turnMessage.textContent = `Wybierz pionek, aby przesunąć o ${val} pól.`;
      highlightSelectablePawns(validMoves);
    } else {
      // AI selects and plays move
      aiTimeoutId = setTimeout(() => {
        const bestPawn = state.getBestAIMove();
        executePawnMovement(bestPawn);
      }, currentSpeed.moveDelay);
    }
  }
}

// Highlight pawns that can move
function highlightSelectablePawns(pawns) {
  pawns.forEach(p => {
    const el = document.getElementById(`pawn-${p.playerId}-${p.id}`);
    if (el) {
      el.classList.add('selectable');
      el.style.pointerEvents = 'auto';
      
      // Store listener reference to clean up later
      const clickHandler = () => {
        // Prevent clicking multiple times or during animations
        if (isAnimating) return;
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

// Path calculation for smooth animations
function calculatePawnPathCoords(pawn, diceVal) {
  const coordsPath = [];
  const cfg = PLAYERS_CFG[pawn.playerId];
  
  if (pawn.state === 'base') {
    // Moving out of base to start cell
    coordsPath.push(TRACK[cfg.startIndex]);
  } else if (pawn.state === 'track') {
    // Step by step on perimeter/home path
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
    // Moving inside home path
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

// Animate pawn sliding cell-by-cell
async function executePawnMovement(pawn) {
  isAnimating = true;
  const coordsPath = calculatePawnPathCoords(pawn, state.diceValue);
  const el = document.getElementById(`pawn-${pawn.playerId}-${pawn.id}`);
  
  // Temporary remove stack class for duration of motion
  el.className = `pawn pawn-${pawn.playerId}`;

  // Slide through each intermediate step
  for (let i = 0; i < coordsPath.length; i++) {
    const coords = coordsPath[i];
    
    // Use smaller steps duration for speed slider setting
    await new Promise(resolve => {
      audio.playMove();
      el.style.left = `calc(${coords.x} * 100% / 15 + 2px)`;
      el.style.top = `calc(${coords.y} * 100% / 15 + 2px)`;
      
      setTimeout(resolve, currentSpeed.animStep);
    });
  }

  // Update logic state
  const result = state.movePawn(pawn);
  
  if (result) {
    const player = state.players[pawn.playerId];
    
    if (result.oldState === 'base') {
      logMessage(`Gracz ${player.name} wprowadził pionka na planszę`, pawn.playerId);
    } else if (pawn.state === 'goal') {
      logMessage(`Gracz ${player.name} wprowadził pionka na **METĘ**!`, 'success');
    }

    // Capture (zbijanie) event log and sound trigger
    if (result.captureEvent) {
      audio.playCapture();
      const attackerName = state.players[result.captureEvent.attacker].name;
      const victimName = state.players[result.captureEvent.victim].name;
      
      logMessage(`💥 ZBICIE! **${attackerName}** zbija pionek gracza **${victimName}**!`, 'warning');
      
      // Briefly animate victim flying back to base (snap renders immediately but looks cooler with renderPawns)
      triggerCaptureVisualEffect(result.captureEvent.victim);
    }
  }

  // Render final placement
  renderPawns();
  isAnimating = false;

  // Process turn changes
  const turnChanged = state.endTurn();

  if (state.phase === 'FINISHED') {
    handleVictory();
  } else {
    if (!turnChanged && state.diceValue === 6) {
      logMessage(`Gracz ${state.getActivePlayer().name} wyrzucił 6 - dodatkowy rzut!`, 'system');
    }
    startPlayerTurn();
  }
}

// Visual scale down on capture
function triggerCaptureVisualEffect(victimPlayerId) {
  // Rapid visual snap
  renderPawns();
}

// Render score cards dynamically
function updateScoreboard() {
  scoreboardList.innerHTML = '';

  PLAYER_KEYS.forEach(key => {
    const player = state.players[key];
    if (!player.active) return;

    const pawns = state.pawns.filter(p => p.playerId === key);
    const card = document.createElement('div');
    card.className = `score-card ${key}`;

    if (state.getActivePlayerKey() === key && state.phase === 'PLAYING') {
      card.style.borderColor = `var(--${key}-color)`;
      card.style.boxShadow = `0 0 10px var(--${key}-color-dark)`;
    }

    const info = document.createElement('div');
    info.className = 'score-player-info';
    
    const dot = document.createElement('div');
    dot.className = `score-color-dot ${key}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'score-player-name';
    nameSpan.textContent = player.name;
    if (state.winner === key) nameSpan.classList.add('winner');

    const typeSpan = document.createElement('span');
    typeSpan.className = 'score-type-badge';
    typeSpan.textContent = player.type === 'human' ? 'G' : 'SI';

    info.appendChild(dot);
    info.appendChild(nameSpan);
    info.appendChild(typeSpan);

    const pawnsDiv = document.createElement('div');
    pawnsDiv.className = 'score-pawns-container';

    pawns.forEach(p => {
      const pDot = document.createElement('div');
      pDot.className = 'score-pawn-dot';
      pDot.textContent = p.id + 1; // 1-based display
      
      if (p.state === 'base') pDot.classList.add('in-base');
      if (p.state === 'track') pDot.classList.add('on-track');
      if (p.state === 'home') pDot.classList.add('on-track');
      if (p.state === 'goal') pDot.classList.add('at-goal');

      pawnsDiv.appendChild(pDot);
    });

    card.appendChild(info);
    card.appendChild(pawnsDiv);
    scoreboardList.appendChild(card);
  });
}

// Log messages to history console
function logMessage(text, type = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  // Format markdown-like bold strings **text** to <strong>text</strong>
  const htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  entry.innerHTML = `<span style="opacity: 0.4">[${timestamp}]</span> ${htmlText}`;
  
  consoleLogs.appendChild(entry);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

// Handle end of game
function handleVictory() {
  audio.playWin();
  const winnerName = state.players[state.winner].name;
  
  winnerTitle.textContent = `Mamy Zwycięzcę!`;
  winnerMessage.innerHTML = `🏆 Komputer / Gracz <strong>${winnerName}</strong> doprowadził wszystkie pionki na metę i wygrał grę! Gratulacje!`;
  
  victoryModal.classList.remove('hidden');
  logMessage(`🏆 GRACZ **${winnerName}** WYGRAŁ GRĘ! 🏆`, 'success');
}

// Global debug helper to verify victory programmatically
window.cheatWin = (color = 'red') => {
  state.pawns.forEach(p => {
    if (p.playerId === color) {
      p.state = 'goal';
      p.position = 0;
      p.stepCount = 56;
    }
  });
  state.phase = 'FINISHED';
  state.winner = color;
  handleVictory();
  updateScoreboard();
  renderPawns();
};
