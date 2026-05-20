/**
 * Memory Card Game Engine - Core State Machine
 * Handles state tracking, Fisher-Yates shuffling, event delegation, timers, and Memory AI.
 */

import { audio } from './audio.js';
import { inspector } from './inspector.js';

// --- Theme Emojis Configuration ---
const THEME_ICONS = {
  cosmos: [
    '🪐', '🚀', '⭐', '🌌', '☄️', '🛰️', '🛸', '👽', 
    '👾', '🌙', '🌍', '☀️', '🤖', '🔭', '📡', '🌀', '⚡', '☄️'
  ],
  retro: [
    '👾', '🕹️', '🎮', '🍒', '🍌', '🍎', '🔔', '💎', 
    '🍕', '🍔', '🍟', '💥', '🏆', '🎲', '🧩', '🎯', '👑', '🌈'
  ],
  runes: [
    '🔮', '📜', '🧪', '🕯️', '🗝️', '🛡️', '⚔️', '💍', 
    '🍀', '🔥', '💧', '🍃', '🌋', '🍄', '🌳', '🌟', '🔱', '🧿'
  ]
};

// --- Game Reactive State Schema ---
const gameState = {
  theme: 'cosmos',
  mode: 'classic', // classic, timeAttack, vsAI
  grid: '4x4',     // 4x4, 4x5, 6x6
  aiDifficulty: 'medium',

  cards: [],            // List of cards: { index, id, icon, isFlipped, isMatched }
  selectedCards: [],    // Flipped cards in the current round (max 2)
  moves: 0,
  matches: 0,
  totalPairs: 8,
  elapsedTime: 0,
  timerId: null,
  isLocked: false,

  // AI Duel Specifics
  aiTurn: false,
  aiScore: 0,
  playerScore: 0,
  aiMemory: {},         // Card index catalog representing AI brain: { cardIndex: cardId }
  cardsOpenedCount: 0   // Track cards opened in the turn
};

// --- DOM Cache ---
let gameBoard = null;
let startModal = null;
let endModal = null;
let themeSelector = null;
let muteBtn = null;

// Stats elements
let statMode = null;
let statTimer = null;
let statMoves = null;
let statMatches = null;
let statAccuracy = null;

// Modals elements
let startGameBtn = null;
let restartBtn = null;
let resetHeaderBtn = null;
let aiConfigGroup = null;

// Mobile FAB Toggle Elements
let fabToggleInspector = null;
let closeInspectorBtn = null;

// --- Initialize Event Listeners on Load ---
document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  bindGlobalEvents();
  inspector.init();
  
  // Fit board to layout on initialization
  resizeGameBoard();
  window.addEventListener('resize', resizeGameBoard);

  // Update state visualization immediately
  inspector.updateState(gameState);
});

// Cache DOM Nodes
function cacheDOM() {
  gameBoard = document.getElementById('gameBoard');
  startModal = document.getElementById('startModal');
  endModal = document.getElementById('endModal');
  themeSelector = document.getElementById('themeSelector');
  muteBtn = document.getElementById('muteBtn');

  statMode = document.getElementById('statMode');
  statTimer = document.getElementById('statTimer');
  statMoves = document.getElementById('statMoves');
  statMatches = document.getElementById('statMatches');
  statAccuracy = document.getElementById('statAccuracy');

  startGameBtn = document.getElementById('startGameBtn');
  restartBtn = document.getElementById('restartBtn');
  resetHeaderBtn = document.getElementById('resetHeaderBtn');
  aiConfigGroup = document.getElementById('aiConfigGroup');

  fabToggleInspector = document.getElementById('fabToggleInspector');
  closeInspectorBtn = document.getElementById('closeInspectorBtn');
}

