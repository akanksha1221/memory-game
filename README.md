# 🪐 CyberMemory &bull; Educational State Machine

An ultra-premium, interactive **Memory Card Game** built from the ground up using **Vanilla JS (ES6+)**, **Vanilla CSS3**, and the **Web Audio API**. This project serves as a hands-on, visual sandbox to teach developers core browser fundamentals: **Event Delegation**, **State Management**, **Asynchronous Timers**, **Container Queries**, and **Procedural Sound Synthesis**.

👉 **Live Local Sandbox**: Served hot-reloaded via Vite at [http://localhost:5173](http://localhost:5173)

---

## 🚀 Key Features

*   **Three High-Contrast Themes**:
    *   🪐 **Cosmos Cyber**: Planets, rockets, stars, and neon space graphics.
    *   🎮 **Retro Arcade**: Pacman, cherries, space invaders, and retro button aesthetics.
    *   🔮 **Mystical Runes**: Glowing runes, crystals, potions, and stone trims.
*   **Three Immersive Game Modes**:
    *   **Classic**: Chill, match-them-all state convergence tracking moves and time.
    *   **Time Attack**: A thrilling countdown sweep against the clock (adds ticking mechanical clock alerts under 10 seconds!).
    *   **VS AI (Memory Duel)**: Battle a synthetic opponent with varying difficulty rings (Easy/Medium/Hard) that dynamically memorizes cards flipped by either player.
*   **Live Code Inspector & State Visualizer**:
    *   **Reactive JSON tree**: Watch state variables (`isLocked`, `elapsedTime`, `selectedCards`, `aiMemory`) mutate in real-time.
    *   **Event Logger Terminal**: Captures and explains DOM events (e.g. `bubble captures`, `transitionend`, `setTimeout`) as they fire.
    *   **Call Stack Monitor**: Visualizes async Web API timers (`setInterval`, `setTimeout`) as neon pulsing rings.
*   **Procedural Web Audio Synthesizer**:
    *   Zero external audio asset requests! Generates real-time sound effects (chords, sweeps, error buzzers, and arpeggiated fanfares) on-the-fly using browser mathematical frequency nodes.

---

## 🎓 Under the Hood: Educational Tech Stacks

### 1. High-Performance Event Delegation
Instead of registering 16, 20, or 36 separate event handlers for every single card, we attach a single click listener to the parent `#gameBoard` container. 

```javascript
gameBoard.addEventListener('click', (event) => {
  // Bubbling path capture
  const cardEl = event.target.closest('.card');
  if (!cardEl || gameState.isLocked || gameState.aiTurn) return;
  
  handleCardFlip(parseInt(cardEl.getAttribute('data-index'), 10));
});
```
*   **Concept Taught**: Leveraging the **Event Bubbling Phase** to optimize performance, preserve browser memory buffers, and prevent memory leaks.

---

### 2. Full-Viewport Sizing & Container Queries
To deliver a desktop-app feel, the game fits perfectly inside any window size without vertical or horizontal scrollbars:
*   **Dynamic Bounding Calculator**: A window resize loop in JavaScript calculates the available width/height of the game board container, evaluates the columns and rows of the grid, and resizes the `#gameBoard` box in real-time while strictly maintaining a card-grid aspect ratio.
*   **CSS Container Queries**:
    ```css
    .card {
      container-type: size;
    }
    .card-front {
      font-size: 46cqw; /* Emojis scale in exact proportion to card width! */
    }
    ```
*   **Concept Taught**: Combining viewport locks with **CSS Container Queries** (`cqw`/`cqh`) to scale typography and SVG assets fluidly within individual component dimensions instead of global media query screens.

---

### 3. Web Audio Synthesis
Utilizes browser-based procedural audio oscillators and envelope filters to generate satisfying retro game chimes:
*   **Sine pitch sweep** (`osc.frequency.exponentialRampToValueAtTime`) for card flips.
*   **Triangle major pentatonic arpeggios** (C5 -> E5 -> G5 -> C6) for pair matches.
*   **Sawtooth detuned downward sweeps** for mismatch warning buzzers.
*   **Concept Taught**: Triggering zero-latency audio nodes directly in the browser thread using synthetic audio pipelines.

---

## 📂 File Directory

```
d:\dev\games\memory-card-game\
├── index.html        # Semantic HTML layout, options overlays, and sidebar
├── style.css         # Glassmorphism design tokens, 3D flip rules, container queries
├── audio.js          # Web Audio synth chimes (flip, match, mismatch, fanfares)
├── game.js           # Grid shuffler, event delegation hook, and Memory Duel AI
├── inspector.js      # Educational bridge rendering live state trees & logs
└── package.json      # Vite local server script dependencies
```

---

## 🛠️ Local Installation

Ensure you have [Node.js](https://nodejs.org/) installed:

1. Clone or navigate to the directory:
   ```bash
   cd memory-card-game
   ```
2. Install the lightweight development server dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open your browser to **[http://localhost:5173/](http://localhost:5173/)** and enjoy!
