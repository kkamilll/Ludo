// Game Logic and State Management

// 1. Coordinates mapping for the 15x15 grid (52 perimeter cells)
export const TRACK = [
  // Left arm top row: (0,6) to (5,6)
  {x: 0, y: 6}, {x: 1, y: 6}, {x: 2, y: 6}, {x: 3, y: 6}, {x: 4, y: 6}, {x: 5, y: 6},
  // Top arm left col: (6,5) to (6,0)
  {x: 6, y: 5}, {x: 6, y: 4}, {x: 6, y: 3}, {x: 6, y: 2}, {x: 6, y: 1}, {x: 6, y: 0},
  // Top tip
  {x: 7, y: 0},
  // Top arm right col: (8,0) to (8,5)
  {x: 8, y: 0}, {x: 8, y: 1}, {x: 8, y: 2}, {x: 8, y: 3}, {x: 8, y: 4}, {x: 8, y: 5},
  // Right arm top row: (9,6) to (14,6)
  {x: 9, y: 6}, {x: 10, y: 6}, {x: 11, y: 6}, {x: 12, y: 6}, {x: 13, y: 6}, {x: 14, y: 6},
  // Right tip
  {x: 14, y: 7},
  // Right arm bottom row: (14,8) to (9,8)
  {x: 14, y: 8}, {x: 13, y: 8}, {x: 12, y: 8}, {x: 11, y: 8}, {x: 10, y: 8}, {x: 9, y: 8},
  // Bottom arm right col: (8,9) to (8,14)
  {x: 8, y: 9}, {x: 8, y: 10}, {x: 8, y: 11}, {x: 8, y: 12}, {x: 8, y: 13}, {x: 8, y: 14},
  // Bottom tip
  {x: 7, y: 14},
  // Bottom arm left col: (6,14) to (6,9)
  {x: 6, y: 14}, {x: 6, y: 13}, {x: 6, y: 12}, {x: 6, y: 11}, {x: 6, y: 10}, {x: 6, y: 9},
  // Left arm bottom row: (5,8) to (0,8)
  {x: 5, y: 8}, {x: 4, y: 8}, {x: 3, y: 8}, {x: 2, y: 8}, {x: 1, y: 8}, {x: 0, y: 8},
  // Left tip
  {x: 0, y: 7}
];

// 2. Player Configurations
export const PLAYERS_CFG = {
  red: {
    colorName: 'Czerwony',
    cssClass: 'red',
    startIndex: 1,      // (1,6)
    lastIndex: 51,      // (0,7)
    homePath: [{x:1, y:7}, {x:2, y:7}, {x:3, y:7}, {x:4, y:7}, {x:5, y:7}],
    goalPoint: {x:6, y:7},
    basePockets: [{x:1, y:1}, {x:4, y:1}, {x:1, y:4}, {x:4, y:4}]
  },
  green: {
    colorName: 'Zielony',
    cssClass: 'green',
    startIndex: 14,     // (8,1)
    lastIndex: 12,      // (7,0)
    homePath: [{x:7, y:1}, {x:7, y:2}, {x:7, y:3}, {x:7, y:4}, {x:7, y:5}],
    goalPoint: {x:7, y:6},
    basePockets: [{x:10, y:1}, {x:13, y:1}, {x:10, y:4}, {x:13, y:4}]
  },
  yellow: {
    colorName: 'Żółty',
    cssClass: 'yellow',
    startIndex: 27,     // (13,8)
    lastIndex: 25,      // (14,7)
    homePath: [{x:13, y:7}, {x:12, y:7}, {x:11, y:7}, {x:10, y:7}, {x:9, y:7}],
    goalPoint: {x:8, y:7},
    basePockets: [{x:10, y:10}, {x:13, y:10}, {x:10, y:12}, {x:13, y:12}] // wait, pocket positions: 10,10; 13,10; 10,13; 13,13
  },
  blue: {
    colorName: 'Niebieski',
    cssClass: 'blue',
    startIndex: 40,     // (6,13)
    lastIndex: 38,      // (7,14)
    homePath: [{x:7, y:13}, {x:7, y:12}, {x:7, y:11}, {x:7, y:10}, {x:7, y:9}],
    goalPoint: {x:7, y:8},
    basePockets: [{x:1, y:10}, {x:4, y:10}, {x:1, y:13}, {x:4, y:13}]
  }
};

export const PLAYER_KEYS = ['red', 'green', 'yellow', 'blue'];