// Bind Global Setup Listeners
function bindGlobalEvents() {
  // Theme Toggle Change Listener
  themeSelector.addEventListener('change', (e) => {
    gameState.theme = e.target.value;
    document.documentElement.setAttribute('data-theme', gameState.theme);
    audio.playClick();
    
    inspector.logEvent(
      'EVENT: change',
      `Theme changed to "${gameState.theme}".`,
      'The browser caught a dynamic dropdown change, updating DOM :root CSS variables.'
    );
    inspector.updateState(gameState);
    
    // Refresh card rendering style if game active
    if (gameState.cards.length > 0) {
      renderBoard();
    }
  });

  // Sound Synthesizer Mute Toggle
  muteBtn.addEventListener('click', () => {
    const muted = audio.toggleMute();
    muteBtn.textContent = muted ? '🔇' : '🔊';
    if (!muted) audio.playFlip();

    inspector.logEvent(
      'AUDIO',
      `Audio Synthesizer is now ${muted ? 'MUTED' : 'ENABLED'}.`,
      'The Web Audio API context handles state switches locally.'
    );
  });

  // Header Quick-Reset Button
  resetHeaderBtn.addEventListener('click', () => {
    audio.playClick();
    stopGameTimer();
    startModal.classList.remove('hidden');
    endModal.classList.add('hidden');
    inspector.logEvent(
      'SANDBOX',
      'Sandbox setup opened.',
      'A button click resets running intervals, stops UI timers, and restores the setup dialog.'
    );
  });

  // Multi-choice Configuration Selectors in the Start Modal
  const modalConfigButtons = document.querySelectorAll('.config-btn');
  modalConfigButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      audio.playFlip();
      const type = btn.getAttribute('data-config-type');
      const val = btn.getAttribute('data-value');

      // Unselect siblings
      const siblings = btn.parentNode.querySelectorAll('.config-btn');
      siblings.forEach(sib => sib.classList.remove('active'));
      btn.classList.add('active');

      // Map values to reactive state
      if (type === 'theme') {
        gameState.theme = val;
        themeSelector.value = val;
        document.documentElement.setAttribute('data-theme', val);
      } else if (type === 'mode') {
        gameState.mode = val;
        // Show AI configuration only if VS AI is selected
        if (val === 'vsAI') {
          aiConfigGroup.style.display = 'flex';
          aiConfigGroup.classList.remove('hidden');
        } else {
          aiConfigGroup.style.display = 'none';
          aiConfigGroup.classList.add('hidden');
        }
      } else if (type === 'grid') {
        gameState.grid = val;
      } else if (type === 'ai') {
        gameState.aiDifficulty = val;
      }

      inspector.logEvent(
        'CONFIG: set',
        `Setup State variable updated: ${type} = "${val}"`,
        `Direct model mutations are logged. State binds reactively on "Start Game".`
      );
      inspector.updateState(gameState);
    });
  });

  // Start Sandbox Event Handler
  startGameBtn.addEventListener('click', () => {
    audio.playClick();
    startModal.classList.add('hidden');
    initializeGame();
  });

  // Restart from Finished Panel
  restartBtn.addEventListener('click', () => {
    audio.playClick();
    endModal.classList.add('hidden');
    startModal.classList.remove('hidden');
  });

  // Mobile FAB Inspector Toggler
  fabToggleInspector.addEventListener('click', () => {
    const sidebar = document.getElementById('inspectorSidebar');
    sidebar.classList.toggle('active');
    sidebar.classList.toggle('collapsed');
    audio.playClick();
    
    // Resize card grid to match new layout proportions
    resizeGameBoard();
    setTimeout(resizeGameBoard, 310);

    inspector.logEvent(
      'UI: toggle',
      'Inspector Sidebar state flipped.',
      'CSS transforms slide the panel out on viewport bounds.'
    );
  });

  closeInspectorBtn.addEventListener('click', () => {
    const sidebar = document.getElementById('inspectorSidebar');
    sidebar.classList.remove('active');
    sidebar.classList.add('collapsed');
    audio.playClick();

    // Resize card grid to match new layout proportions
    resizeGameBoard();
    setTimeout(resizeGameBoard, 310);
  });

  // --- CORE EVENT DELEGATION FOR MEMORY BOARD ---
  // Rather than assigning click listeners to 16/36 individual nodes, we register one
  // event handler on the parent container. This teaches performance-optimized DOM event patterns.
  gameBoard.addEventListener('click', (event) => {
    // Traverse upwards to find the closest .card class
    const cardEl = event.target.closest('.card');
    
    // Ignore clicks if click landed outside cards, or board is locked, or card is already flipped
    if (!cardEl || gameState.isLocked || gameState.aiTurn) {
      if (gameState.isLocked) {
        inspector.logEvent(
          'EVENT: ignored',
          'Click event captured but dropped.',
          'The state machine locks inputs (isLocked = true) during match-evaluation timeouts.'
        );
      }
      return;
    }

    const cardIndex = parseInt(cardEl.getAttribute('data-index'), 10);
    const card = gameState.cards[cardIndex];

    // Ignore flipped or matched cards
    if (card.isFlipped || card.isMatched) return;

    inspector.logEvent(
      'EVENT: click',
      `Card#${card.index} clicked (ID: ${card.id})!`,
      `Event bubbled up to #gameBoard. Target identified via event.target.closest('.card').`
    );

    handleCardFlip(cardIndex);
  });
}

