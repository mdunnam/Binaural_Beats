# XMD ToolBox × Liminal — Integration Guide

Everything you need to build the ZBrush/XMD side of the bridge.

---

## How It Works

```
ZBrush (ZScript + XMD ToolBox)
        ↓  writes sculpt state every ~100ms
  bridge.exe  (local companion service)
        ↓  serves JSON on localhost:7842
  Liminal  (polls every 200ms when bridge is enabled)
        ↓  maps sculpt data → audio parameters
  Real-time binaural audio response
```

Liminal is already built and waiting. You only need to build the companion that serves sculpt state on `localhost:7842`.

---

## The Endpoint

**URL:** `http://localhost:7842/sculpt-state`  
**Method:** `GET`  
**Content-Type:** `application/json`  
**Required header in response:** `Access-Control-Allow-Origin: *` (CORS — browser won't accept without it)

---

## JSON Payload

Liminal expects this exact shape:

```json
{
  "pressure": 0.72,
  "speed": 0.45,
  "brushSize": 0.60,
  "brushType": "clay",
  "intensity": 0.80,
  "symmetry": true,
  "subdivLevel": 3,
  "strokesPerSecond": 6,
  "idle": false
}
```

### Field Reference

| Field | Type | Range | Description |
|---|---|---|---|
| `pressure` | float | 0.0–1.0 | Brush pressure (tablet pressure or ZIntensity analog) |
| `speed` | float | 0.0–1.0 | Stroke speed, normalized. 0 = stationary, 1 = fast |
| `brushSize` | float | 0.0–1.0 | Draw size normalized (e.g. drawSize / 500) |
| `brushType` | string | see below | Active brush identifier |
| `intensity` | float | 0.0–1.0 | ZIntensity value (0–100 → 0.0–1.0) |
| `symmetry` | boolean | — | Whether symmetry is currently active |
| `subdivLevel` | int | 1–7 | Current subdivision level |
| `strokesPerSecond` | int | 0–20 | Activity level — strokes in the last second |
| `idle` | boolean | — | `true` if no strokes in last 2 seconds |

### brushType Values

Liminal maps these to brainwave frequencies. Use the closest match to the active brush name:

| Value | Example ZBrush Brushes | Beat Hz | State |
|---|---|---|---|
| `clay` | Clay, ClayBuildup, ClayTubes | 14 Hz | Beta — energized |
| `inflate` | Inflate, Layer | 16 Hz | High Beta — assertive |
| `snake_hook` | SnakeHook, Move Topological | 18 Hz | High Beta — dynamic |
| `standard` | Standard, Blob | 12 Hz | Beta — focused |
| `dam_standard` | DamStandard, TrimDynamic | 10 Hz | Alpha — precise |
| `pinch` | Pinch, Crease | 8 Hz | Alpha — calm detail |
| `move` | Move, Nudge | 6 Hz | Theta — fluid |
| `smooth` | Smooth, Polish | 4 Hz | Theta/Delta — relaxed |

---

## Building the Companion

You have two options. Either works.

---

### Option A: ZScript + bridge.exe (Recommended)

ZScript can't run an HTTP server directly, but it can write to a temp file. A small companion exe reads that file and serves it.

**Step 1 — ZScript writes state file**

In your XMD ToolBox ZScript, add a periodic timer or hook into ZBrush's stroke callback to write:

```
// Pseudo-ZScript
[VarSet, pressure, [IGet, Brush:ZIntensity]]
[VarSet, drawSize, [IGet, Draw:Draw Size]]
[VarSet, brushName, [IGetTitle, Brush:Type]]

// Write JSON to temp file
[FileNameSetNext, "C:\Users\<user>\AppData\Local\Temp\liminal-bridge.json"]
[IWrite, "{\"pressure\":", pressure, ",\"brushSize\":", drawSize / 500, ",...}"]
```

**Step 2 — bridge.exe serves it**

A tiny Go or Node.js executable that:
1. Watches `%TEMP%\liminal-bridge.json`
2. Serves its contents on `GET http://localhost:7842/sculpt-state`
3. Adds `Access-Control-Allow-Origin: *` header

Minimal Node.js version (`bridge.js`, ~30 lines):

```js
const http = require('http')
const fs = require('fs')
const path = require('path')

const FILE = path.join(process.env.TEMP, 'liminal-bridge.json')
const PORT = 7842

const DEFAULT = JSON.stringify({
  pressure: 0, speed: 0, brushSize: 0.5, brushType: 'standard',
  intensity: 0.5, symmetry: false, subdivLevel: 1, strokesPerSecond: 0, idle: true
})

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')
  if (req.url === '/sculpt-state') {
    try {
      res.end(fs.readFileSync(FILE, 'utf8'))
    } catch {
      res.end(DEFAULT)
    }
  } else {
    res.writeHead(404)
    res.end()
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Liminal bridge running on localhost:${PORT}`)
})
```

Bundle with `pkg` or `nexe` → single `.exe` users install once.

---

### Option B: Pure ZScript HTTP (Advanced)

ZBrush 2021+ can call external executables via `[ShellExecute]`. You could ship a self-contained Python or Go binary that ZScript launches on startup and kills on exit. Same HTTP server as above but lifecycle managed by ZScript:

```
// On plugin init
[ShellExecute, "C:\Program Files\XMD\liminal-bridge.exe"]

