# Cozy Closet

*Draw it. Hang it. Love it.*

A cozy 2D pixel art clothing shop simulation built with vanilla JavaScript and HTML5 Canvas.

Design your own clothes, build your fashion brand, decorate your shop, and sell your creations to AI customers.

> **Status:** Playable prototype. The shop, 3D-style pixel art, customers with speech bubbles, the design studio (T-shirt, hoodie, sweatshirt, jacket, shirt, tank top), decorating and stock management all work. See the roadmap for what is next.

---

## Main menu and logo

The game opens on a main menu: **Continue**, **New game**, **Load game** (3 save slots or an exported file) and **How to play**.
Put your logo at `assets/logo.png` and the menu shows it automatically. Logo prompts are in [docs/logo-prompt.md](docs/logo-prompt.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Gameplay](#gameplay)
4. [Game Systems](#game-systems)
5. [Clothing Design Studio](#clothing-design-studio)
6. [Shop Customization](#shop-customization)
7. [Customer AI](#customer-ai)
8. [Economy & Progression](#economy--progression)
9. [Audio & Sound Effects](#audio--sound-effects)
10. [Controls](#controls)
11. [Design Guidelines](#design-guidelines)
12. [Tech Stack](#tech-stack)
13. [Getting Started](#getting-started)
14. [Project Structure](#project-structure)
15. [Architecture](#architecture)
16. [Data & Save Format](#data--save-format)
17. [Development Roadmap](#development-roadmap)
18. [Future Features](#future-features)
19. [Contributing](#contributing)
20. [Credits & Licensing](#credits--licensing)

---

## Overview

Cozy Closet is a relaxing pixel art simulation where you run your own fashion business from the ground up.

Start with an empty shop, choose a location, name your brand, draw custom clothing, decorate your store, and watch customers browse and buy what you have made. There is no fail state pressure: the game is about creativity, expression, and slowly growing something that is yours.

**Pillars**

- **Creativity first** — every product can be drawn by the player.
- **Cozy pacing** — no timers that punish, no harsh failure.
- **Visible progress** — a shop that visibly grows with your brand.
- **Responsive feedback** — small animations and sounds for every action.

---

## Features

- **Shop Location** — Choose where to establish your clothing business.
- **Custom Shop Name** — Create a unique name for your brand.
- **Clothing Design Studio** — Draw your own clothing designs using a pixel art editor.
- **Clothing Customization** — Apply custom artwork to different clothing types.
- **AI Customers** — Customers visit your shop, browse products, and purchase clothing.
- **Shop Decoration** — Customize your shop with furniture, decorations, and custom assets.
- **Inventory Management** — Manage your clothing collections and available stock.
- **Business Progression** — Earn money, upgrade your shop, and expand your brand.
- **Sound Effects (SFX)** — Satisfying audio feedback for player actions and shop activity.
- **Auto Save** — Progress is stored locally in the browser.

---

## Gameplay

### Core loop

1. Select a shop location.
2. Name your clothing brand.
3. Customize your shop.
4. Design custom clothing.
5. Add products to your inventory and set prices.
6. Open your shop.
7. Welcome AI customers.
8. Sell clothing and earn money.
9. Upgrade and expand your business.

### Game modes of play

| Mode | Purpose |
|---|---|
| **Shop View** | Watch customers, restock, and manage the open shop. |
| **Design Studio** | Draw and save clothing designs. |
| **Decorate Mode** | Place, move, rotate, and remove furniture and decorations. |
| **Inventory / Pricing** | Assign designs to stock, set prices, and review sales. |
| **Upgrades / Map** | Buy upgrades, unlock locations and collections. |

### Day cycle

- A day has a **preparation phase** (design, decorate, restock) and an **open phase** (customers arrive).
- The player opens and closes the shop manually or lets it run on a timer.
- A short **end-of-day summary** shows revenue, items sold, best seller, and customer satisfaction.

---

## Game Systems

| System | Responsibility |
|---|---|
| **Game Loop** | Fixed-timestep update, variable render, pause and speed control. |
| **Renderer** | Pixel-perfect canvas drawing, camera, sprite layers, y-sorting. |
| **Scene Manager** | Title, shop, studio, decorate, and menu scenes. |
| **Input Manager** | Mouse and keyboard abstraction with rebindable keys. |
| **Entity System** | Customers, furniture, and decorations as entities with components. |
| **Economy System** | Money, pricing, demand, sales records. |
| **Inventory System** | Designs, stock counts, display assignments. |
| **Save System** | LocalStorage persistence with versioned data. |
| **Audio Manager** | SFX playback, volume channels, mute, overlap limiting. |
| **UI System** | Menus, HUD, tooltips, dialogs, Lucide icon rendering. |

---

## Clothing Design Studio

A built-in pixel art editor for creating clothing artwork.

### Clothing categories

| Category | Notes |
|---|---|
| T-Shirts | Short sleeves, beginner friendly canvas. |
| Shirts | Collar and button area; larger canvas. |
| Hoodies | Hood, pocket, and sleeve regions. |
| Jackets | Front opening, collar, and sleeve regions. |
| Sweatshirts | Long sleeves, ribbed hem and cuffs. |
| Tank Tops | Sleeveless, smallest canvas. |

Each category has its own template, silhouette mask, and customizable design area. Pixels outside the mask are ignored so artwork always fits the garment.

### Editor tools

- Pencil, eraser, fill bucket, and eyedropper
- Line, rectangle, and ellipse shapes
- Selection, move, flip, and rotate
- Mirror / symmetry drawing mode
- Undo and redo
- Zoom and optional pixel grid
- Color palette with custom colors and recent colors
- Base garment color and fabric tint
- Live preview on a model or mannequin

### Design workflow

1. Pick a clothing category.
2. Choose a base color.
3. Draw on the design area.
4. Preview the garment on a character.
5. Name the design and save it.
6. Add it to inventory and set a price.

### Design rules

- Designs are stored as palette-indexed pixel data to keep saves small.
- Each design has a name, category, creation date, and sales statistics.
- Designs can be duplicated and edited without losing the original.
- Designs can be exported and imported as PNG or JSON.

---

## Shop Customization

Create a unique shopping environment with:

- Clothing racks
- Display shelves
- Counters and tables
- Posters and wall decorations
- Lighting and furniture
- Custom signs and brand assets

### Layout editing

- Grid-based placement with snapping.
- Drag to move, rotate, and remove items.
- Collision rules prevent blocking doors and customer paths.
- Furniture has a **capacity** (how many garments it can display) and a **style** value.
- Walls and floors can be re-themed.
- Custom decoration assets can be added as PNG sprites.

### Shop attributes

| Attribute | Effect |
|---|---|
| **Style / Charm** | Raises customer interest and willingness to pay. |
| **Capacity** | Number of items that can be displayed. |
| **Comfort** | Customers browse longer. |
| **Cleanliness** | Affects satisfaction and reviews. |
| **Brand Recognition** | Increases customer traffic over time. |

---

## Customer AI

Customers are simple state-machine agents.

### States

`Spawn → Enter → Browse → Evaluate → (Buy | Leave) → Queue → Pay → Exit`

### Behavior

- Each customer has **preferences**: favorite categories, color tastes, budget, and patience.
- Customers walk between display furniture using grid pathfinding (A*).
- A customer evaluates a garment using: price vs. budget, category match, color match, shop charm, and brand recognition.
- Customers may buy multiple items, buy nothing, or leave a short review.
- If the counter is busy, patience decreases; very impatient customers leave.

### Purchase score (concept)

```text
interest = categoryMatch + colorMatch + shopCharm + brandBonus
value    = interest - priceFactor(price, budget)
buy if   value > threshold
```

### Customer types (examples)

- **Casual Shopper** — average budget, buys on impulse.
- **Trend Follower** — prefers popular and seasonal designs.
- **Bargain Hunter** — heavily price-sensitive.
- **Collector** — pays more for unique or high-quality designs.

---

## Economy & Progression

- **Money** is earned from sales and spent on furniture, upgrades, and new locations.
- **Reputation** grows with satisfied customers and unlocks content.
- **Pricing** is set per design; overpricing lowers sales, underpricing lowers profit.
- **Stock** is limited by display capacity and storage upgrades.

### Progression ideas

- Unlock larger shops and new locations (street corner, mall unit, seaside boutique).
- Unlock new clothing categories, canvas sizes, and palettes.
- Unlock furniture sets and decoration themes.
- Earn milestones and achievements (first sale, 100 sales, 10 designs, etc.).

---

## Audio & Sound Effects

Use short, subtle sound effects to make interactions feel responsive without overwhelming the cozy atmosphere.

### Suggested SFX

- Button click and menu selection
- Drawing, erasing, and color selection
- Clothing design saved
- Furniture placed, moved, or removed
- Shop door opening and closing
- Customer footsteps and browsing
- Customer purchase and cash register
- Sale success and insufficient funds
- Shop opening and closing

### Audio guidelines

- Keep UI sounds short and soft.
- Avoid playing overlapping effects too loudly (limit concurrent voices and add small pitch variation).
- Provide a master volume and SFX volume control.
- Allow players to mute sound effects.
- Trigger sounds only in response to relevant game events.
- Respect browser autoplay rules: start audio after the first user interaction.
- Use appropriately licensed or original audio assets.

---

## Controls

| Action | Input |
|---|---|
| Select / interact | Left click |
| Cancel / context menu | Right click |
| Pan camera | Middle mouse drag or `W` `A` `S` `D` |
| Zoom | Mouse wheel |
| Rotate furniture | `R` |
| Undo / Redo (editor) | `Ctrl+Z` / `Ctrl+Y` |
| Switch tool (editor) | `1`–`9` or tool shortcuts (`P`, `E`, `G`, `I`) |
| Toggle grid | `G` |
| Pause | `Space` or `Esc` |

Controls are intended to be rebindable in settings.

---

## Design Guidelines

| Property | Description |
|---|---|
| Game Style | 2D Pixel Art |
| Perspective | Top-down / 2D |
| UI Font | DM Sans |
| Icons | Lucide Icons |
| UI Style | Minimal and modern |
| Atmosphere | Cozy, creative, colorful |
| Interaction | Mouse and keyboard |
| Audio | Soft, playful SFX |

**Typography:** DM Sans

**Iconography:** Use icons instead of emojis throughout the interface.

### Pixel art rules

- Base tile size: **16×16** pixels, rendered at an integer scale (2×, 3×, 4×).
- Disable image smoothing; draw at integer coordinates to avoid blurry pixels.
- Use a limited, cohesive palette with warm, soft tones.
- Characters are roughly 16×24 pixels with simple walk animations.

### UI rules

- Minimal panels with rounded corners and generous spacing.
- Clear hierarchy: one primary action per screen.
- Tooltips for icon-only buttons.
- Keyboard focus states and sufficient contrast.

---

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES modules, no framework required)
- HTML5 Canvas
- Web Audio API / HTMLAudioElement
- LocalStorage
- DM Sans
- Lucide Icons

---

## Getting Started

### Requirements

- A modern browser (Chrome, Edge, Firefox, or Safari).
- A simple local web server (ES modules do not load from `file://`).

### Run locally

```powershell
# Option 1: Node
npx serve .

# Option 2: Python
python -m http.server 8000
```

Then open the printed local address (for example `http://localhost:8000`) in your browser.

### Resetting progress

Saved data lives in the browser's LocalStorage. Clear the site data (or use the in-game "Reset Save" option) to start over.

---

## Project Structure

```text
clothes-shop/
├── index.html
├── README.md
├── style.css
├── src/art.js        # procedural pixel art: garments, characters, furniture, room
├── src/main.js       # game loop, customers, speech bubbles, editor, stock
├── assets/
│   ├── characters/
│   ├── clothing/
│   ├── furniture/
│   ├── decorations/
│   ├── locations/
│   ├── icons/
│   └── audio/
│       ├── sfx/
│       └── music/
└── src/
    ├── main.js
    ├── game/
    │   ├── Game.js
    │   ├── Scene.js
    │   └── Camera.js
    ├── systems/
    │   ├── EconomySystem.js
    │   ├── InventorySystem.js
    │   ├── CustomerSystem.js
    │   ├── PathfindingSystem.js
    │   └── SaveSystem.js
    ├── editor/
    │   ├── PixelEditor.js
    │   ├── Tools.js
    │   └── ClothingTemplates.js
    ├── audio/
    │   └── AudioManager.js
    └── ui/
        ├── UIManager.js
        └── components/
```

The file names inside `game/`, `systems/`, `editor/`, and `ui/` are suggestions and can change as the project evolves.

---

## Architecture

- **Scenes** own their own update, render, and input handling; the Scene Manager swaps between them.
- **Systems** hold game logic and are independent of rendering where possible.
- **Event bus** (publish/subscribe) connects gameplay events to audio, UI, and stats. For example, `sale:completed` triggers the cash register SFX, updates money, and logs the sale.
- **Data-driven content** — furniture, clothing templates, locations, and customer types are defined in JSON/JS data files so new content needs no engine changes.
- **Separation of state and view** — the save state is a plain serializable object; rendering reads from it.

```text
Input → Scene → Systems → State ──► Renderer / UI
                  │
                  └──► Event Bus ──► Audio / Stats / Notifications
```

---

## Data & Save Format

Progress is saved to LocalStorage as versioned JSON.

```json
{
  "version": 1,
  "shop": { "name": "Thread & Pixel", "location": "street-corner", "level": 1 },
  "money": 500,
  "reputation": 0,
  "designs": [
    {
      "id": "d_001",
      "name": "Sunset Tee",
      "category": "tshirt",
      "baseColor": "#f4a261",
      "palette": ["#f4a261", "#e76f51", "#264653"],
      "pixels": "base64-or-rle-encoded-data",
      "price": 20,
      "stats": { "sold": 0 }
    }
  ],
  "inventory": { "d_001": 5 },
  "layout": [{ "item": "rack_basic", "x": 4, "y": 3, "rotation": 0 }],
  "settings": { "masterVolume": 0.8, "sfxVolume": 0.8, "muted": false }
}
```

- A `version` field enables migrations when the format changes.
- Pixel data is compressed (palette indices with run-length encoding) to stay within LocalStorage limits.
- Saves are written on key events (sale, design saved, layout changed) and on a periodic autosave.

---

## Development Roadmap

### Phase 1 — Core Game

- [ ] Set up the game environment.
- [ ] Implement pixel art rendering.
- [ ] Create the basic shop environment.
- [ ] Add shop naming functionality.
- [ ] Add shop location selection.

### Phase 2 — Shop Customization

- [ ] Implement shop decoration.
- [ ] Add furniture placement.
- [ ] Support custom decoration assets.
- [ ] Create shop layout editing.

### Phase 3 — Clothing Design

- [ ] Build the pixel drawing editor.
- [ ] Add drawing tools and color palettes.
- [ ] Create clothing templates.
- [ ] Support multiple clothing categories.
- [ ] Save custom clothing designs.

### Phase 4 — Customer Simulation

- [ ] Create AI customer characters.
- [ ] Implement customer movement.
- [ ] Add product browsing behavior.
- [ ] Implement purchasing logic.
- [ ] Add money and sales tracking.

### Phase 5 — Audio & Polish

- [ ] Create an audio manager.
- [ ] Add UI interaction sounds.
- [ ] Add shop and customer sound effects.
- [ ] Add master and SFX volume controls.
- [ ] Add a mute option.

### Phase 6 — Business Progression

- [ ] Add shop upgrades.
- [ ] Add new locations.
- [ ] Expand clothing collections.
- [ ] Add customer reviews.
- [ ] Implement save and load functionality.

### Milestones

| Milestone | Goal |
|---|---|
| **MVP** | Name a shop, draw a T-shirt, place a rack, and sell it to a customer. |
| **Alpha** | All clothing categories, decoration mode, saving, and basic audio. |
| **Beta** | Progression, multiple locations, balanced economy, polish. |
| **1.0** | Stable, tested, accessible, and fully documented. |

---

## Future Features

- Custom clothing brand logos.
- Seasonal clothing collections.
- Customer preferences and fashion trends.
- Employee hiring.
- Multiple shop branches.
- Fashion competitions.
- Shareable clothing designs.
- Online clothing marketplace.
- Optional relaxing background music.
- Gamepad and touch support.
- Accessories and shoes as new product types.
- Colorblind-friendly palette options.

---

## Contributing

Contributions and ideas are welcome once the base project exists.

1. Fork the repository and create a feature branch.
2. Keep to the project style: vanilla JS, ES modules, no unnecessary dependencies.
3. Use Lucide icons (no emojis) and DM Sans in the UI.
4. Only add assets you created or that have a compatible license, and document the source.
5. Describe what changed and why in your pull request, with screenshots for visual changes.

---

## Developer

Made by **Swann Htet** - [swannhtet.com](https://swannhtet.com) - [GitHub: Swann-Htet/CozyCloset](https://github.com/Swann-Htet/CozyCloset)

---

## Credits & Licensing

- **Font:** [DM Sans](https://fonts.google.com/specimen/DM+Sans)
- **Icons:** [Lucide](https://lucide.dev)
- **Art and audio:** original or appropriately licensed; list sources in `assets/CREDITS.md` when added.
- **Project license:** to be decided (for example MIT for code, CC BY for art).

---

## Project Goal

Cozy Closet aims to combine creativity and business simulation in a relaxing pixel art experience.

Players should have the freedom to express their creativity through clothing design, shop decoration, and brand building.

Build your shop. Design your fashion. Create your brand.

---

**Cozy Closet** — Your shop, your style, your brand.
