<div align="center">

# 🎲 Ludo

**A clean, responsive digital edition of the classic board game *Ludo***  
Play **locally**, **against AI bots**, or **online with friends** directly in your browser — zero backend required.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![MQTT](https://img.shields.io/badge/Online-MQTT_over_WSS-660066?style=flat-square)
![Zero Backend](https://img.shields.io/badge/Backend-None-10b981?style=flat-square)

</div>

---

## 🎮 About the Game

**Ludo** (*Chińczyk* / *Mensch ärgere Dich nicht*) is a faithful browser adaptation of the classic 11×11 tabletop board game for **2 to 4 players**. Roll the 3D die, bring your pieces out of base on a **6**, race around the 36-field track, capture opponents' pieces to send them back to base, and be the first player to guide all **4 pieces** into your home lane.

🔴 **Red** · 🔵 **Blue** · 🟢 **Green** · 🟡 **Yellow**

---

## 🕹️ Game Modes

- 👥 **Local Game (2–4 Players)** — classic pass-and-play on a single device with custom player names and any mix of human players and AI bots *(works offline)*.
- 🌐 **Online Room (MQTT over WebSockets)** — play with 2–4 friends across Wi-Fi or 4G/5G on any static host (**Netlify**, **GitHub Pages**, **Vercel**) with no backend server or accounts:
  - **Create Room** generates a 6-character room code and a direct **Invite Link** (`?room=CODE`) that auto-fills the join screen.
  - Uses public WebSocket MQTT brokers (`broker.emqx.io` with automatic failover to `broker.hivemq.com`) — works across strict networks and keeps players' IP addresses private.
  - Host-authoritative lobby where unoccupied slots can be toggled between **Open**, **Bot**, or **Off**.
  - Real-time synced 3D dice rolls, step-by-step piece animations, turn locking, automatic Bot takeover if a player disconnects mid-match, and instant return to lobby for a rematch.
- 🤖 **Smart AI Bots** — prioritizes captures, exiting base on a 6, entering the safe home lane, escaping threats, and advancing leading pieces.

---

## ✨ Features

- 🪵 **Classic 11×11 Vector SVG Board** — warm wooden tabletop frame, 36 track fields, colored corner bases, directional arrows, and 4-space home lanes that stay razor-sharp at any resolution.
- 🎲 **Interactive 3D Dice** — animated 6-sided CSS 3D cube (click the button, tap the die, or press `Space` / `Enter`).
- 📱 **Fully Responsive Layout** — proportional percentage-sized pawns with enlarged touch targets and a compact mobile layout so both the board and dice controls fit on screen without scrolling.
- ⚡ **Adjustable Game Speed** — 4 speed presets (**Slow**, **Normal**, **Fast**, **Instant**) for animations and bot turns.
- 📊 **Live Scoreboard & Event Toasts** — tracks every piece's state (base, track, home) and highlights captures, home arrivals, and bonus rolls.
- 🎨 **Modern Dark Glassmorphism UI** — ambient lighting, tactile 3D-shaded pieces, colored active-turn glow, and victory celebration modal.

---

## 📜 Rules & Gameplay

### 🎯 Objective
Be the first player to move all **4 of your pieces** around the board and into your colored **4-space home lane**.

### 🎲 Turn Flow
1. **Leave Base:** Roll a **6** to move a piece from your corner base onto your colored starting field.
2. **Three-Roll Rule:** If you have **no pieces on the outer track** (all in base or home), you get up to **3 rolls** per turn to roll a 6.
3. **Bonus Roll:** Every **6** grants an **extra roll** (up to 3 consecutive sixes).
4. **Captures:** Landing on a track field occupied by an opponent's piece **captures** it and sends it back to their base. You cannot land on a field already occupied by your own piece.
5. **Home Lane:** After completing a full lap (36 fields), enter your colored 4-space home lane with an exact roll. Pieces in the home lane are safe from capture.

### ⌨️ Controls

| Action | Input |
| :--- | :--- |
| **Roll Dice** | Click **Roll Dice**, click the 3D die, or press `Space` / `Enter` |
| **Move Piece** | Click or tap any highlighted bouncing piece |
| **Game Speed** | Drag the ⚡ speed slider (`Slow` → `Instant`) |
| **Menu / Restart** | Click **Menu / Restart** (or **Return to Lobby** / **Leave Room** online) |

---

## 🚀 Getting Started & Deployment

The project is 100% static HTML, CSS, and Vanilla JavaScript — no build step, package installation, or backend server required.

### Play Locally
```bash
git clone https://github.com/kkamilll/ludo.git
cd ludo
```
1. Open `index.html` in any modern browser.
2. Select a mode:
   - **Local Game**: choose 2–4 Players/Bots, enter names, and click **Start Game** *(works offline)*.
   - **Online Room**: enter your name, then click **Create Room** to share a code/link or **Join** with a friend's code *(requires internet access for MQTT over WSS)*.

### Deploy (Netlify / GitHub Pages / Vercel)
1. Push the repository to GitHub (or drag-and-drop the folder into [Netlify Drop](https://app.netlify.com/drop)).
2. Configure your host with **no build command** and publish directory `.` (repository root).
3. Share the deployed URL — friends can join directly via invite links (`https://your-site.example/?room=CODE`).

---

## 🗂️ Project Structure

```text
Ludo/
├── index.html   # Semantic HTML5 layout, local & online lobby, SVG board & modals
├── styles.css   # Dark glassmorphism theme, responsive layout, 3D dice & pawn styles
├── src/
│   └── app.js   # Game engine, AI bots, SVG board renderer & MQTT WebSocket multiplayer
└── README.md    # Documentation, rules & deployment guide
```

---

<div align="center">
  Built as a modern digital tribute to the classic board game <strong>Ludo</strong> 🎲
</div>