// --- CORE GAME ENGINE LOGIC ---

function initializeGame() {
  inspector.logEvent(
    'ENGINE',
    'Initializing Game State Machine...',
    'Fisher-Yates deck shuffler clears previous buffers. Timers resetting to zero.'
  );

  // Set grid specifications
  let rows = 4, cols = 4;
  if (gameState.grid === '4x5') {
    rows = 4; cols = 5;
  } else if (gameState.grid === '6x6') {
    rows = 6; cols = 6;
  }
  
  gameState.totalPairs = (rows * cols) / 2;
  gameState.moves = 0;
  gameState.matches = 0;
  gameState.elapsedTime = gameState.mode === 'timeAttack' ? 60 : 0; // 60s count-down for Time Attack
  gameState.isLocked = false;
  gameState.selectedCards = [];
  gameState.aiTurn = false;
  gameState.aiScore = 0;
  gameState.playerScore = 0;
  gameState.aiMemory = {};

  // Setup Visual Grid Classes
  gameBoard.className = `game-board grid-${gameState.grid}`;

  // Assemble Deck Emojis
  const activeIcons = THEME_ICONS[gameState.theme].slice(0, gameState.totalPairs);
  const cardSet = [...activeIcons, ...activeIcons]; // Duplicate array to form matching pairs

  // Fisher-Yates Shuffle Algorithm (Fastest & statistically optimal random dispersion)
  for (let i = cardSet.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardSet[i], cardSet[j]] = [cardSet[j], cardSet[i]];
  }

  // Map icons into raw reactive cards
  gameState.cards = cardSet.map((icon, idx) => ({
    index: idx,
    id: icon, // Using emoji character as ID for easy match check
    isFlipped: false,
    isMatched: false
  }));

  // Setup HUD Panel
  statMode.textContent = getModeName(gameState.mode);
  statMoves.textContent = '0';
  statMatches.textContent = `0/${gameState.totalPairs}`;
  statAccuracy.textContent = '0%';
  updateTimerDisplay();

  renderBoard();
  resizeGameBoard();
  
  // Instantiate Game Loop Clock
  startGameTimer();

  inspector.logEvent(
    'ENGINE: ready',
    `Board initialized with ${gameState.cards.length} cards (${gameState.totalPairs} pairs).`,
    'Event listeners registered. Async clock initialized.'
  );
  
  inspector.updateState(gameState);
}

