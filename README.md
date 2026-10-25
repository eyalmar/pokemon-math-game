# Pokémon Math Game

A lightweight browser-based educational game that blends arithmetic practice, collectible Pokémon, and simple progression systems. The project is designed to feel like a casual learning game for children while keeping enough structure that new features can be added with minimal refactoring.

This README is intentionally written as a design and extension guide for future AI-assisted or human development work.

## 1. Product Summary

The app is a daily math challenge game where a player:
- solves math problem sets,
- earns score and progression,
- catches or unlocks Pokémon rewards,
- spends points in a shop,
- and optionally syncs progress to Firebase.

Core loop:
1. Player opens the game.
2. A set of exercises is generated.
3. The player studies a short review phase, then answers questions.
4. Correct answers increase score.
5. Repeated mistakes are tracked for review.
6. Progress unlocks rewards and Pokémon cards.
7. The player can use the shop and battle arena systems.

## 2. High-Level Architecture

This project is a static front-end application, not a framework app. Most logic is organized around a single app state object and a render cycle that re-renders the main UI based on that state.

### Main runtime model
- `index.html` is the main game shell used by players.
- `tester.html` is a developer/debug version with buttons to trigger sets quickly.
- `admin.html` is the admin panel for metrics and configuration.
- `game-core.js` contains the gameplay logic and state transitions.
- `firebase-config.js` contains Firebase initialization/configuration.
- `fractions-quiz.html` is a test/visualization page for fraction questions.

### Execution flow
- The HTML page loads and calls `initApp(...)` from `game-core.js`.
- `initApp` initializes:
  - Firebase (optional),
  - local save state,
  - player identity,
  - timers,
  - app phase,
  - and UI rendering.
- UI events call global functions like `window.generateNewSet()`, `window.checkChoiceAnswer()`, `window.buyPack()`, etc.
- These functions update `state`, persist data, and call `render()`.

## 3. Main App State

The game center is a `state` object (conceptually, though the exact structure may vary by version). It tracks the current user and game mode.

Typical values include:
- `phase`: current screen/mode (study, individual, fractions, triangles, shop, battle, etc.)
- `playerName`: current player name or anonymous label
- `score`: running score
- `setType`: current set category
- `currentIndex`: question index in the active set
- `timerSeconds`
- `mistakes`: map of problem keys to error counts
- `pokedex`: collected Pokémon IDs or records
- `inventory`: boosters or in-game resources
- `battleState`: arena/battle data if battling

The project relies heavily on a mutable state model and direct DOM updates rather than a state management library.

## 4. Data Persistence and Sync

### Local save
The game stores progress in browser `localStorage` by default.
- This provides offline play and quick prototyping.
- A key such as `pokemonMathTestSave` or a similar generated key is used for the player save object.

### Cloud sync (optional)
If Firebase config is available, the app can also sync data to Firestore.
- The app may save user progress under a user profile or game document.
- Admin logic uses Firestore collection paths like:
  - `artifacts/{appId}/config/settings`
  - `artifacts/{appId}/online/{userId}`
  - `gameData` documents grouped under user IDs

### Important design note
The save format and sync model are intentionally simple and are good extension points for future versions.

## 5. Game Modes and Mechanics

The app includes several learning modes.

### A. Practice / Daily challenge sets
These use generated problem sets and question flows.

Supported types include:
- multiplication and division questions,
- long addition/subtraction,
- triangle geometry questions,
- fraction questions,
- matching games,
- individual answer-entry exercises.

### B. Study phase
Before a set starts, the app displays a review state, usually showing the relevant problem types or formulas. This is a teaching phase before the challenge phase.

### C. Question answering
Question UI includes:
- multiple choice buttons,
- numeric input fields,
- matching pairs,
- structured geometry selections.

Each answer updates:
- score,
- timer,
- progress,
- mistake tracking,
- reward eligibility.

### D. Mistake tracking
The app stores repeated error patterns by a key such as:
- multiplication pair (`a_b`),
- fraction key (`frac_...`),
- triangle key (`tri_...`),
- long math operation keys (`lm_...`)

This supports a repetition-based review system and enables admin analytics.

### E. Pokemon rewards
The game awards Pokémon in several ways:
- after set completion,
- after successful answer streaks,
- from booster packs,
- or via battle outcomes.

The reward system includes:
- rarity categories,
- Pokémon ID lists,
- card reveal animations,
- Pokédex collection tracking.

### F. Shop and booster packs
The shop lets players spend earned points on booster packs or packs with different rarity tiers.

Pack types likely include:
- basic,
- super,
- ultra.

This creates a simple progression loop similar to card collection games.

### G. Battle arena
The game also contains an arena / PvE or multiplayer-like battle flow.
- team selection,
- battle setup,
- turn-based actions,
- progress bars,
- round outcomes,
- victory/defeat handling.

This is a strong extension point for future competitive or co-op gameplay.

## 6. Questions and Problem Generation

The project is built around procedural question generation.

### Multiplication / division
Likely generated with random number pairs and answer options.

### Long math
The app generates multi-step arithmetic tasks, likely with carry/borrow patterns. The function names suggest:
- `generateLongMathProblem()`,
- `createLongMathSet()`,
- `activateNextLongMathStep()`

### Fractions
Fraction exercises likely include:
- visual circular or rectangular fraction representations,
- numerator/denominator understanding,
- simplified and unsimplified answer options,
- visual matching tasks.