// On plugin shutdown  
// (kill via taskkill or named pipe)
```

---

## What Liminal Does With the Data

For reference — the mapping logic is in `app/src/lib/sculptBridge.ts`:

| Sculpt input | Audio output | Notes |
|---|---|---|
| `brushType` | Beat frequency (Hz) | See table above |
| `speed` | Beat freq +0–4 Hz | Fast strokes nudge frequency up |
| `pressure` | Master + binaural volume | Light touch = quieter |
| `brushSize` | Carrier frequency (opt-in) | Large brush = deeper tone |
| `idle: true` | Binaural fades to 20% | Soundscape stays |

---

## Files Created in Liminal

| File | Purpose |
|---|---|
| `app/src/lib/sculptBridge.ts` | Data layer: types, fetch, mapping logic |
| `app/src/hooks/useSculptBridge.ts` | React hook: polls every 200ms, calls audio setters |
| `app/src/components/SculptBridgePanel.tsx` | Studio tab UI: status, modes, live readout |
| `docs/zbrush-bridge-protocol.md` | Short protocol spec (subset of this doc) |

---

## User Flow

1. User installs XMD ToolBox update (includes bridge.exe)
2. Opens ZBrush — bridge.exe auto-starts in background
3. Opens Liminal in browser (or Electron wrapper)
4. In Liminal → Studio tab → scrolls to **🗿 ZBrush Bridge** → clicks **Enable Bridge**
5. Status dot turns green — connected
6. Sculpts. Music responds in real time.

---

## Modes

### 🌊 Flow State
Music adapts automatically to sculpting energy. No user intervention needed.
- Clay/Inflate → energizing beta beats
- Smooth/Polish → calm theta
- Idle 2s+ → binaural fades, ambient soundscape takes over
- Resume sculpting → fades back in

### 🎹 Instrument Mode
*(UI exists, full note-trigger logic TBD)*  
Each stroke triggers a musical note. Brush position = pitch. Pressure = velocity. Brush type = instrument timbre. This mode will require additional Liminal-side work to generate discrete note events from the continuous stroke stream.

---

## Port & Security

- Port `7842` — chosen to avoid conflicts with common dev tools
- Listens on `127.0.0.1` only (localhost) — not exposed to network
- No auth needed — localhost only
- CORS required for browser fetch to work

---

## Next Steps for XMD Side

- [ ] Identify ZBrush stroke callback hook point in XMD ToolBox ZScript
- [ ] Implement `%TEMP%\liminal-bridge.json` writer (100ms update rate ideal)
- [ ] Build/bundle `bridge.exe` (Node.js + pkg recommended for simplicity)
- [ ] Auto-launch bridge.exe on XMD ToolBox init
- [ ] Map ZBrush brush names → `brushType` enum values
- [ ] Test with Liminal bridge panel open in browser
- [ ] Add "Open Liminal" button to XMD ToolBox UI (opens `https://www.theliminal.app/app`)