// Render card DOM elements dynamically
function renderBoard() {
  gameBoard.innerHTML = '';
  gameState.cards.forEach((card, idx) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.setAttribute('data-index', idx);
    cardEl.setAttribute('role', 'button');
    cardEl.setAttribute('aria-label', `Card ${idx + 1}`);

    // Inside wrapper for 3D flip transform
    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-back"></div>
        <div class="card-front" data-card-id="${card.id}" data-card-index="${idx + 1}">${card.id}</div>
      </div>
    `;

    // Maintain visual states in case of redraws
    if (card.isFlipped) cardEl.classList.add('flipped');
    if (card.isMatched) {
      cardEl.classList.add('flipped', 'matched');
      // In VS AI mode, keep cards visible. In classic/time attack, hide matches to look clean
      if (gameState.mode !== 'vsAI') {
        cardEl.classList.add('matched-hidden');
      }
    }

    gameBoard.appendChild(cardEl);
  });
}

// Process card flips and state checks
function handleCardFlip(cardIndex) {
  const card = gameState.cards[cardIndex];
  card.isFlipped = true;

  // Add flipped class in DOM instantly
  const cardEl = gameBoard.querySelector(`.card[data-index="${cardIndex}"]`);
  cardEl.classList.add('flipped');
  audio.playFlip();

  // Save card into the AI's core memory bank (teaching AI the card's position)
  storeInAIMemory(cardIndex, card.id);

  gameState.selectedCards.push(card);
  inspector.updateState(gameState);

  if (gameState.selectedCards.length === 2) {
    gameState.isLocked = true; // Block UI inputs while checking
    gameState.moves++;
    statMoves.textContent = gameState.moves;
    statMoves.classList.add('pulse');
    setTimeout(() => statMoves.classList.remove('pulse'), 200);

    // Calculate accuracies
    updateAccuracy();

    inspector.logEvent(
      'STATE: check',
      `Two cards flipped. Evaluating Pair: [Card#${gameState.selectedCards[0].index}, Card#${gameState.selectedCards[1].index}]`,
      'Evaluating equality. Board locked to avoid overlapping input triggers.'
    );

    evaluateSelections();
  }
}

// Evaluate selected card matches
function evaluateSelections() {
  const [c1, c2] = gameState.selectedCards;
  const cardEl1 = gameBoard.querySelector(`.card[data-index="${c1.index}"]`);
  const cardEl2 = gameBoard.querySelector(`.card[data-index="${c2.index}"]`);

  if (c1.id === c2.id) {
    // MATCH FOUND
    c1.isMatched = true;
    c2.isMatched = true;
    gameState.matches++;
    statMatches.textContent = `${gameState.matches}/${gameState.totalPairs}`;
    statMatches.classList.add('pulse');
    setTimeout(() => statMatches.classList.remove('pulse'), 200);

    audio.playMatch();

    cardEl1.classList.add('matched');
    cardEl2.classList.add('matched');

    // Remove matching cards from AI knowledge base
    delete gameState.aiMemory[c1.index];
    delete gameState.aiMemory[c2.index];

    // If Duel vs AI, update specific player score
    if (gameState.mode === 'vsAI') {
      if (gameState.aiTurn) {
        gameState.aiScore++;
        inspector.logEvent('AI: match', `AI scored a match! (${c1.id})`, 'AI successfully linked memorized locations.');
      } else {
        gameState.playerScore++;
        inspector.logEvent('PLAYER: match', `Player scored a match! (${c1.id})`, 'Player successfully paired matching cards.');
      }
    } else {
      // In classic mode, hide matched cards elegantly
      setTimeout(() => {
        cardEl1.classList.add('matched-hidden');
        cardEl2.classList.add('matched-hidden');
      }, 500);
    }

    gameState.selectedCards = [];
    gameState.isLocked = false;
    inspector.updateState(gameState);

    // Check Victory Thresholds
    checkWinCondition();

    // If vs AI mode, keep turn loop active
    if (gameState.mode === 'vsAI' && !isGameOver()) {
      if (gameState.aiTurn) {
        // If AI scored, it gets another turn!
        setTimeout(triggerAITurn, 1000);
      } else {
        // Player matched, remains player turn
      }
    }

  } else {
    // MISMATCH
    cardEl1.classList.add('mismatch');
    cardEl2.classList.add('mismatch');
    audio.playMismatch();

    inspector.logEvent(
      'STATE: mismatch',
      'Cards do not match. Initiating asynchronous flip-back timeout.',
      'A Web API setTimeout flips mismatched cards back after 1000ms.'
    );
    
    // Register active Timeout inside Inspector thread visualizer
    inspector.triggerTimerPulse('Timeout (Flip Back)', '1000ms');

    // Flip back after 1.0s timeout
    setTimeout(() => {
      c1.isFlipped = false;
      c2.isFlipped = false;
      cardEl1.classList.remove('flipped', 'mismatch');
      cardEl2.classList.remove('flipped', 'mismatch');

      gameState.selectedCards = [];
      gameState.isLocked = false;

      inspector.stopTimerPulse();

      // Handover turns in VS AI mode
      if (gameState.mode === 'vsAI') {
        gameState.aiTurn = !gameState.aiTurn;
        inspector.logEvent(
          'TURN: switch',
          `Turn handed over to: ${gameState.aiTurn ? 'Cyber Opponent' : 'Player'}.`,
          'State updates control boards.'
        );
        inspector.updateState(gameState);

        if (gameState.aiTurn) {
          triggerAITurn();
        }
      } else {
        inspector.updateState(gameState);
      }

    }, 1000);
  }
}

