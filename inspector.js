/**
 * Educational Code Inspector and State Visualizer
 * Bridges game runtime state and the browser DOM to teach events, state, and timers in real-time.
 */

class CodeInspector {
  constructor() {
    this.viewer = null;
    this.logger = null;
    this.pulseRing = null;
    this.timerNameEl = null;
    this.timerDurationEl = null;
    this.sidebar = null;
  }

  init() {
    this.viewer = document.getElementById('stateViewer');
    this.logger = document.getElementById('eventLogger');
    this.pulseRing = document.getElementById('pulseRing');
    this.timerNameEl = document.getElementById('activeTimerName');
    this.timerDurationEl = document.getElementById('activeTimerDuration');
    this.sidebar = document.getElementById('inspectorSidebar');

    this.logEvent(
      'INIT',
      'Inspector initialized.',
      'Event delegation handlers are registered and ready to capture standard browser click events.'
    );
  }

  // Set the visual state tree of the game with custom code highlighting
  updateState(state) {
    if (!this.viewer) return;

    // Deep-clone state and format cards listing to prevent overflowing the inspector view
    const visibleState = {
      mode: state.mode,
      difficulty: state.mode === 'vsAI' ? state.aiDifficulty : undefined,
      grid: state.grid,
      moves: state.moves,
      matches: state.matches,
      elapsedTime: `${state.elapsedTime}s`,
      isLocked: state.isLocked,
      activeTimerId: state.timerId ? `Interval#${state.timerId}` : null,
      selectedCards: state.selectedCards.map(c => `Card#${c.index} [ID: ${c.id}]`),
      aiTurn: state.mode === 'vsAI' ? state.aiTurn : undefined,
      aiMemoryCount: state.mode === 'vsAI' ? Object.keys(state.aiMemory).length : undefined
    };

    // Syntactically format state object as colorized HTML
    const formattedCode = this.formatJSON(visibleState);
    this.viewer.innerHTML = formattedCode;
  }

  // Syntax highlighting formatter for raw JS objects
  formatJSON(obj) {
    const rawJson = JSON.stringify(obj, null, 2);
    
    // Regular expression to identify keys, strings, numbers, booleans, and null types
    return rawJson.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, 
      (match) => {
        let cls = 'code-num';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'code-key';
          } else {
            cls = 'code-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'code-bool';
        } else if (/null/.test(match)) {
          cls = 'code-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  /**
   * Log browser action occurrences with educational context
   * @param {string} type - Event Type (e.g. CLICK, TIMEOUT, STATE)
   * @param {string} msg - Action description
   * @param {string} explanation - Technical description of what happened in the background
   */
  logEvent(type, msg, explanation) {
    if (!this.logger) return;

    // Remove placeholder line if still present
    const placeholder = this.logger.querySelector('.log-entry[style*="italic"]');
    if (placeholder) {
      this.logger.innerHTML = '';
    }

    const timeStamp = new Date().toLocaleTimeString().split(' ')[0]; // HH:MM:SS format
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <div>
        <span class="log-time">[${timeStamp}]</span>
        <strong style="color: var(--color-secondary)">[${type}]</strong> 
        <span class="log-msg">${msg}</span>
      </div>
      <div class="log-explain">&raquo; ${explanation}</div>
    `;

    this.logger.appendChild(entry);

    // Limit log rows to prevent performance bottleneck
    while (this.logger.children.length > 25) {
      this.logger.removeChild(this.logger.firstChild);
    }

    // Scroll to view new log smoothly
    this.logger.scrollTop = this.logger.scrollHeight;
  }

  // Displays active browser Web API asynchronous operations
  triggerTimerPulse(timerName, intervalDesc) {
    if (!this.pulseRing) return;

    this.pulseRing.classList.add('active');
    this.timerNameEl.textContent = timerName;
    this.timerDurationEl.textContent = intervalDesc;
  }

  // Stops visual asynchronous timer animations
  stopTimerPulse() {
    if (!this.pulseRing) return;

    this.pulseRing.classList.remove('active');
    this.timerNameEl.textContent = 'Idle';
    this.timerDurationEl.textContent = '0ms';
  }
}

export const inspector = new CodeInspector();