export class GameState {
  constructor() {
    this.players = {}; // Keyed by 'red', 'green', 'yellow', 'blue'. Contains { name, type: 'human'|'ai'|'off', active: bool }
    this.pawns = [];   // Array of 16 pawns
    this.activePlayerIdx = 0; // Index in PLAYER_KEYS
    this.diceValue = 1;
    this.rollCount = 0; // Rolls in current turn
    this.consecutiveSixes = 0; // Count of consecutive sixes in this turn
    this.hasRolled = false;
    this.phase = 'SETUP'; // 'SETUP', 'PLAYING', 'FINISHED'
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
          state: 'base', // 'base', 'track', 'home', 'goal'
          position: i,   // Index within the state (for base, pocket slot 0..3)
          stepCount: -1  // Total steps walked (0 to 56, where 56 is Goal)
        });
      }
    });
  }

  setupGame(playersConfig) {
    PLAYER_KEYS.forEach(key => {
      this.players[key] = {
        name: playersConfig[key].name || PLAYERS_CFG[key].colorName,
        type: playersConfig[key].type, // 'human', 'ai', 'off'
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

    // Find the first active player
    this.activePlayerIdx = PLAYER_KEYS.findIndex(key => this.players[key].active);
    if (this.activePlayerIdx === -1) {
      // Fallback if none active, set red active
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

  // Check if active player has all pawns in the base
  allPawnsInBase(playerId) {
    return this.pawns
      .filter(p => p.playerId === playerId)
      .every(p => p.state === 'base');
  }

  // Check if active player has completed all pawns (reached goal)
  hasFinished(playerId) {
    return this.pawns
      .filter(p => p.playerId === playerId)
      .every(p => p.state === 'goal');
  }

  // Get max allowed rolls in this turn.
  // Standard Polish Chińczyk: If a player has NO pawns on the board (all in base), they get up to 3 rolls to get a 6.
  getMaxRollsForCurrentTurn() {
    const key = this.getActivePlayerKey();
    if (this.allPawnsInBase(key)) {
      return 3;
    }
    return 1;
  }

  // Roll the dice (returns rolled value)
  rollDice(forcedValue = null) {
    if (this.hasRolled && this.consecutiveSixes === 0 && this.rollCount >= this.getMaxRollsForCurrentTurn()) {
      return this.diceValue; // Already rolled and cannot roll again
    }

    this.diceValue = forcedValue || Math.floor(Math.random() * 6) + 1;
    this.hasRolled = true;
    this.rollCount++;

    if (this.diceValue === 6) {
      this.consecutiveSixes++;
    }

    return this.diceValue;
  }

  // Validate if a pawn can move with the current diceValue
  isValidMove(pawn, diceVal) {
    if (pawn.playerId !== this.getActivePlayerKey()) return false;
    if (pawn.state === 'goal') return false;

    const cfg = PLAYERS_CFG[pawn.playerId];

    // Case 1: Pawn in base
    if (pawn.state === 'base') {
      if (diceVal !== 6) return false;
      // Must exit base to start space.
      // Check if start cell is occupied by our OWN pawn.
      const isStartOccupiedBySelf = this.pawns.some(
        p => p.playerId === pawn.playerId && p.state === 'track' && p.position === cfg.startIndex
      );
      return !isStartOccupiedBySelf;
    }

    // Case 2: Pawn on track
    if (pawn.state === 'track') {
      const nextStepCount = pawn.stepCount + diceVal;

      if (nextStepCount <= 50) {
        // Still on main track. Calculate next global position.
        const nextPosition = (pawn.position + diceVal) % 52;
        // Check if landing position contains own pawn on track.
        const isOccupiedBySelf = this.pawns.some(
          p => p.playerId === pawn.playerId && p.state === 'track' && p.position === nextPosition
        );
        return !isOccupiedBySelf;
      } else if (nextStepCount < 56) {
        // Enters home path.
        const homeIndex = nextStepCount - 51; // 0..4
        const isOccupiedBySelf = this.pawns.some(
          p => p.playerId === pawn.playerId && p.state === 'home' && p.position === homeIndex
        );
        return !isOccupiedBySelf;
      } else if (nextStepCount === 56) {
        // Lands exactly on Goal!
        return true;
      } else {
        // Exceeds Goal (overshot). Invalid.
        return false;
      }
    }

    // Case 3: Pawn in home
    if (pawn.state === 'home') {
      const nextHomeIndex = pawn.position + diceVal;
      if (nextHomeIndex < 5) {
        // Moving inside home.
        const isOccupiedBySelf = this.pawns.some(
          p => p.playerId === pawn.playerId && p.state === 'home' && p.position === nextHomeIndex
        );
        return !isOccupiedBySelf;
      } else if (nextHomeIndex === 5) {
        // Lands exactly on Goal!
        return true;
      } else {
        // Exceeds Goal. Invalid.
        return false;
      }
    }

    return false;
  }

  // Get all valid moves for the active player
  getValidMoves() {
    if (!this.hasRolled) return [];
    return this.pawns.filter(p => this.isValidMove(p, this.diceValue));
  }

  // Execute the move of a pawn
  movePawn(pawn) {
    if (!this.isValidMove(pawn, this.diceValue)) return null;

    const cfg = PLAYERS_CFG[pawn.playerId];
    const diceVal = this.diceValue;
    let captureEvent = null;
    let oldState = pawn.state;
    let oldPos = pawn.position;

    if (pawn.state === 'base') {
      // Move out of base to start cell
      pawn.state = 'track';
      pawn.position = cfg.startIndex;
      pawn.stepCount = 0;
    } else if (pawn.state === 'track') {
      const nextStepCount = pawn.stepCount + diceVal;
      if (nextStepCount <= 50) {
        pawn.position = (pawn.position + diceVal) % 52;
        pawn.stepCount = nextStepCount;
      } else if (nextStepCount < 56) {
        pawn.state = 'home';
        pawn.position = nextStepCount - 51;
        pawn.stepCount = nextStepCount;
      } else {
        pawn.state = 'goal';
        pawn.position = 0;
        pawn.stepCount = 56;
      }
    } else if (pawn.state === 'home') {
      const nextHomeIndex = pawn.position + diceVal;
      if (nextHomeIndex < 5) {
        pawn.position = nextHomeIndex;
        pawn.stepCount = 51 + nextHomeIndex;
      } else {
        pawn.state = 'goal';
        pawn.position = 0;
        pawn.stepCount = 56;
      }
    }

    // Check for zbijanie (capturing opponent pawns) on track
    if (pawn.state === 'track') {
      const opponentPawnsOnSameCell = this.pawns.filter(
        p => p.playerId !== pawn.playerId && p.state === 'track' && p.position === pawn.position
      );

      if (opponentPawnsOnSameCell.length > 0) {
        opponentPawnsOnSameCell.forEach(oppPawn => {
          this.returnPawnToBase(oppPawn);
        });
        captureEvent = {
          attacker: pawn.playerId,
          victim: opponentPawnsOnSameCell[0].playerId,
          count: opponentPawnsOnSameCell.length,
          cellIndex: pawn.position
        };
      }
    }

    // Check if player won
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

  // Return a pawn back to base pockets
  returnPawnToBase(pawn) {
    pawn.state = 'base';
    pawn.stepCount = -1;

    // Find first empty base pocket slot (0..3)
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

  // End active player's turn and switch to next
  endTurn() {
    this.hasRolled = false;
    this.rollCount = 0;

    // Standard rule: if player rolled a 6, they get another turn (unless they rolled three 6s in a row)
    const rolledSix = this.diceValue === 6;
    const tooManySixes = this.consecutiveSixes >= 3;

    if (rolledSix && !tooManySixes && this.phase === 'PLAYING') {
      // Player retains turn. Reset roll parameters for the same player.
      return false; // Turn did not change
    }

    // Otherwise, transition turn to the next player
    this.consecutiveSixes = 0;
    let nextIdx = this.activePlayerIdx;
    
    do {
      nextIdx = (nextIdx + 1) % PLAYER_KEYS.length;
    } while (!this.players[PLAYER_KEYS[nextIdx]].active && nextIdx !== this.activePlayerIdx);

    this.activePlayerIdx = nextIdx;
    return true; // Turn changed
  }

  // --- Sztuczna Inteligencja (AI) Decyzje ---
  getBestAIMove() {
    const validMoves = this.getValidMoves();
    if (validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];

    // Assign priorities to each valid move
    const scoredMoves = validMoves.map(pawn => {
      let score = 0;
      const cfg = PLAYERS_CFG[pawn.playerId];
      const diceVal = this.diceValue;

      // 1. Check if captures opponent
      if (pawn.state === 'track') {
        const nextPos = (pawn.position + diceVal) % 52;
        const willCapture = this.pawns.some(
          p => p.playerId !== pawn.playerId && p.state === 'track' && p.position === nextPos
        );
        if (willCapture) score += 1000; // Capture is highest priority!
      } else if (pawn.state === 'base') {
        // Exit from base is rolling a 6
        const willCapture = this.pawns.some(
          p => p.playerId !== pawn.playerId && p.state === 'track' && p.position === cfg.startIndex
        );
        if (willCapture) score += 1000;
      }

      // 2. Check if lands exactly on Goal
      const nextStep = pawn.stepCount + diceVal;
      if (nextStep === 56) {
        score += 800; // Finish pawn
      }

      // 3. Move out of base (if 6 rolled)
      if (pawn.state === 'base' && diceVal === 6) {
        score += 600;
      }

      // 4. Escape from threat
      // Threat: opponent pawn is within 1-6 spaces behind our pawn
      if (pawn.state === 'track' && this.isPawnThreatened(pawn)) {
        score += 300;
      }

      // 5. Enter safe home column
      if (pawn.state === 'track' && nextStep > 50 && nextStep < 56) {
        score += 200;
      }

      // 6. Give slight preference to pawns further along the track (closer to goal)
      if (pawn.state === 'track') {
        score += pawn.stepCount * 2; // more steps = slightly preferred
      } else if (pawn.state === 'home') {
        score += pawn.stepCount;
      }

      return { pawn, score };
    });

    // Sort by score descending and return the best pawn
    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0].pawn;
  }

  isPawnThreatened(pawn) {
    if (pawn.state !== 'track') return false;

    // Check if any active opponent pawn is on the track behind us (within 6 spaces)
    return this.pawns.some(opp => {
      if (opp.playerId === pawn.playerId || opp.state !== 'track') return false;
      // Calculate distance from opp to pawn clockwise
      const dist = (pawn.position - opp.position + 52) % 52;
      return dist > 0 && dist <= 6;
    });
  }
}