// --- TIMER CONTROL ---

function startGameTimer() {
  stopGameTimer();
  
  inspector.triggerTimerPulse('Interval (Clock tick)', '1000ms');

  gameState.timerId = setInterval(() => {
    if (gameState.mode === 'timeAttack') {
      gameState.elapsedTime--;
      if (gameState.elapsedTime <= 10 && gameState.elapsedTime > 0) {
        audio.playTick(); // Tick-tock warning for final 10 seconds!
        statTimer.classList.add('pulse');
        setTimeout(() => statTimer.classList.remove('pulse'), 100);
      }
      if (gameState.elapsedTime <= 0) {
        handleGameOver(false); // Defeat due to timer depletion!
      }
    } else {
      gameState.elapsedTime++;
    }

    updateTimerDisplay();
    inspector.updateState(gameState);
  }, 1000);
}

function stopGameTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
    inspector.stopTimerPulse();
  }
}

function updateTimerDisplay() {
  const t = Math.max(0, gameState.elapsedTime);
  const minutes = Math.floor(t / 60).toString().padStart(2, '0');
  const seconds = (t % 60).toString().padStart(2, '0');
  statTimer.textContent = `${minutes}:${seconds}`;
}

// --- ADVANCED GAME DUEL AI CORE ---

function storeInAIMemory(cardIndex, cardId) {
  // AI only registers card memories in vsAI mode
  if (gameState.mode !== 'vsAI') return;

  // AI memory accuracy is limited by the difficulty choice (simulating forgetfulness)
  let probabilityToRemember = 0.6;
  if (gameState.aiDifficulty === 'easy') probabilityToRemember = 0.3;
  if (gameState.aiDifficulty === 'hard') probabilityToRemember = 0.95;

  if (Math.random() <= probabilityToRemember) {
    gameState.aiMemory[cardIndex] = cardId;
  } else {
    // Simulate minor forgetfulness: remove memory of cards if they were known
    delete gameState.aiMemory[cardIndex];
  }
}