### Triangles and geometry
The app includes dedicated triangle question generation and answer validation.

### Match game
A pair-matching mechanic is used to match equations or expressions to their answers.

## 7. UI Structure and Responsibilities

### `index.html`
Main user-facing game entry screen.
Contains:
- header with timer, score, player name,
- app container,
- Pokémon collection area,
- info modal,
- shop / arena trigger buttons.

### `tester.html`
Developer environment used to quickly run specific game modes without playing a full session. It includes:
- set trigger buttons,
- score display,
- simplified debug layout.

### `admin.html`
Management dashboard for classroom or project oversight.
Tracks:
- total players,
- total completed sets,
- average score,
- active question settings,
- difficult exercises,
- player leaderboard.

This is useful for teacher-facing analytics or operational monitoring.

### `fractions-quiz.html`
Standalone visual testing page for fraction questions.
Useful for validating fraction generation, visuals, and answer logic without affecting the game loop.

## 8. File-by-File Design Map

### `index.html`
- Game shell UI
- loads the app and initializes state
- contains main panels and modals

### `game-core.js`
- central gameplay engine
- state transitions
- business logic for rounds, rewards, battle flow
- generation of question sets
- rendering logic for screens
- sync/persistence logic

### `admin.html`
- analytics dashboard
- admin configuration toggles
- Firestore metrics and leaderboard display

### `tester.html`
- debug harness for repetitive testing
- manual set generation
- quick validation environment

### `fractions-quiz.html`
- isolated fraction visual test page
- question and answer validation quick-check

### `firebase-config.js`
- Firebase setup and app configuration
- may expose app ID and config variables to the app

## 9. Coding Conventions Used by the Project

The codebase currently follows a casual, browser-first style rather than a strict framework architecture.

Common patterns:
- plain JavaScript functions,
- DOM-driven rendering,
- direct event listeners,
- global window functions for UI access,
- state mutation with render calls,
- inline CSS/Tailwind classes in HTML files,
- static asset loading via CDN.

This is easy to prototype quickly, but future work should keep state and UI updates predictable.

## 10. Best Practices for Future Feature Development

### Keep game flow explicit
When adding new features, prefer modelled phases like:
- `phase = 'study'`
- `phase = 'question'`
- `phase = 'reward'`
- `phase = 'shop'`
- `phase = 'battle'`

This makes it easier to reason about transitions and UI state.

### Keep state centralized
Most app features should update a single `state` object and then re-render from it. Avoid scattering important game values across DOM nodes.

### Design feature code by responsibility
When adding content, split logic into clear functions such as:
- question generation,
- answer validation,
- rendering,
- persistence,
- reward processing,
- analytics logging.

### Persist only meaningful progress
Do not store UI-only transient values in long-term save state. Store only values that affect learning or progression.

### Prefer deterministic question metadata
When generating question objects, include metadata such as:
- `key`,
- `type`,
- `correct`,
- `difficulty`,
- `explanation` (optional),
- `category`.

This makes debugging, analytics, and AI augmentation easier.

## 11. Suggested Extension Path for AI Agents

When building additional features, the recommended workflow is:

1. Identify the new feature area.
   - Example: new game mode, new reward type, admin metrics, battle system, classroom mode.

2. Add or adjust the relevant state fields.
   - Keep the schema predictable and versioned where needed.

3. Create the generation logic.
   - New question set generation should be isolated and testable.

4. Add render functions.
   - Use the existing render pattern and keep UI steps explicit.

5. Connect to persistence.
   - Update local save and optional Firestore sync.

6. Add admin visibility where needed.
   - If a feature affects education or analytics, expose it in the admin panel.

7. Test manually with `tester.html`.
   - This is the fastest validation environment for this project.

## 12. Example Feature Additions

Potential future additions include:
- additional math categories (algebra, word problems, decimals),
- teacher-specific classroom dashboards,
- daily streaks and badge system,
- sound effects and animations,
- level-based progression,
- multiplayer battle or team-based challenges,
- localization improvements,
- richer progression analytics,
- retries and mastery thresholds.

## 13. Run Locally

Because this is a static app, there is no build step required.

Option 1:
- open `index.html` directly in a browser

Option 2:
```bash
python -m http.server 8000
```
Then visit:
```text
http://localhost:8000
```

For debugging and set generation, open:
- `tester.html`
- `admin.html`

## 14. Design Notes for Future Maintenance

This project is intentionally designed as a prototype-friendly educational app. It prioritizes:
- fast iteration,
- easy experimentation,
- visual feedback,
- learning through repetitive practice,
- collectible reward mechanics.

The tradeoff is that the structure is less formal than a React/Vue/Next.js app. That is fine for this stage, but any future major expansion should likely include:
- a single state store,
- modularized question generators,
- a cleaner save schema,
- and component-level UI separation.

## 15. Summary

This app is best understood as a lightweight educational game engine with:
- math question generation,
- learning progression,
- reward systems,
- collection mechanics,
- optional cloud sync,
- and a simple admin layer.

It is well-positioned for incremental feature growth because the app logic is centralized and the game flow is easy to reason about.

If you are adding a new feature, start from the main runtime flow in `game-core.js`, align it with the existing `state` model, and validate through the debug pages before changing the main player experience.
