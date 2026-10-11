# Pokémon Math Game

A fun math quiz game for kids that combines multiplication/division practice with Pokémon collection and rewards.

The game presents a series of math exercises, tracks progress with a timer and score, and rewards correct answers with collectible Pokémon cards. Players can also spend points in a shop to buy booster packs and expand their collection.

## Features

- Multiplication and division practice
- Study phase before each set
- Multiple question formats:
  - multiple choice
  - answer input
  - matching game
- Score tracking and timer
- Repetition-based review for mistakes
- Pokémon reward system
- Booster packs and shop
- Local save support
- Optional cloud sync with Firebase
- Responsive layout for desktop and mobile

## How It Works

1. The player reviews a set of math questions.
2. They answer practice questions in different formats.
3. Correct answers increase the score.
4. Repeated mistakes are revisited to reinforce learning.
5. After enough correct answers, a Pokémon reward is earned.
6. Players can spend accumulated points in the shop to buy packs.
7. Collected Pokémon are shown in the Pokédex area.

## Game Flow

- Study phase: review the current multiplication set
- Question phase: answer individual exercises
- Match phase: connect equations with the correct results
- Reward phase: catch a Pokémon or reveal a booster pack
- Shop phase: spend points to buy packs

## Tech Stack

- HTML
- CSS
- JavaScript
- Tailwind CSS (via CDN)
- Firebase Authentication + Firestore (optional)
- PokeAPI for Pokémon data

## Run Locally

This project is a static web app, so no build step is required.

Option 1: Open directly
- Open `index.html` in a browser

Option 2: Serve locally
```bash
python -m http.server 8000
```

Then open:
```text
http://localhost:8000
```

## Storage and Sync

The game stores progress in browser localStorage by default. If Firebase configuration is available, it can also sync the save data to the cloud for the current user.

## Project Structure

```text
.
├── index.html
├── README.md
└── assets (if added later)
```

## Notes

- The game is designed for children and emphasizes learning through repetition and rewards.
- The UI is bilingual (Hebrew + English-style math labels and game text).
- Pokémon data is fetched from PokeAPI at runtime.

## License

This project is for personal and educational use. Add your preferred license here if needed.
