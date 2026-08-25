// ============================================================================
// Classic Ludo - 40-Field Traditional Rules & Geometry (English)
// ============================================================================

export const TRACK = [
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

export const PLAYERS_CFG = {
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

export const PLAYER_KEYS = ['red', 'blue', 'green', 'yellow'];

export class GameState {
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
