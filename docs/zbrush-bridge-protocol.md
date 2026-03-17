# ZBrush Bridge Protocol

Liminal polls `http://localhost:7842/sculpt-state` every 200ms when bridge mode is active.

## Response format (JSON)
```json
{
  "pressure": 0.0,        // brush pressure (0.0–1.0)
  "speed": 0.0,           // stroke speed, normalized (0.0–1.0)
  "brushSize": 0.0,       // brush radius, normalized (0.0–1.0)
  "brushType": "clay",    // "clay" | "smooth" | "inflate" | "pinch" | "standard" | "dam_standard" | "move" | "snake_hook"
  "intensity": 0.0,       // ZIntensity (0.0–1.0)
  "symmetry": false,      // symmetry active
  "subdivLevel": 1,       // current subdivision level (1–7)
  "strokesPerSecond": 0,  // activity level (0–20)
  "idle": true            // no strokes in last 2s
}
```

## Companion service
A small executable or ZScript + local HTTP server writes this state.
The XMD ToolBox ZScript can write to a local temp file which a companion bridge.exe reads and serves.

## CORS
The local service must respond with: `Access-Control-Allow-Origin: *`