function triggerAITurn() {
  if (!gameState.aiTurn || isGameOver()) return;

  gameState.isLocked = true; // Lock player input during AI actions
  inspector.logEvent(
    'AI: think',
    'AI opponent is planning card selections...',
    'AI scans its memory registers mapping previously seen indices to target IDs.'
  );

  // Buffer AI thinking speed (looks organic and human-like)
  setTimeout(() => {
    // 1. Identify which face-down cards remain on board
    const faceDownIndices = gameState.cards
      .filter(c => !c.isFlipped && !c.isMatched)
      .map(c => c.index);

    if (faceDownIndices.length === 0) return;

    // 2. Scan AI Memory to check if it knows where a matched pair is
    let selectionIndex1 = null;
    let selectionIndex2 = null;

    // Look for matching pairs in the remembered items
    const memoryScan = {};
    for (const [idxStr, id] of Object.entries(gameState.aiMemory)) {
      const idx = parseInt(idxStr, 10);
      // Double check the card hasn't been matched yet in the meantime
      if (!gameState.cards[idx].isMatched && !gameState.cards[idx].isFlipped) {
        if (!memoryScan[id]) {
          memoryScan[id] = [];
        }
        memoryScan[id].push(idx);
      }
    }

    // Find if we have two matching indices for the same ID in memory
    for (const [id, indices] of Object.entries(memoryScan)) {
      if (indices.length >= 2) {
        selectionIndex1 = indices[0];
        selectionIndex2 = indices[1];
        inspector.logEvent(
          'AI: choice',
          `AI memory recall success! Perfect match found in registers: [Card#${selectionIndex1}, Card#${selectionIndex2}]`,
          'AI calculated exact coordinates of matching cards from its active memory.'
        );
        break;
      }
    }

    // 3. If no matched pair is in memory, pick a random card first
    if (selectionIndex1 === null) {
      const randomKey = Math.floor(Math.random() * faceDownIndices.length);
      selectionIndex1 = faceDownIndices[randomKey];
      const icon1 = gameState.cards[selectionIndex1].id;

      // Check if it remembers where the MATCH of this random card is
      for (const [idxStr, id] of Object.entries(gameState.aiMemory)) {
        const idx = parseInt(idxStr, 10);
        if (idx !== selectionIndex1 && id === icon1 && !gameState.cards[idx].isMatched && !gameState.cards[idx].isFlipped) {
          selectionIndex2 = idx;
          inspector.logEvent(
            'AI: choice',
            `AI flipped Card#${selectionIndex1} and recalled the match's position: Card#${selectionIndex2}!`,
            'After flipping the first card, the AI found its matching counterpart in its memory.'
          );
          break;
        }
      }

      // If it still doesn't know, pick a second card at random
      if (selectionIndex2 === null) {
        const remainingFaceDown = faceDownIndices.filter(idx => idx !== selectionIndex1);
        if (remainingFaceDown.length > 0) {
          const randomKey2 = Math.floor(Math.random() * remainingFaceDown.length);
          selectionIndex2 = remainingFaceDown[randomKey2];
          inspector.logEvent(
            'AI: choice',
            `AI chose random coordinates: Card#${selectionIndex1} and Card#${selectionIndex2}.`,
            'AI had no memory of a matching pair, falling back to random trials.'
          );
        }
      }
    }

    // Execute first flip
    handleCardFlip(selectionIndex1);

    // Delay second flip to look natural
    setTimeout(() => {
      handleCardFlip(selectionIndex2);
    }, 1000);

  }, 1200);
}

// --- UTILITY METHODS ---

function updateAccuracy() {
  if (gameState.moves === 0) return;
  const pct = Math.round((gameState.matches / gameState.moves) * 100);
  statAccuracy.textContent = `${pct}%`;
}

function checkWinCondition() {
  const won = gameState.cards.every(c => c.isMatched);
  if (won) {
    handleGameOver(true);
  }
}

function isGameOver() {
  return gameState.cards.every(c => c.isMatched) || (gameState.mode === 'timeAttack' && gameState.elapsedTime <= 0);
}

