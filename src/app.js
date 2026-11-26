// ============================================================================
// Ludo - Classic Board Game Controller (Local + MQTT over WSS Online)
// ============================================================================

(function() {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Board Geometry & Data Constants (11x11 Classic Board)
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
  const MQTT_BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt'
  ];
  const ROOM_TOPIC_PREFIX = 'ludo-game-v1/room/';

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

    serialize() {
      return {
        players: JSON.parse(JSON.stringify(this.players)),
        pawns: JSON.parse(JSON.stringify(this.pawns)),
        activePlayerIdx: this.activePlayerIdx,
        diceValue: this.diceValue,
        rollCount: this.rollCount,
        consecutiveSixes: this.consecutiveSixes,
        hasRolled: this.hasRolled,
        phase: this.phase,
        winner: this.winner
      };
    }

    loadSnapshot(snap) {
      this.players = JSON.parse(JSON.stringify(snap.players));
      this.pawns = JSON.parse(JSON.stringify(snap.pawns));
      this.activePlayerIdx = snap.activePlayerIdx;
      this.diceValue = snap.diceValue;
      this.rollCount = snap.rollCount;
      this.consecutiveSixes = snap.consecutiveSixes;
      this.hasRolled = snap.hasRolled;
      this.phase = snap.phase;
      this.winner = snap.winner;
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
      const oldState = pawn.state;
      const oldPos = pawn.position;

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
  // 3. DOM References
  // --------------------------------------------------------------------------
  const setupScreen = document.getElementById('setup-screen');
  const gameScreen = document.getElementById('game-screen');
  const boardSvg = document.getElementById('board-svg');
  const boardOverlays = document.getElementById('board-overlays');
  const eventToast = document.getElementById('event-toast');

  // Mode Tabs
  const tabLocal = document.getElementById('tab-local');
  const tabOnline = document.getElementById('tab-online');
  const localSetupView = document.getElementById('local-setup-view');
  const onlineSetupView = document.getElementById('online-setup-view');

  // Online UI
  const onlineEntry = document.getElementById('online-entry');
  const onlineLobby = document.getElementById('online-lobby');
  const onlinePlayerNameInput = document.getElementById('online-player-name');
  const createRoomBtn = document.getElementById('create-room-btn');
  const joinRoomCodeInput = document.getElementById('join-room-code');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const onlineStatusMsg = document.getElementById('online-status-msg');
  const lobbyRoomCodeEl = document.getElementById('lobby-room-code');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const lobbyConnectionStatus = document.getElementById('lobby-connection-status');
  const lobbySlotsEl = document.getElementById('lobby-slots');
  const leaveRoomBtn = document.getElementById('leave-room-btn');
  const startOnlineBtn = document.getElementById('start-online-btn');
  const guestWaitingNote = document.getElementById('guest-waiting-note');

  // Game Sidebar & Controls
  const startBtn = document.getElementById('start-game-btn');
  const rollBtn = document.getElementById('roll-dice-btn');
  const diceCube = document.getElementById('dice-cube');
  const turnPlayerName = document.getElementById('active-player-name');
  const turnIndicator = document.getElementById('active-player-indicator');
  const turnMessage = document.getElementById('turn-message');
  const gameRoomBadge = document.getElementById('game-room-badge');
  const gameRoomCodeText = document.getElementById('game-room-code-text');
  const gameMyColorTag = document.getElementById('game-my-color-tag');
  const restartGameBtn = document.getElementById('restart-game-btn');

  const scoreboardList = document.getElementById('scoreboard-list');
  const speedSlider = document.getElementById('speed-slider');
  const speedLabel = document.getElementById('speed-label');

  const victoryModal = document.getElementById('victory-modal');
  const winnerTitle = document.getElementById('winner-title');
  const winnerMessage = document.getElementById('winner-message');
  const victoryRestartBtn = document.getElementById('victory-restart-btn');

  // --------------------------------------------------------------------------
  // 4. Runtime State & Online Session State
  // --------------------------------------------------------------------------
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
  let diceTimer1 = null;
  let diceTimer2 = null;

  // Online MQTT state (zero-backend, works on Netlify / GitHub Pages / Vercel)
  const online = {
    active: false,         // true when in online lobby or match
    isHost: false,
    roomCode: '',
    myColor: null,         // 'red' | 'blue' | 'green' | 'yellow'
    client: null,
    topic: '',
    senderId: '',
    hostSenderId: '',
    slots: null,           // { red: {mode, name, senderId}, ... }
    msgCounter: 0,
    seenMsgIds: new Set(),
    joinTimeout: null,
    helloInterval: null,
    pendingTurnSync: null
  };

  // --------------------------------------------------------------------------
  // 5. Initialization
  // --------------------------------------------------------------------------
  function init() {
    initUIListeners();
    initTypePills();
    renderSvgBoard();
    checkInviteUrl();
  }

  function checkInviteUrl() {
    const params = new URLSearchParams(window.location.search);
    const room = (params.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (room.length >= 4) {
      switchModeTab('online');
      joinRoomCodeInput.value = room;
      setOnlineStatus(`Room ${room} ready — enter your name and click Join.`);
    }
  }

  function initUIListeners() {
    tabLocal.addEventListener('click', () => {
      if (online.active) {
        if (!confirm('Leave the current online room?')) return;
        disconnectOnline();
      }
      switchModeTab('local');
    });

    tabOnline.addEventListener('click', () => {
      switchModeTab('online');
    });

    startBtn.addEventListener('click', handleStartLocalGame);
    rollBtn.addEventListener('click', handleHumanRoll);

    speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      currentSpeed = SPEED_PRESETS[val];
      const labels = { 1: 'Slow', 2: 'Normal', 3: 'Fast', 4: 'Instant' };
      speedLabel.textContent = labels[val];
    });

    restartGameBtn.addEventListener('click', handleRestartOrLeave);

    victoryRestartBtn.addEventListener('click', () => {
      victoryModal.classList.add('hidden');
      if (online.active) {
        if (online.isHost) {
          broadcastToGuests({ type: 'RETURN_TO_LOBBY', slots: online.slots });
          returnToOnlineLobby();
        } else {
          // Guest waits for host or leaves
          returnToOnlineLobby();
        }
      } else {
        resetToSetup();
      }
    });

    document.getElementById('dice-3d-wrapper').addEventListener('click', () => {
      if (!rollBtn.disabled && state.phase === 'PLAYING' && isMyTurn()) {
        handleHumanRoll();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        if (state.phase === 'PLAYING' && !rollBtn.disabled && isMyTurn()) {
          e.preventDefault();
          handleHumanRoll();
        }
      }
    });

    // Online buttons
    createRoomBtn.addEventListener('click', createOnlineRoom);
    joinRoomBtn.addEventListener('click', joinOnlineRoom);
    joinRoomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinOnlineRoom();
    });
    leaveRoomBtn.addEventListener('click', () => {
      disconnectOnline();
      showOnlineEntry();
    });
    startOnlineBtn.addEventListener('click', handleStartOnlineGame);

    window.addEventListener('beforeunload', () => {
      if (online.active) {
        disconnectOnline(true);
      }
    });

    copyCodeBtn.addEventListener('click', () => copyText(online.roomCode, copyCodeBtn, 'Copied!'));
    copyLinkBtn.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('room', online.roomCode);
      copyText(url.toString(), copyLinkBtn, 'Link Copied!');
    });
  }

  function switchModeTab(mode) {
    const isOnline = mode === 'online';
    tabLocal.classList.toggle('active', !isOnline);
    tabLocal.setAttribute('aria-selected', String(!isOnline));
    tabOnline.classList.toggle('active', isOnline);
    tabOnline.setAttribute('aria-selected', String(isOnline));
    localSetupView.classList.toggle('hidden', isOnline);
    onlineSetupView.classList.toggle('hidden', !isOnline);
  }

  function copyText(text, btn, successLabel) {
    const orig = btn.textContent;
    const done = () => {
      btn.textContent = successLabel;
      setTimeout(() => { btn.textContent = orig; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    cb();
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
      eventToast.style.borderColor = 'rgba(255,255,255,0.25)';
    }
    eventToast.classList.remove('hidden');

    toastTimeoutId = setTimeout(() => {
      eventToast.classList.add('hidden');
    }, 2000);
  }

  function clearAllTimers() {
    clearTimeout(aiTimeoutId);
    clearTimeout(toastTimeoutId);
    clearTimeout(diceTimer1);
    clearTimeout(diceTimer2);
  }

  // --------------------------------------------------------------------------
  // 6. Online Multiplayer (MQTT over WebSockets — Works on Netlify & 4G/Wi-Fi)
  // --------------------------------------------------------------------------
  function generateRoomCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function makeSenderId() {
    return 'ludo_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
  }

  function nextMsgId() {
    online.msgCounter += 1;
    return `${online.senderId}_${online.msgCounter}`;
  }

  function setOnlineStatus(msg, isError = false) {
    if (!msg) {
      onlineStatusMsg.classList.add('hidden');
      onlineStatusMsg.textContent = '';
      onlineStatusMsg.classList.remove('is-error');
      return;
    }
    onlineStatusMsg.textContent = msg;
    onlineStatusMsg.classList.toggle('is-error', isError);
    onlineStatusMsg.classList.remove('hidden');
  }

  function showOnlineEntry() {
    onlineEntry.classList.remove('hidden');
    onlineLobby.classList.add('hidden');
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
  }

  function showOnlineLobby() {
    onlineEntry.classList.add('hidden');
    onlineLobby.classList.remove('hidden');
    lobbyRoomCodeEl.textContent = online.roomCode;
    startOnlineBtn.classList.toggle('hidden', !online.isHost);
    guestWaitingNote.classList.toggle('hidden', online.isHost);
    renderLobbySlots();
  }

  function sendNet(payload) {
    if (online.client && online.client.connected && online.topic) {
      try {
        const envelope = {
          ...payload,
          senderId: online.senderId,
          msgId: nextMsgId()
        };
        online.client.publish(online.topic, JSON.stringify(envelope), { qos: 1 });
      } catch (err) {
        console.error('Failed to publish MQTT message:', err);
      }
    }
  }

  function broadcastToGuests(payload) {
    sendNet(payload);
  }

  function disconnectOnline(notifyPeers = true) {
    if (online.joinTimeout) {
      clearTimeout(online.joinTimeout);
      online.joinTimeout = null;
    }
    if (online.helloInterval) {
      clearInterval(online.helloInterval);
      online.helloInterval = null;
    }
    if (notifyPeers && online.client && online.client.connected && online.topic && online.active) {
      sendNet({ type: 'LEAVE' });
    }
    if (online.client) {
      const oldClient = online.client;
      online.client = null;
      try { oldClient.end(true); } catch (_) {}
    }
    online.active = false;
    online.isHost = false;
    online.roomCode = '';
    online.myColor = null;
    online.topic = '';
    online.senderId = '';
    online.hostSenderId = '';
    online.slots = null;
    online.seenMsgIds.clear();
    online.pendingTurnSync = null;
  }

  function connectMqttRoom(roomCode, onReady, onFail, brokerIdx = 0) {
    if (typeof window.mqtt === 'undefined') {
      onFail('Online service unavailable. Check your internet connection.');
      return;
    }
    if (brokerIdx >= MQTT_BROKERS.length) {
      onFail('Could not reach online servers. Please try again.');
      return;
    }

    const brokerUrl = MQTT_BROKERS[brokerIdx];
    const topic = ROOM_TOPIC_PREFIX + roomCode;
    const senderId = makeSenderId();
    online.topic = topic;
    online.senderId = senderId;
    online.seenMsgIds.clear();

    let settled = false;
    const client = window.mqtt.connect(brokerUrl, {
      clientId: senderId,
      clean: true,
      connectTimeout: 5500,
      reconnectPeriod: 0,
      will: {
        topic,
        payload: JSON.stringify({ type: 'LEAVE', senderId, msgId: `${senderId}_will` }),
        qos: 1,
        retain: false
      }
    });
    online.client = client;

    const failTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { client.end(true); } catch (_) {}
        connectMqttRoom(roomCode, onReady, onFail, brokerIdx + 1);
      }
    }, 6000);

    client.on('connect', () => {
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (settled) return;
        clearTimeout(failTimer);
        if (err) {
          settled = true;
          try { client.end(true); } catch (_) {}
          connectMqttRoom(roomCode, onReady, onFail, brokerIdx + 1);
          return;
        }
        settled = true;
        onReady(client);
      });
    });

    client.on('message', (_t, payloadBuf) => {
      let msg = null;
      try {
        msg = JSON.parse(payloadBuf.toString());
      } catch (_) {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      if (msg.senderId === online.senderId) return;
      if (msg.msgId) {
        if (online.seenMsgIds.has(msg.msgId)) return;
        online.seenMsgIds.add(msg.msgId);
        if (online.seenMsgIds.size > 400) {
          const first = online.seenMsgIds.values().next().value;
          online.seenMsgIds.delete(first);
        }
      }

      if (online.isHost) {
        handleHostReceiveData(msg);
      } else {
        handleGuestReceiveData(msg);
      }
    });

    client.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(failTimer);
        try { client.end(true); } catch (_) {}
        connectMqttRoom(roomCode, onReady, onFail, brokerIdx + 1);
      }
    });
  }

  function createOnlineRoom() {
    const hostName = onlinePlayerNameInput.value.trim() || 'Host';
    disconnectOnline(false);
    setOnlineStatus('Creating room...');
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;

    const code = generateRoomCode();
    online.isHost = true;

    connectMqttRoom(
      code,
      () => {
        online.active = true;
        online.roomCode = code;
        online.myColor = 'red';
        online.hostSenderId = online.senderId;
        online.slots = {
          red:    { mode: 'human', name: hostName, senderId: online.senderId },
          blue:   { mode: 'open',  name: '',       senderId: null },
          green:  { mode: 'open',  name: '',       senderId: null },
          yellow: { mode: 'open',  name: '',       senderId: null }
        };
        setOnlineStatus('');
        lobbyConnectionStatus.textContent = 'Room ready — share the code or link with friends!';
        showOnlineLobby();
      },
      (errMsg) => {
        disconnectOnline(false);
        setOnlineStatus(errMsg, true);
        createRoomBtn.disabled = false;
        joinRoomBtn.disabled = false;
      }
    );
  }

  function findColorBySender(senderId) {
    if (!online.slots) return null;
    return PLAYER_KEYS.find(k => online.slots[k].senderId === senderId) || null;
  }

  function handleHostReceiveData(msg) {
    if (msg.type === 'HELLO') {
      const guestName = (msg.name || 'Player').toString().trim().slice(0, 12) || 'Player';
      const existingColor = findColorBySender(msg.senderId);
      if (existingColor) {
        sendNet({
          type: 'WELCOME',
          targetId: msg.senderId,
          color: existingColor,
          roomCode: online.roomCode,
          slots: online.slots
        });
        return;
      }

      if (state.phase !== 'SETUP') {
        sendNet({ type: 'JOIN_REJECTED', targetId: msg.senderId, reason: 'Game already in progress.' });
        return;
      }

      const openColor = PLAYER_KEYS.find(k => online.slots[k].mode === 'open');
      if (!openColor) {
        sendNet({ type: 'JOIN_REJECTED', targetId: msg.senderId, reason: 'Room is full.' });
        return;
      }

      online.slots[openColor] = { mode: 'human', name: guestName, senderId: msg.senderId };
      sendNet({
        type: 'WELCOME',
        targetId: msg.senderId,
        color: openColor,
        roomCode: online.roomCode,
        slots: online.slots
      });
      sendNet({ type: 'LOBBY_UPDATE', slots: online.slots });
      lobbyConnectionStatus.textContent = `${guestName} joined as ${PLAYERS_CFG[openColor].colorName}!`;
      renderLobbySlots();
      return;
    }

    const senderColor = findColorBySender(msg.senderId);
    if (!senderColor) return;

    if (msg.type === 'LEAVE') {
      const leavingName = online.slots[senderColor].name || PLAYERS_CFG[senderColor].colorName;
      if (state.phase === 'SETUP') {
        online.slots[senderColor] = { mode: 'open', name: '', senderId: null };
        renderLobbySlots();
        sendNet({ type: 'LOBBY_UPDATE', slots: online.slots });
        lobbyConnectionStatus.textContent = `${leavingName} left the lobby.`;
      } else if (state.phase === 'PLAYING') {
        online.slots[senderColor] = { mode: 'open', name: '', senderId: null };
        if (state.players[senderColor]) {
          state.players[senderColor].type = 'ai';
          state.players[senderColor].name = `${leavingName} (Bot)`;
          showToast(`${leavingName} left — Bot took over`, senderColor);
          sendNet({
            type: 'PLAYER_LEFT_BOT',
            color: senderColor,
            name: state.players[senderColor].name,
            snapshot: state.serialize()
          });
          updateScoreboard();
          if (state.getActivePlayerKey() === senderColor && !isAnimating) {
            startPlayerTurn();
          }
        }
      }
      return;
    }

    if (msg.type === 'ACTION_ROLL') {
      if (state.phase !== 'PLAYING' || isAnimating) return;
      if (state.getActivePlayerKey() !== senderColor) return;
      if (state.hasRolled && state.getValidMoves().length > 0) return;
      performAuthoritativeRoll();
      return;
    }

    if (msg.type === 'ACTION_MOVE') {
      if (state.phase !== 'PLAYING' || isAnimating) return;
      if (state.getActivePlayerKey() !== senderColor) return;
      const pawn = state.pawns.find(p => p.playerId === senderColor && p.id === msg.pawnId);
      if (!pawn || !state.isValidMove(pawn, state.diceValue)) return;
      performAuthoritativeMove(pawn);
    }
  }

  function joinOnlineRoom() {
    const code = joinRoomCodeInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      setOnlineStatus('Enter a valid room code.', true);
      return;
    }

    const guestName = onlinePlayerNameInput.value.trim() || 'Player';
    disconnectOnline(false);
    setOnlineStatus(`Connecting to room ${code}...`);
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    online.isHost = false;

    connectMqttRoom(
      code,
      () => {
        const sendHello = () => sendNet({ type: 'HELLO', name: guestName });
        sendHello();
        online.helloInterval = setInterval(sendHello, 1500);

        online.joinTimeout = setTimeout(() => {
          if (!online.active) {
            disconnectOnline(false);
            setOnlineStatus('Room not found or host is offline.', true);
            createRoomBtn.disabled = false;
            joinRoomBtn.disabled = false;
          }
        }, 10000);
      },
      (errMsg) => {
        disconnectOnline(false);
        setOnlineStatus(errMsg, true);
        createRoomBtn.disabled = false;
        joinRoomBtn.disabled = false;
      }
    );
  }

  function handleGuestReceiveData(msg) {
    if (msg.type === 'WELCOME' && msg.targetId === online.senderId) {
      if (online.helloInterval) { clearInterval(online.helloInterval); online.helloInterval = null; }
      if (online.joinTimeout) { clearTimeout(online.joinTimeout); online.joinTimeout = null; }
      online.active = true;
      online.roomCode = msg.roomCode;
      online.myColor = msg.color;
      online.hostSenderId = msg.senderId;
      online.slots = msg.slots;
      setOnlineStatus('');
      lobbyConnectionStatus.textContent = `Connected as ${PLAYERS_CFG[msg.color].colorName}!`;
      showOnlineLobby();
      return;
    }

    if (msg.type === 'JOIN_REJECTED' && msg.targetId === online.senderId) {
      disconnectOnline(false);
      setOnlineStatus(msg.reason || 'Could not join room.', true);
      createRoomBtn.disabled = false;
      joinRoomBtn.disabled = false;
      return;
    }

    if (!online.active) return;

    if (msg.type === 'LEAVE' && msg.senderId === online.hostSenderId) {
      disconnectOnline(false);
      resetToSetup();
      switchModeTab('online');
      showOnlineEntry();
      setOnlineStatus('Host left the room.', true);
      return;
    }

    if (msg.type === 'LOBBY_UPDATE') {
      online.slots = msg.slots;
      renderLobbySlots();
      return;
    }

    if (msg.type === 'GAME_START') {
      state.loadSnapshot(msg.snapshot);
      enterGameScreen();
      return;
    }

    if (msg.type === 'DICE_ROLLED') {
      if (state.phase !== 'PLAYING') return;
      state.diceValue = msg.roll;
      state.hasRolled = true;
      state.rollCount = msg.rollCount;
      state.consecutiveSixes = msg.consecutiveSixes;
      rollBtn.disabled = true;
      rollBtn.textContent = '...';
      animateDiceRoll(msg.roll, () => {
        if (state.phase !== 'PLAYING') return;
        handleRollResult();
      });
      return;
    }

    if (msg.type === 'PAWN_MOVED') {
      if (state.phase !== 'PLAYING') return;
      clearPawnHighlights();
      const pawn = state.pawns.find(p => p.playerId === msg.playerId && p.id === msg.pawnId);
      if (pawn) {
        state.diceValue = msg.diceValue;
        animatePawnOnly(pawn).then(() => {
          if (online.pendingTurnSync) {
            const syncMsg = online.pendingTurnSync;
            online.pendingTurnSync = null;
            applyGuestTurnSync(syncMsg);
          }
        });
      }
      return;
    }

    if (msg.type === 'TURN_SYNC') {
      if (isAnimating) {
        online.pendingTurnSync = msg;
      } else {
        applyGuestTurnSync(msg);
      }
      return;
    }

    if (msg.type === 'PLAYER_LEFT_BOT') {
      state.loadSnapshot(msg.snapshot);
      showToast(`${msg.name} took over`, msg.color);
      updateScoreboard();
      return;
    }

    if (msg.type === 'RETURN_TO_LOBBY') {
      online.slots = msg.slots || online.slots;
      returnToOnlineLobby();
    }
  }

  function applyGuestTurnSync(msg) {
    state.loadSnapshot(msg.snapshot);
    renderPawns();

    if (msg.enteredHome) {
      showToast('Piece Home!', msg.enteredHome);
    }
    if (msg.captureEvent) {
      showToast('Captured!', msg.captureEvent.attacker);
    }
    if (msg.extraRoll) {
      showToast('Rolled a 6! +1 Roll', state.getActivePlayerKey());
    }

    if (state.phase === 'FINISHED') {
      handleVictory();
    } else {
      startPlayerTurn();
    }
  }

  function renderLobbySlots() {
    if (!online.slots) return;
    lobbySlotsEl.innerHTML = '';

    let activeCount = 0;

    PLAYER_KEYS.forEach(color => {
      const slot = online.slots[color];
      const isOccupiedHuman = slot.mode === 'human';
      const isBot = slot.mode === 'ai';
      if (isOccupiedHuman || isBot) activeCount++;

      const card = document.createElement('div');
      card.className = `lobby-slot slot-${color}${slot.mode === 'off' ? ' is-off' : ''}`;

      const badge = document.createElement('div');
      badge.className = `color-badge badge-${color}`;

      const body = document.createElement('div');
      body.className = 'lobby-slot-body';

      const header = document.createElement('div');
      header.className = 'lobby-slot-header';

      const nameEl = document.createElement('span');
      nameEl.className = 'lobby-slot-name';
      if (isOccupiedHuman) {
        nameEl.textContent = slot.name;
      } else if (isBot) {
        nameEl.textContent = `${PLAYERS_CFG[color].colorName} Bot`;
      } else if (slot.mode === 'open') {
        nameEl.textContent = 'Open Slot';
        nameEl.classList.add('is-open');
      } else {
        nameEl.textContent = 'Off';
        nameEl.classList.add('is-open');
      }
      header.appendChild(nameEl);

      if (color === online.myColor) {
        const youBadge = document.createElement('span');
        youBadge.className = 'lobby-badge badge-you';
        youBadge.textContent = online.isHost ? 'Host · You' : 'You';
        header.appendChild(youBadge);
      } else if (slot.senderId && slot.senderId === online.hostSenderId) {
        const hostBadge = document.createElement('span');
        hostBadge.className = 'lobby-badge';
        hostBadge.textContent = 'Host';
        header.appendChild(hostBadge);
      }

      body.appendChild(header);

      // Host can toggle unoccupied slots between Open / Bot / Off
      if (online.isHost && !isOccupiedHuman) {
        const toggle = document.createElement('div');
        toggle.className = 'type-toggle-group';
        [
          { value: 'open', label: 'Open' },
          { value: 'ai', label: 'Bot' },
          { value: 'off', label: 'Off' }
        ].forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `type-pill${slot.mode === opt.value ? ' active' : ''}`;
          btn.textContent = opt.label;
          btn.addEventListener('click', () => {
            online.slots[color] = {
              mode: opt.value,
              name: opt.value === 'ai' ? `${PLAYERS_CFG[color].colorName} Bot` : '',
              senderId: null
            };
            renderLobbySlots();
            broadcastToGuests({ type: 'LOBBY_UPDATE', slots: online.slots });
          });
          toggle.appendChild(btn);
        });
        body.appendChild(toggle);
      }

      card.appendChild(badge);
      card.appendChild(body);
      lobbySlotsEl.appendChild(card);
    });

    if (online.isHost) {
      startOnlineBtn.disabled = activeCount < 2;
      startOnlineBtn.textContent = activeCount < 2 ? 'Need 2+ Players' : 'Start Game';
    }
  }

  function handleStartOnlineGame() {
    if (!online.active || !online.isHost || !online.slots) return;

    const cfg = {};
    PLAYER_KEYS.forEach(color => {
      const slot = online.slots[color];
      if (slot.mode === 'human') {
        cfg[color] = { name: slot.name, type: 'human' };
      } else if (slot.mode === 'ai') {
        cfg[color] = { name: slot.name || `${PLAYERS_CFG[color].colorName} Bot`, type: 'ai' };
      } else {
        cfg[color] = { name: PLAYERS_CFG[color].colorName, type: 'off' };
      }
    });

    const activeCount = Object.values(cfg).filter(p => p.type !== 'off').length;
    if (activeCount < 2) {
      alert('Need at least 2 players or bots to start!');
      return;
    }

    state.setupGame(cfg);
    broadcastToGuests({ type: 'GAME_START', snapshot: state.serialize() });
    enterGameScreen();
  }

  function returnToOnlineLobby() {
    clearAllTimers();
    victoryModal.classList.add('hidden');
    eventToast.classList.add('hidden');
    state.phase = 'SETUP';
    isAnimating = false;
    online.pendingTurnSync = null;

    setupScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    boardOverlays.innerHTML = '';

    switchModeTab('online');
    showOnlineLobby();
  }

  // --------------------------------------------------------------------------
  // 7. SVG Board Rendering
  // --------------------------------------------------------------------------
  function renderSvgBoard() {
    const toPx = (val) => val * 100 + 50;
    let svgHtml = '';

    // Defs: warm wood gradient, subtle drop shadow, crisp arrowhead
    svgHtml += `
      <defs>
        <linearGradient id="boardWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ebd5b3" />
          <stop offset="50%" stop-color="#dfbe8e" />
          <stop offset="100%" stop-color="#cfa66e" />
        </linearGradient>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff8ea" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#d4b07a" stop-opacity="0" />
        </radialGradient>
        <filter id="fieldShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#2b1b0e" flood-opacity="0.22" />
        </filter>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="7" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3a2718" />
        </marker>
      </defs>
    `;

    // Board background with warm walnut border
    svgHtml += `<rect x="6" y="6" width="1088" height="1088" fill="url(#boardWood)" stroke="#4a311d" stroke-width="12" rx="28" />`;
    svgHtml += `<rect x="18" y="18" width="1064" height="1064" fill="none" stroke="rgba(255,248,232,0.35)" stroke-width="3" rx="20" />`;

    // Subtle colored corner base pads
    const basePads = [
      { x: 48, y: 48, color: PLAYERS_CFG.red.colorHex },
      { x: 848, y: 48, color: PLAYERS_CFG.blue.colorHex },
      { x: 848, y: 848, color: PLAYERS_CFG.green.colorHex },
      { x: 48, y: 848, color: PLAYERS_CFG.yellow.colorHex }
    ];
    basePads.forEach(pad => {
      svgHtml += `<rect x="${pad.x}" y="${pad.y}" width="244" height="244" rx="34" fill="${pad.color}" fill-opacity="0.14" stroke="${pad.color}" stroke-opacity="0.38" stroke-width="3" />`;
    });

    // Subtle center emblem
    svgHtml += `<circle cx="${toPx(5)}" cy="${toPx(5)}" r="54" fill="url(#centerGlow)" />`;
    svgHtml += `<circle cx="${toPx(5)}" cy="${toPx(5)}" r="34" fill="#f7ead4" stroke="#4a311d" stroke-width="4" />`;
    svgHtml += `<polygon points="550,524 557,542 576,542 561,553 566,571 550,560 534,571 539,553 524,542 543,542" fill="#4a311d" opacity="0.72" />`;

    // Connecting lines
    svgHtml += `<g stroke="#3a2718" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.82">`;

    for (let i = 0; i < TRACK.length; i++) {
      const p1 = TRACK[i];
      const p2 = TRACK[(i + 1) % TRACK.length];
      svgHtml += `<line x1="${toPx(p1.x)}" y1="${toPx(p1.y)}" x2="${toPx(p2.x)}" y2="${toPx(p2.y)}" />`;
    }

    svgHtml += `<line x1="${toPx(0)}" y1="${toPx(5)}" x2="${toPx(4)}" y2="${toPx(5)}" />`;
    svgHtml += `<line x1="${toPx(5)}" y1="${toPx(0)}" x2="${toPx(5)}" y2="${toPx(4)}" />`;
    svgHtml += `<line x1="${toPx(10)}" y1="${toPx(5)}" x2="${toPx(6)}" y2="${toPx(5)}" />`;
    svgHtml += `<line x1="${toPx(5)}" y1="${toPx(10)}" x2="${toPx(5)}" y2="${toPx(6)}" />`;

    svgHtml += `</g>`;

    // Direction Arrows
    svgHtml += `
      <g stroke="#3a2718" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.78">
        <line x1="${toPx(0.8)}" y1="${toPx(3.3)}" x2="${toPx(2.2)}" y2="${toPx(3.3)}" marker-end="url(#arrowhead)" />
        <line x1="${toPx(7.7)}" y1="${toPx(0.8)}" x2="${toPx(7.7)}" y2="${toPx(2.2)}" marker-end="url(#arrowhead)" />
        <line x1="${toPx(10.2)}" y1="${toPx(7.7)}" x2="${toPx(8.8)}" y2="${toPx(7.7)}" marker-end="url(#arrowhead)" />
        <line x1="${toPx(3.3)}" y1="${toPx(10.2)}" x2="${toPx(3.3)}" y2="${toPx(8.8)}" marker-end="url(#arrowhead)" />
      </g>
    `;

    // Base Pockets
    svgHtml += `<g filter="url(#fieldShadow)">`;
    PLAYER_KEYS.forEach(key => {
      const cfg = PLAYERS_CFG[key];
      cfg.basePockets.forEach(pos => {
        svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="38" fill="${cfg.colorHex}" stroke="#2b1b0e" stroke-width="5" />`;
        svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="28" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2" />`;
      });
    });

    // Track Circles
    const R = 36;
    TRACK.forEach((pos, idx) => {
      let fillColor = '#fffdf8';
      let ringColor = null;
      if (idx === PLAYERS_CFG.red.startIndex) { fillColor = PLAYERS_CFG.red.lightHex; ringColor = PLAYERS_CFG.red.colorHex; }
      else if (idx === PLAYERS_CFG.blue.startIndex) { fillColor = PLAYERS_CFG.blue.lightHex; ringColor = PLAYERS_CFG.blue.colorHex; }
      else if (idx === PLAYERS_CFG.green.startIndex) { fillColor = PLAYERS_CFG.green.lightHex; ringColor = PLAYERS_CFG.green.colorHex; }
      else if (idx === PLAYERS_CFG.yellow.startIndex) { fillColor = PLAYERS_CFG.yellow.lightHex; ringColor = PLAYERS_CFG.yellow.colorHex; }

      svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="${R}" fill="${fillColor}" stroke="#2b1b0e" stroke-width="4.5" />`;
      if (ringColor) {
        svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="24" fill="none" stroke="${ringColor}" stroke-width="3" opacity="0.6" />`;
      }
    });

    // Home Path Circles
    PLAYER_KEYS.forEach(key => {
      const cfg = PLAYERS_CFG[key];
      cfg.homePath.forEach(pos => {
        svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="${R}" fill="${cfg.colorHex}" stroke="#2b1b0e" stroke-width="4.5" />`;
        svgHtml += `<circle cx="${toPx(pos.x)}" cy="${toPx(pos.y)}" r="25" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" />`;
      });
    });
    svgHtml += `</g>`;

    boardSvg.innerHTML = svgHtml;
  }

  // --------------------------------------------------------------------------
  // 8. Local Game Start, Screen Transitions & Reset
  // --------------------------------------------------------------------------
  function handleStartLocalGame() {
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
    enterGameScreen();
  }

  function enterGameScreen() {
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    if (online.active) {
      gameRoomBadge.classList.remove('hidden');
      gameRoomCodeText.textContent = `Room: ${online.roomCode}`;
      gameMyColorTag.textContent = `You: ${PLAYERS_CFG[online.myColor].colorName}`;
      restartGameBtn.textContent = online.isHost ? 'Return to Lobby' : 'Leave Room';
    } else {
      gameRoomBadge.classList.add('hidden');
      restartGameBtn.textContent = 'Menu / Restart';
    }

    createPawnElements();
    startPlayerTurn();
  }

  function handleRestartOrLeave() {
    if (online.active) {
      if (online.isHost) {
        if (!confirm('Return all players to the online lobby?')) return;
        broadcastToGuests({ type: 'RETURN_TO_LOBBY', slots: online.slots });
        returnToOnlineLobby();
      } else {
        if (!confirm('Leave this online game?')) return;
        disconnectOnline();
        resetToSetup();
        switchModeTab('online');
        showOnlineEntry();
      }
    } else {
      if (!confirm('Restart and return to setup?')) return;
      resetToSetup();
    }
  }

  function resetToSetup() {
    clearAllTimers();
    victoryModal.classList.add('hidden');
    eventToast.classList.add('hidden');

    state.phase = 'SETUP';
    setupScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    boardOverlays.innerHTML = '';
    isAnimating = false;
  }

  // --------------------------------------------------------------------------
  // 9. Pawns Rendering & Responsive Positioning
  // --------------------------------------------------------------------------
  function createPawnElements() {
    boardOverlays.innerHTML = '';
    state.pawns.forEach(p => {
      if (!state.players[p.playerId]?.active) return;

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

  function setPawnElementCoords(el, coords) {
    const leftPercent = ((coords.x + 0.5) / 11) * 100;
    const topPercent = ((coords.y + 0.5) / 11) * 100;
    el.style.left = `${leftPercent}%`;
    el.style.top = `${topPercent}%`;
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
        setPawnElementCoords(el, { x, y });
        if (count > 1) {
          el.classList.add(`stacked-offset-${index % 4}`);
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // 10. Turn Flow, Dice & Pawn Movement (Local + Authoritative Online)
  // --------------------------------------------------------------------------
  function isMyTurn() {
    const player = state.getActivePlayer();
    if (!player || player.type !== 'human') return false;
    if (!online.active) return true;
    return state.getActivePlayerKey() === online.myColor;
  }

  function isAuthority() {
    return !online.active || online.isHost;
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
      if (isMyTurn()) {
        rollBtn.disabled = false;
        rollBtn.textContent = 'Roll Dice';
        turnMessage.textContent = online.active ? 'Your turn — roll dice' : 'Roll dice';
      } else {
        rollBtn.disabled = true;
        rollBtn.textContent = 'Waiting...';
        turnMessage.textContent = `${player.name}'s turn`;
      }
    } else {
      rollBtn.disabled = true;
      rollBtn.textContent = 'Bot rolling...';
      turnMessage.textContent = 'Bot rolling...';
      if (isAuthority()) {
        aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
      }
    }
  }

  function handleHumanRoll() {
    if (state.phase !== 'PLAYING' || isAnimating || !isMyTurn()) return;
    rollBtn.disabled = true;
    rollBtn.textContent = '...';

    if (online.active && !online.isHost) {
      sendNet({ type: 'ACTION_ROLL' });
      return;
    }

    performAuthoritativeRoll();
  }

  function handleAIRoll() {
    if (state.phase !== 'PLAYING' || isAnimating || !isAuthority()) return;
    performAuthoritativeRoll();
  }

  function performAuthoritativeRoll() {
    const roll = state.rollDice();
    if (online.active && online.isHost) {
      broadcastToGuests({
        type: 'DICE_ROLLED',
        roll,
        rollCount: state.rollCount,
        consecutiveSixes: state.consecutiveSixes
      });
    }
    animateDiceRoll(roll, () => {
      if (state.phase !== 'PLAYING') return;
      handleRollResult();
    });
  }

  function animateDiceRoll(finalValue, callback) {
    diceCube.className = 'dice-cube rolling';

    diceTimer1 = setTimeout(() => {
      if (state.phase !== 'PLAYING') return;
      diceCube.className = `dice-cube show-${finalValue}`;

      diceTimer2 = setTimeout(() => {
        if (state.phase !== 'PLAYING') return;
        callback();
      }, 550);
    }, 450);
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
          if (isMyTurn()) {
            rollBtn.disabled = false;
            rollBtn.textContent = 'Roll Again';
          }
        } else if (isAuthority()) {
          aiTimeoutId = setTimeout(handleAIRoll, currentSpeed.rollDelay);
        }
      } else {
        turnMessage.textContent = 'No moves';

        if (isAuthority()) {
          aiTimeoutId = setTimeout(() => {
            if (state.phase !== 'PLAYING') return;
            state.endTurn();
            if (online.active && online.isHost) {
              broadcastToGuests({
                type: 'TURN_SYNC',
                snapshot: state.serialize()
              });
            }
            startPlayerTurn();
          }, currentSpeed.rollDelay);
        }
      }
    } else {
      if (player.type === 'human') {
        if (isMyTurn()) {
          turnMessage.textContent = `Select piece (+${val})`;
          highlightSelectablePawns(validMoves);
        } else {
          turnMessage.textContent = `${player.name} choosing (+${val})`;
        }
      } else if (isAuthority()) {
        aiTimeoutId = setTimeout(() => {
          if (state.phase !== 'PLAYING') return;
          const bestPawn = state.getBestAIMove();
          performAuthoritativeMove(bestPawn);
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
          if (isAnimating || state.phase !== 'PLAYING' || !isMyTurn()) return;
          clearPawnHighlights();

          if (online.active && !online.isHost) {
            sendNet({ type: 'ACTION_MOVE', pawnId: p.id });
            return;
          }

          performAuthoritativeMove(p);
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

  async function animatePawnOnly(pawn) {
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
          setPawnElementCoords(el, coords);
        }
        setTimeout(resolve, currentSpeed.animStep);
      });
    }

    isAnimating = false;
  }

  async function performAuthoritativeMove(pawn) {
    if (!pawn || state.phase !== 'PLAYING' || !isAuthority()) return;

    if (online.active && online.isHost) {
      broadcastToGuests({
        type: 'PAWN_MOVED',
        playerId: pawn.playerId,
        pawnId: pawn.id,
        diceValue: state.diceValue
      });
    }

    await animatePawnOnly(pawn);

    if (state.phase !== 'PLAYING') return;

    const result = state.movePawn(pawn);
    const enteredHome = result && result.oldState !== 'home' && pawn.state === 'home' ? pawn.playerId : null;
    const captureEvent = result ? result.captureEvent : null;

    if (enteredHome) {
      showToast('Piece Home!', enteredHome);
    }
    if (captureEvent) {
      showToast('Captured!', captureEvent.attacker);
    }

    renderPawns();

    const turnChanged = state.endTurn();
    const extraRoll = state.phase === 'PLAYING' && !turnChanged && state.diceValue === 6;

    if (online.active && online.isHost) {
      broadcastToGuests({
        type: 'TURN_SYNC',
        snapshot: state.serialize(),
        enteredHome,
        captureEvent,
        extraRoll
      });
    }

    if (state.phase === 'FINISHED') {
      handleVictory();
    } else {
      if (extraRoll) {
        showToast('Rolled a 6! +1 Roll', state.getActivePlayerKey());
      }
      startPlayerTurn();
    }
  }

  // --------------------------------------------------------------------------
  // 11. Scoreboard & Victory Modal
  // --------------------------------------------------------------------------
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
      if (online.active && key === online.myColor) {
        typeTag.textContent = 'YOU';
      } else {
        typeTag.textContent = player.type === 'human' ? 'P' : 'BOT';
      }

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
    winnerTitle.textContent = 'Victory!';
    winnerMessage.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = winner ? winner.name : 'Player';
    winnerMessage.appendChild(strong);
    winnerMessage.appendChild(document.createTextNode(' got all pieces home!'));
    victoryRestartBtn.textContent = online.active ? 'Back to Lobby' : 'Play Again';
    victoryModal.classList.remove('hidden');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
