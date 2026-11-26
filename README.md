# 🎲 Ludo

A browser edition of the classic board game **Ludo** (*Chińczyk* / *Mensch ärgere Dich nicht*) for **2 to 4 players**. Play locally, against bots, or online with friends using plain HTML, CSS, and JavaScript, with no backend required.

Roll the 3D die, bring pieces out of base on a **6**, race around the 36-field track, capture opponent pieces to send them back to base, and guide all **4 of your pieces** into your colored home lane first. Supports **Red, Blue, Green, and Yellow** slots in any mix of human players and bots.

---

## 🕹️ Game Modes

- **Local Game (2-4 Players):** Pass-and-play on a single device with custom player names and any mix of human players and bots. Works offline.
- **Online Room (MQTT over WebSockets):** Play with 2-4 friends over Wi-Fi or mobile data on any static host (Netlify, GitHub Pages, Vercel) with no server or accounts.
  - **Create Room** generates a 6-character room code and an invite link (`?room=CODE`) that fills in the join screen automatically.
  - Uses public WebSocket MQTT brokers (`broker.emqx.io` with automatic failover to `broker.hivemq.com`), working across strict networks without exposing players' IP addresses.
  - Host-controlled lobby where empty slots can be toggled between **Open**, **Bot**, and **Off**.
  - Syncs 3D dice rolls, step-by-step piece animations, turn locking, automatic Bot takeover if a player disconnects mid-match, and instant return to lobby for rematches.
- **Bots:** Computer players that prioritize captures, exiting base on a 6, entering the safe home lane, escaping threats, and advancing leading pieces.

---

## 📜 Rules

### Objective
Be the first player to move all **4 pieces** around the 36-field outer track and into your colored **4-space home lane**.

### Turn Flow
1. **Leave Base:** Roll a **6** to move a piece from your corner base onto your colored starting field.
2. **Three-Roll Rule:** If you have **no pieces on the outer track** (all are in base or already in home), you get up to **3 rolls** per turn to try for a 6.
3. **Bonus Roll:** Rolling a **6** grants an extra roll (up to 3 consecutive sixes).
4. **Captures:** Landing on an outer-track field occupied by an opponent's piece sends it back to their base. You cannot land on a field occupied by your own piece.
5. **Home Lane:** After completing a full lap, enter your colored 4-space home lane with an exact roll. Pieces in the home lane cannot be captured.

---

## ⚙️ Features

- **11x11 SVG Board:** Wooden tabletop frame, 36 outer track fields, colored corner bases, directional arrows, and 4-space home lanes that scale cleanly to any screen size.
- **3D Die:** Animated CSS 3D cube rolled by clicking the button, clicking the die directly, or pressing `Space` / `Enter`.
- **Game Speed Slider:** 4 presets (**Slow**, **Normal**, **Fast**, **Instant**) for piece animations and bot turns.
- **Scoreboard & Event Toasts:** Shows every player's piece count (base, track, home) and highlights captures, home arrivals, and bonus rolls.
- **Responsive Layout:** Dark glassmorphism UI with proportional pawns, larger touch targets, and a compact mobile layout so the board and dice fit on screen without scrolling.

---

## ⌨️ Controls

| Action | Input |
| :--- | :--- |
| Roll dice | Click **Roll Dice**, click the 3D die, or press `Space` / `Enter` |
| Move piece | Click or tap any highlighted piece |
| Game speed | Adjust the speed slider (`Slow` to `Instant`) |
| Menu / Restart | Click **Menu / Restart** (or **Return to Lobby** / **Leave Room** online) |

---

## 💻 Setup & Deployment

Pure static HTML, CSS, and JavaScript. No build step, packages, or backend server needed.

### Run Locally
```bash
git clone https://github.com/kkamilll/Ludo.git
cd Ludo
```
1. Open `index.html` in any modern browser.
2. Pick **Local Game** (set up 2-4 players/bots and start; works offline) or **Online Room** (enter your name and create or join a room; requires internet).

### Deploy
1. Push to GitHub or upload the folder to Netlify, GitHub Pages, or Vercel.
2. Leave the build command empty and set the publish directory to `.`.
3. Share your site URL or direct room invite links (`https://your-site.example/?room=CODE`).

---

## 📁 Project Structure

```text
Ludo/
├── index.html   # Layout, local and online lobby, SVG board, and modals
├── styles.css   # Dark glassmorphism styling, responsive layout, 3D die, and pawns
├── src/
│   └── app.js   # Game logic, bots, SVG board renderer, and MQTT multiplayer
└── README.md    # Documentation
```

---

## 📄 License

Licensed under the ISC License. Created by [Kamil](https://github.com/kkamilll).
