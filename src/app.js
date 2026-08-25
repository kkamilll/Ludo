// ============================================================================
// Ludo - Classic Board Game Controller (English, No Audio)
// ============================================================================

(function() {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Board Geometry & Data Constants (Exact match to 11x11 reference image)
  // --------------------------------------------------------------------------
  const TRACK = [
    {x: 0, y: 4},  // 0: Red Start
    {x: 1, y: 4},  // 1
    {x: 2, y: 4},  // 2
    {x: 3, y: 4},  // 3
    {x: 4, y: 3},  // 4
    {x: 4, y: 2},  // 5
    {x: 4, y: 1},  // 6
    {x: 4, y: 0},  // 7
    {x: 5, y: 0},  // 8
    {x: 6, y: 0},  // 9: Blue Start
    {x: 6, y: 1},  // 10
    {x: 6, y: 2},  // 11
    {x: 6, y: 3},  // 12
    {x: 7, y: 4},  // 13
    {x: 8, y: 4},  // 14
    {x: 9, y: 4},  // 15
    {x: 10, y: 4}, // 16
    {x: 10, y: 5}, // 17
    {x: 10, y: 6}, // 18: Green Start
    {x: 9, y: 6},  // 19
    {x: 8, y: 6},  // 20
    {x: 7, y: 6},  // 21
    {x: 6, y: 7},  // 22
    {x: 6, y: 8},  // 23
    {x: 6, y: 9},  // 24
    {x: 6, y: 10}, // 25
    {x: 5, y: 10}, // 26
    {x: 4, y: 10}, // 27: Yellow Start
    {x: 4, y: 9},  // 28
    {x: 4, y: 8},  // 29
    {x: 4, y: 7},  // 30
    {x: 3, y: 6},  // 31
    {x: 2, y: 6},  // 32
    {x: 1, y: 6},  // 33
    {x: 0, y: 6},  // 34
    {x: 0, y: 5}   // 35
  ];

  const PLAYERS_CFG = {
    red: {
      colorName: 'Red',
      colorHex: '#e51b24',
      lightHex: '#ff8a8a',
      startIndex: 0,
      lastIndex: 35,
      homePath: [{x:1, y:5}, {x:2, y:5}, {x:3, y:5}, {x:4, y:5}],
      basePockets: [{x:0.7, y:0.7}, {x:1.7, y:0.7}, {x:0.7, y:1.7}, {x:1.7, y:1.7}],
      arrow: { x1: 0.8, y1: 3.3, x2: 2.2, y2: 3.3 }
    },
    blue: {
      colorName: 'Blue',
      colorHex: '#1b4de5',
      lightHex: '#7288ff',
      startIndex: 9,
      lastIndex: 8,
      homePath: [{x:5, y:1}, {x:5, y:2}, {x:5, y:3}, {x:5, y:4}],
      basePockets: [{x:8.7, y:0.7}, {x:9.7, y:0.7}, {x:8.7, y:1.7}, {x:9.7, y:1.7}],
      arrow: { x1: 7.7, y1: 0.8, x2: 7.7, y2: 2.2 }
    },
    green: {
      colorName: 'Green',
      colorHex: '#1ba824',
      lightHex: '#66e066',
      startIndex: 18,
      lastIndex: 17,
      homePath: [{x:9, y:5}, {x:8, y:5}, {x:7, y:5}, {x:6, y:5}],
      basePockets: [{x:8.7, y:8.7}, {x:9.7, y:8.7}, {x:8.7, y:9.7}, {x:9.7, y:9.7}],
      arrow: { x1: 10.2, y1: 7.7, x2: 8.8, y2: 7.7 }
    },
    yellow: {
      colorName: 'Yellow',
      colorHex: '#f5d41b',
      lightHex: '#ffff7a',
      startIndex: 27,
      lastIndex: 26,
      homePath: [{x:5, y:9}, {x:5, y:8}, {x:5, y:7}, {x:5, y:6}],
      basePockets: [{x:0.7, y:8.7}, {x:1.7, y:8.7}, {x:0.7, y:9.7}, {x:1.7, y:9.7}],
      arrow: { x1: 3.3, y1: 10.2, x2: 3.3, y2: 8.8 }
    }
  };

  const PLAYER_KEYS = ['red', 'blue', 'green', 'yellow'];

  // --------------------------------------------------------------------------
  // 2. Game Logic State
  // --------------------------------------------------------------------------
  class GameState {
    constructor() {
      this.players = {};
      this.pawns = [];
      this.activePlayerIdx = 0;
      this.diceValue = 1;
      this.rollCount = 0;
      this.consecutiveSixes = 0;
      this.hasRolled = false;
      this.phase = 'SETUP';
      this.winner = null;
      this.initPawns();
    }

    initPawns() {
      this.pawns = [];
      PLAYER_KEYS.forEach(playerId => {
        for (let i = 0; i < 4; i++) {
          this.pawns.push({
            id: i,
            playerId: playerId,
            state: 'base',
            position: i,
            stepCount: -1
          });
        }
      });
    }

    setupGame(playersConfig) {
      PLAYER_KEYS.forEach(key => {
        this.players[key] = {
          name: playersConfig[key].name || PLAYERS_CFG[key].colorName,
          type: playersConfig[key].type,
          active: playersConfig[key].type !== 'off'
        };
      });

      this.initPawns();
      this.phase = 'PLAYING';
      this.winner = null;
      this.diceValue = 1;
      this.rollCount = 0;
      this.consecutiveSixes = 0;
      this.hasRolled = false;

      this.activePlayerIdx = PLAYER_KEYS.findIndex(key => this.players[key].active);
      if (this.activePlayerIdx === -1) {
        this.players.red.active = true;
        this.players.red.type = 'human';
        this.activePlayerIdx = 0;
      }
    }

    getActivePlayerKey() {
      return PLAYER_KEYS[this.activePlayerIdx];
    }

    getActivePlayer() {
      return this.players[this.getActivePlayerKey()];
    }

    hasNoPawnsOnTrack(playerId) {
      return this.pawns
        .filter(p => p.playerId === playerId)
        .every(p => p.state === 'base' || p.state === 'home');
    }

    hasFinished(playerId) {
      return this.pawns
        .filter(p => p.playerId === playerId)
        .every(p => p.state === 'home');
    }

    getMaxRollsForCurrentTurn() {
      const key = this.getActivePlayerKey();
      if (this.hasNoPawnsOnTrack(key)) {
        return 3;
      }
      return 1;
    }

    rollDice(forcedValue = null) {
      this.diceValue = forcedValue || Math.floor(Math.random() * 6) + 1;
      this.hasRolled = true;
      this.rollCount++;

      if (this.diceValue === 6) {
        this.consecutiveSixes++;
      }

      return this.diceValue;
    }

    isValidMove(pawn, diceVal) {
      if (pawn.playerId !== this.getActivePlayerKey()) return false;

      const cfg = PLAYERS_CFG[pawn.playerId];

      if (pawn.state === 'base') {
        if (diceVal !== 6) return false;
        const isStartOccupiedBySelf = this.pawns.some(
          p => p.playerId === pawn.playerId && p.state === 'track' && p.position === cfg.startIndex
        );
        return !isStartOccupiedBySelf;
      }

      if (pawn.state === 'track') {
        const nextStepCount = pawn.stepCount + diceVal;

        if (nextStepCount <= 35) {
          const nextPosition = (pawn.position + diceVal) % 36;
          const isOccupiedBySelf = this.pawns.some(
            p => p.playerId === pawn.playerId && p.state === 'track' && p.position === nextPosition
          );
          return !isOccupiedBySelf;
        } else if (nextStepCount <= 39) {
          const homeIndex = nextStepCount - 36;
          const isOccupiedBySelf = this.pawns.some(
            p => p.playerId === pawn.playerId && p.state === 'home' && p.position === homeIndex
          );
          return !isOccupiedBySelf;
        } else {
          return false;
        }
      }

      if (pawn.state === 'home') {
        const nextHomeIndex = pawn.position + diceVal;
        if (nextHomeIndex <= 3) {
          const isOccupiedBySelf = this.pawns.some(
            p => p.playerId === pawn.playerId && p.state === 'home' && p.position === nextHomeIndex
          );
          return !isOccupiedBySelf;
        }
        return false;
      }

      return false;
    }

    getValidMoves() {
      if (!this.hasRolled) return [];
      return this.pawns.filter(p => this.isValidMove(p, this.diceValue));
    }

    movePawn(pawn) {
      if (!this.isValidMove(pawn, this.diceValue)) return null;

      const cfg = PLAYERS_CFG[pawn.playerId];
      const diceVal = this.diceValue;
      let captureEvent = null;
      let oldState = pawn.state;
      let oldPos = pawn.position;

      if (pawn.state === 'base') {
        pawn.state = 'track';
        pawn.position = cfg.startIndex;
        pawn.stepCount = 0;
      } else if (pawn.state === 'track') {
        const nextStepCount = pawn.stepCount + diceVal;
        if (nextStepCount <= 35) {
          pawn.position = (pawn.position + diceVal) % 36;
          pawn.stepCount = nextStepCount;
        } else {
          pawn.state = 'home';
          pawn.position = nextStepCount - 36;
          pawn.stepCount = nextStepCount;
        }
      } else if (pawn.state === 'home') {
        const nextHomeIndex = pawn.position + diceVal;
        pawn.position = nextHomeIndex;
        pawn.stepCount = 36 + nextHomeIndex;
      }

      if (pawn.state === 'track') {
        const opponentPawns = this.pawns.filter(
          p => p.playerId !== pawn.playerId && p.state === 'track' && p.position === pawn.position
        );

        if (opponentPawns.length > 0) {
          opponentPawns.forEach(oppPawn => {
            this.returnPawnToBase(oppPawn);
          });
          captureEvent = {
            attacker: pawn.playerId,
            victim: opponentPawns[0].playerId,
            count: opponentPawns.length,
            cellIndex: pawn.position
          };
        }
      }

      if (this.hasFinished(pawn.playerId)) {
        this.phase = 'FINISHED';
        this.winner = pawn.playerId;
      }

      return {
        pawn,
        oldState,
        oldPos,
        captureEvent,
        rolledSix: diceVal === 6
      };
    }

    returnPawnToBase(pawn) {
      pawn.state = 'base';
      pawn.stepCount = -1;

      const occupiedSlots = this.pawns
        .filter(p => p.playerId === pawn.playerId && p.state === 'base' && p !== pawn)
        .map(p => p.position);
      
      let freeSlot = 0;
      for (let i = 0; i < 4; i++) {
        if (!occupiedSlots.includes(i)) {
          freeSlot = i;
          break;
        }
      }
      pawn.position = freeSlot;
    }

    endTurn() {
      this.hasRolled = false;
      this.rollCount = 0;

      const rolledSix = this.diceValue === 6;
      const tooManySixes = this.consecutiveSixes >= 3;

      if (rolledSix && !tooManySixes && this.phase === 'PLAYING') {
        return false;
      }

      this.consecutiveSixes = 0;
      let nextIdx = this.activePlayerIdx;
      
      do {
        nextIdx = (nextIdx + 1) % PLAYER_KEYS.length;
      } while (!this.players[PLAYER_KEYS[nextIdx]].active && nextIdx !== this.activePlayerIdx);

      this.activePlayerIdx = nextIdx;
      return true;
    }

    getBestAIMove() {
      const validMoves = this.getValidMoves();
      if (validMoves.length === 0) return null;
      if (validMoves.length === 1) return validMoves[0];

      const scoredMoves = validMoves.map(pawn => {
        let score = 0;
        const cfg = PLAYERS_CFG[pawn.playerId];
        const diceVal = this.diceValue;

        if (pawn.state === 'track') {
          const nextPos = (pawn.position + diceVal) % 36;
          const willCapture = this.pawns.some(
            p => p.playerId !== pawn.playerId && p.state === 'track' && p.position === nextPos
          );
          if (willCapture) score += 1000;
        } else if (pawn.state === 'base') {
          const willCapture = this.pawns.some(
            p => p.playerId !== pawn.playerId && p.state === 'track' && p.position === cfg.startIndex
          );
          if (willCapture) score += 1000;
        }

        if (pawn.state === 'base' && diceVal === 6) score += 600;
        const nextStep = pawn.stepCount + diceVal;
        if (pawn.state === 'track' && nextStep >= 36) score += 400;
        if (pawn.state === 'track' && this.isPawnThreatened(pawn)) score += 300;
        if (pawn.state === 'track') score += pawn.stepCount * 2;
        else if (pawn.state === 'home') score += pawn.stepCount;

        return { pawn, score };
      });

      scoredMoves.sort((a, b) => b.score - a.score);
      return scoredMoves[0].pawn;
    }

    isPawnThreatened(pawn) {
      if (pawn.state !== 'track') return false;
      return this.pawns.some(opp => {
        if (opp.playerId === pawn.playerId || opp.state !== 'track') return false;
        const dist = (pawn.position - opp.position + 36) % 36;
        return dist > 0 && dist <= 6;
      });
    }
  }

  // --------------------------------------------------------------------------
  // 3. UI Controller & SVG Board Generation
  // --------------------------------------------------------------------------
  const setupScreen = document.getElementById('setup-screen');
  const gameScreen = document.getElementById('game-screen');
  const boardSvg = document.getElementById('board-svg');
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

  const victoryModal = document.getElementById('victory-modal');
  const winnerTitle = document.getElementById('winner-title');
  const winnerMessage = document.getElementById('winner-message');
  const victoryRestartBtn = document.getElementById('victory-restart-btn');

  const state = new GameState();

  const SPEED_PRESETS = {
    1: { rollDelay: 900, moveDelay: 300, animStep: 180 }, // Slow
    2: { rollDelay: 500, moveDelay: 160, animStep: 110 }, // Normal
    3: { rollDelay: 200, moveDelay: 60,  animStep: 50 },  // Fast
    4: { rollDelay: 30,  moveDelay: 10,  animStep: 1 }    // Instant
  };

  let currentSpeed = SPEED_PRESETS[2];
  let isAnimating = false;
  let aiTimeoutId = null;
  let toastTimeoutId = null;

  function init() {
    initUIListeners();
    initTypePills();
    renderSvgBoard();
  }

  function initUIListeners() {
    startBtn.addEventListener('click', handleStartGame);
    rollBtn.addEventListener('click', handleHumanRoll);
    
    speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      currentSpeed = SPEED_PRESETS[val];
      const labels = { 1: 'Slow', 2: 'Normal', 3: 'Fast', 4: 'Instant' };
      speedLabel.textContent = labels[val];
    });

    victoryRestartBtn.addEventListener('click', () => {
      victoryModal.classList.add('hidden');
      resetToSetup();
    });

    document.getElementById('dice-3d-wrapper').addEventListener('click', () => {
      if (!rollBtn.disabled && state.phase === 'PLAYING' && state.getActivePlayer().type === 'human') {
        handleHumanRoll();
      }
    });

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

  function showToast(text, colorKey = 'default') {
    clearTimeout(toastTimeoutId);
    eventToast.textContent = text;
    eventToast.className = 'event-toast';
    if (colorKey !== 'default') {
      eventToast.style.borderColor = `var(--${colorKey}-color)`;
    } else {
      eventToast.style.borderColor = 'rgba(0,0,0,0.4)';
    }
    eventToast.classList.remove('hidden');

    toastTimeoutId = setTimeout(() => {
      eventToast.classList.add('hidden');
    }, 1800);
  }

  function renderSvgBoard() {
    const toPx = (val) => val * 100 + 50;
    let svgHtml = '';

    // Board background
    svgHtml += `<rect width="1100" height="1100" fill="#d2b48c" stroke="#000" stroke-width="12" rx="16" />`;

    // Connecting lines
    svgHtml += `<g stroke="#000" stroke-width="5" fill="none">`;
    
    for (let i = 0; i < TRACK.length; i++) {
      const p1 = TRACK[i];
      const p2 = TRACK[(i + 1) % TRACK.length];
      svgHtml += `<line x1="${toPx(p1.x)}" y1="${toPx(p1.y)}" x2="${toPx(p2.x)}" y2="${toPx(p2.y)}" />`;
    }

    svgHtml += `<line x1="${toPx(0)}" y1="${toPx(5)}" x2="${toPx(1)}" y2="${toPx(5)}" />`;
    svgHtml += `<line x1="${toPx(1)}" y1="${toPx(5)}" x2="${toPx(4)}" y2="${toPx(5)}" />`;

    svgHtml += `<line x1="${toPx(5)}" y1="${toPx(0)}" x2="${toPx(5)}" y2="${toPx(1)}" />`;
    svgHtml += `<line x1="${toPx(5)}" y1="${toPx(1)}" x2="${toPx(5)}" y2="${toPx(4)}" />`;

    svgHtml += `<line x1="${toPx(10)}" y1="${toPx(5)}" x2="${toPx(9)}" y2="${toPx(5)}" />`;
    svgHtml += `<line x1="${toPx(9)}" y1="${toPx(5)}" x2="${toPx(6)}" y2="${toPx(5)}" />`;

    svgHtml += `<line x1="${toPx(5)}" y1="${toPx(10)}" x2="${toPx(5)}" y2="${toPx(9)}" />`;
    svgHtml += `<line x1="${toPx(5)}" y1="${toPx(9)}" x2="${toPx(5)}" y2="${toPx(6)}" />`;

    svgHtml += `</g>`;

    // Arrows
    svgHtml += `
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="7" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
        </marker>
      </defs>
      <g stroke="#000" stroke-width="4" fill="none">
        <line x1="${toPx(0.8)}" y1="${toPx(3.3)}" x2="${toPx(2.2)}" y2="${toPx(3.3)}" marker-end="url(#arrowhead)" />
        <line x1="${toPx(7.7)}" y1="${toPx(0.8)}" x2="${toPx(7.7)}" y2="${toPx(2.2)}" marker-end="url(#arrowhead)" />
        <line x1="${toPx(10.2)}" y1="${toPx(7.7)}" x2="${toPx(8.8)}" y2="${toPx(7.7)}" marker-end="url(#arrowhead)" />
        <line x1="${toPx(3.3)}" y1="${toPx(10.2)}" x2="${toPx(3.3)}" y2="${toPx(8.8)}" marker-end="url(#arrowhead)" />
      </g>
    `;

    // Base Pockets
    PLAYER_KEYS.forEach(key => {
      const cfg = PLAYERS_CFG[key];
      cfg.basePockets.forEach(pos => {
        svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="38" fill="${cfg.colorHex}" stroke="#000" stroke-width="5" />`;
      });
    });

    // Track Circles
    const R = 36;
    TRACK.forEach((pos, idx) => {
      let fillColor = '#ffffff';
      if (idx === PLAYERS_CFG.red.startIndex) fillColor = PLAYERS_CFG.red.lightHex;
      else if (idx === PLAYERS_CFG.blue.startIndex) fillColor = PLAYERS_CFG.blue.lightHex;
      else if (idx === PLAYERS_CFG.green.startIndex) fillColor = PLAYERS_CFG.green.lightHex;
      else if (idx === PLAYERS_CFG.yellow.startIndex) fillColor = PLAYERS_CFG.yellow.lightHex;

      svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="${R}" fill="${fillColor}" stroke="#000" stroke-width="5" />`;
    });

    // Home Path Circles
    PLAYER_KEYS.forEach(key => {
      const cfg = PLAYERS_CFG[key];
      cfg.homePath.forEach(pos => {
        svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="${R}" fill="${cfg.colorHex}" stroke="#000" stroke-width="5" />`;
      });
    });

    boardSvg.innerHTML = svgHtml;
  }

  function handleStartGame() {
    const cfg = {
      red: {
        name: document.getElementById('red-name').value.trim() || 'Player 1',
        type: document.getElementById('red-type').value
      },
      blue: {
        name: document.getElementById('blue-name').value.trim() || 'Player 2',
        type: document.getElementById('blue-type').value
      },
      green: {
        name: document.getElementById('green-name').value.trim() || 'Player 3',
        type: document.getElementById('green-type').value
      },
      yellow: {
        name: document.getElementById('yellow-name').value.trim() || 'Player 4',
        type: document.getElementById('yellow-type').value
      }
    };

    const activeCount = Object.values(cfg).filter(p => p.type !== 'off').length;
    if (activeCount < 2) {
      alert('Please select at least 2 active players!');
      return;
    }

    state.setupGame(cfg);
    
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    createPawnElements();
    startPlayerTurn();
  }

  function resetToSetup() {
    clearTimeout(aiTimeoutId);
    clearTimeout(toastTimeoutId);
    eventToast.classList.add('hidden');
    
    state.phase = 'SETUP';
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

  function getPawnCoords(pawn) {
    const cfg = PLAYERS_CFG[pawn.playerId];
    if (pawn.state === 'base') {
      return cfg.basePockets[pawn.position];
    } else if (pawn.state === 'track') {
      return TRACK[pawn.position];
    } else if (pawn.state === 'home') {
      return cfg.homePath[pawn.position];
    }
    return {x: 0, y: 0};
  }

  function renderPawns() {
    const cellPawnMap = {};

    state.pawns.forEach(p => {
      if (!state.players[p.playerId]?.active) return;

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
        const leftPercent = ((x + 0.5) / 11) * 100;
        const topPercent = ((y + 0.5) / 11) * 100;

        el.style.left = `calc(${leftPercent}% - 22px)`;
        el.style.top = `calc(${topPercent}% - 22px)`;

        if (count > 1) {
          el.classList.add(`stacked-offset-${index}`);
        }
      });
    }
  }

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
      rollBtn.textContent = 'Roll Dice';
      turnMessage.textContent = 'Roll dice';
    } else {
      rollBtn.disabled = true;
      rollBtn.textContent = 'Bot rolling...';
      turnMessage.textContent = 'Bot rolling...';
      aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
    }
  }

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

  function handleAIRoll() {
    if (state.phase !== 'PLAYING' || isAnimating) return;
    const roll = state.rollDice();
    animateDiceRoll(roll, () => {
      if (state.phase !== 'PLAYING') return;
      handleRollResult();
    });
  }

  function animateDiceRoll(finalValue, callback) {
    diceCube.className = 'dice-cube rolling';
    
    setTimeout(() => {
      if (state.phase !== 'PLAYING') return;
      diceCube.className = `dice-cube show-${finalValue}`;

      setTimeout(() => {
        if (state.phase !== 'PLAYING') return;
        callback();
      }, 600);
    }, 500);
  }

  function handleRollResult() {
    if (state.phase !== 'PLAYING') return;
    const val = state.diceValue;
    diceCube.className = `dice-cube show-${val}`;
    
    const validMoves = state.getValidMoves();
    const player = state.getActivePlayer();

    if (validMoves.length === 0) {
      const maxRolls = state.getMaxRollsForCurrentTurn();
      const remainingRolls = maxRolls - state.rollCount;

      if (remainingRolls > 0) {
        turnMessage.textContent = `No moves (${state.rollCount}/${maxRolls})`;
        
        if (player.type === 'human') {
          rollBtn.disabled = false;
          rollBtn.textContent = 'Roll Again';
        } else {
          aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
        }
      } else {
        turnMessage.textContent = 'No moves';
        
        aiTimeoutId = setTimeout(() => {
          if (state.phase !== 'PLAYING') return;
          state.endTurn();
          startPlayerTurn();
        }, currentSpeed.rollDelay);
      }
    } else {
      if (player.type === 'human') {
        turnMessage.textContent = `Select piece (+${val})`;
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
        if (step <= 35) {
          coordsPath.push(TRACK[(pawn.position + i) % 36]);
        } else {
          coordsPath.push(cfg.homePath[step - 36]);
        }
      }
    } else if (pawn.state === 'home') {
      for (let i = 1; i <= diceVal; i++) {
        const nextPos = pawn.position + i;
        coordsPath.push(cfg.homePath[nextPos]);
      }
    }
    return coordsPath;
  }

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
        if (el) {
          const leftPercent = ((coords.x + 0.5) / 11) * 100;
          const topPercent = ((coords.y + 0.5) / 11) * 100;
          el.style.left = `calc(${leftPercent}% - 22px)`;
          el.style.top = `calc(${topPercent}% - 22px)`;
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
      if (pawn.state === 'home') {
        showToast('Piece Home!', pawn.playerId);
      }

      if (result.captureEvent) {
        showToast('Captured!', result.captureEvent.attacker);
      }
    }

    renderPawns();
    isAnimating = false;

    const turnChanged = state.endTurn();

    if (state.phase === 'FINISHED') {
      handleVictory();
    } else {
      if (!turnChanged && state.diceValue === 6) {
        showToast('Rolled a 6! +1 Roll', state.getActivePlayerKey());
      }
      startPlayerTurn();
    }
  }

  function updateScoreboard() {
    scoreboardList.innerHTML = '';

    PLAYER_KEYS.forEach(key => {
      const player = state.players[key];
      if (!player?.active) return;

      const pawns = state.pawns.filter(p => p.playerId === key);
      const card = document.createElement('div');
      card.className = `score-card ${key}`;

      if (state.getActivePlayerKey() === key && state.phase === 'PLAYING') {
        card.classList.add('active-turn');
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
      typeTag.textContent = player.type === 'human' ? 'P' : 'BOT';

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
        if (p.state === 'track') pDot.classList.add('on-track');
        if (p.state === 'home') pDot.classList.add('at-goal');

        pawnsDiv.appendChild(pDot);
      });

      card.appendChild(info);
      card.appendChild(pawnsDiv);
      scoreboardList.appendChild(card);
    });
  }

  function handleVictory() {
    const winner = state.players[state.winner];
    winnerTitle.textContent = `Victory!`;
    winnerMessage.innerHTML = `<strong>${winner.name}</strong> got all pieces home!`;
    victoryModal.classList.remove('hidden');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