function handleGameOver(isSuccess) {
  stopGameTimer();
  audio.playVictory();

  setTimeout(() => {
    // Fill stats on final screen modal
    document.getElementById('endStatTime').textContent = statTimer.textContent;
    document.getElementById('endStatMoves').textContent = gameState.moves;
    document.getElementById('endStatAccuracy').textContent = statAccuracy.textContent;

    const winnerVal = document.getElementById('endStatWinner');
    const endTitle = document.getElementById('endTitle');
    const endDesc = document.getElementById('endDesc');

    if (gameState.mode === 'vsAI') {
      winnerVal.style.display = 'block';
      if (gameState.playerScore > gameState.aiScore) {
        endTitle.textContent = '🏆 Defeated Cyber AI!';
        endDesc.textContent = `You dominated the machine! Player: ${gameState.playerScore} pts | AI: ${gameState.aiScore} pts.`;
        winnerVal.textContent = 'Player (Win)';
        audio.playVictory();
      } else if (gameState.aiScore > gameState.playerScore) {
        endTitle.textContent = '🤖 Cyber AI Dominates!';
        endDesc.textContent = `The AI matched cards faster! Player: ${gameState.playerScore} pts | AI: ${gameState.aiScore} pts.`;
        winnerVal.textContent = 'AI (Defeat)';
        audio.playDefeat();
      } else {
        endTitle.textContent = '⚖️ Grid Draw Symmetry!';
        endDesc.textContent = `A perfect draw! Both scored ${gameState.playerScore} pairs.`;
        winnerVal.textContent = 'Tied';
      }
    } else {
      winnerVal.parentNode.style.display = 'none'; // Hide winner element in standard modes
      if (isSuccess) {
        endTitle.textContent = '🏆 Victory Achieved!';
        endDesc.textContent = 'The game states are harmonized. Perfect pair convergence!';
        audio.playVictory();
      } else {
        endTitle.textContent = '⌛ Chrono Depleted!';
        endDesc.textContent = 'The Time Attack timer expired before pairs converged.';
        winnerVal.parentNode.style.display = 'block';
        winnerVal.textContent = 'None (Defeat)';
        audio.playDefeat();
      }
    }

    endModal.classList.remove('hidden');
    inspector.logEvent(
      'GAME_OVER',
      'The board solved. Terminating async threads.',
      'Congratulations! Clean up processes completed, final score overlays active.'
    );
    inspector.updateState(gameState);
  }, 1000);
}

function getModeName(mode) {
  if (mode === 'classic') return 'Classic';
  if (mode === 'timeAttack') return 'Time Attack';
  if (mode === 'vsAI') return 'VS AI Duel';
  return 'Sandbox';
}

// Automatically fits the game board grid inside the viewport height & width while maintaining card proportions
function resizeGameBoard() {
  if (!gameBoard) return;
  const container = gameBoard.parentElement;
  if (!container) return;

  // Compute container dimensions minus dynamic spacing
  const containerWidth = container.clientWidth - 16;
  const containerHeight = container.clientHeight - 16;

  if (containerWidth <= 0 || containerHeight <= 0) return;

  let rows = 4, cols = 4;
  if (gameState.grid === '4x5') {
    rows = 4; cols = 5;
  } else if (gameState.grid === '6x6') {
    rows = 6; cols = 6;
  }

  // Calculate the target aspect ratio of the grid
  // Individual cards are 4:5 aspect ratio
  const gridWidthRatio = cols * 4;
  const gridHeightRatio = rows * 5;
  const gridAspect = gridWidthRatio / gridHeightRatio;

  let finalWidth, finalHeight;
  if (containerWidth / containerHeight > gridAspect) {
    // Height is the limiting factor
    finalHeight = containerHeight;
    finalWidth = containerHeight * gridAspect;
  } else {
    // Width is the limiting factor
    finalWidth = containerWidth;
    finalHeight = containerWidth / gridAspect;
  }

  // Apply visual sizing variables to the DOM element
  gameBoard.style.width = `${Math.floor(finalWidth)}px`;
  gameBoard.style.height = `${Math.floor(finalHeight)}px`;

  // Log resize occurrences to show active listener capture
  if (inspector && typeof inspector.logEvent === 'function') {
    inspector.logEvent(
      'UI: resize',
      `Grid resized to ${Math.floor(finalWidth)}px x ${Math.floor(finalHeight)}px`,
      `Fitted grid (${gameState.grid}) inside viewport. Card sizes adjusted to preserve aspect ratios.`
    );
  }
}
