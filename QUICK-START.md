# Claude Flow - Quick Start Guide

## 30-Second Setup

```bash
cd ~/claude-flow
npm install
./start.sh
```

Then open: http://localhost:3000

## Send Your First Node

```bash
# In another terminal
node bridge.js "Hello Claude Flow!" "WebSocket working perfectly!"
```

Watch the nodes appear instantly in your browser!

## Common Commands

### Start Server
```bash
./start.sh
# Or: node server.js
# Or: npm start
```

### Send Nodes
```bash
node bridge.js "Your input" "Claude's response"
```

### Check Server Health
```bash
curl http://localhost:3000/api/health
```

### Clear Canvas
```bash
curl -X POST http://localhost:3000/api/clear
```

### Get Current State
```bash
curl http://localhost:3000/api/state
```

## Keyboard Shortcuts (in browser)

- **Mouse Wheel**: Zoom in/out
- **Click + Drag**: Pan canvas
- **Click Node**: View details

## Troubleshooting

### Port Already in Use?
```bash
PORT=3001 node server.js
```

### WebSocket Not Connecting?
The app will automatically fall back to file polling mode.

### Need to Reinstall?
```bash
rm -rf node_modules
npm install
```

## File Structure

```
claude-flow/
├── server.js       # WebSocket server
├── bridge.js       # Send nodes from CLI
├── start.sh        # Easy start script
├── app.js          # Client app
├── canvas.js       # Visualization
└── data/
    └── flow.json   # Persisted data
```

## Connection Status

- 🟢 **Green**: Connected via WebSocket
- 🟡 **Yellow**: Connecting...
- 🔴 **Red**: Disconnected (fallback mode)

## API Quick Reference

### Add Nodes
```bash
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{"nodes":[...], "edges":[...]}'
```

### Clear Data
```bash
curl -X POST http://localhost:3000/api/clear
```

### Get State
```bash
curl http://localhost:3000/api/state
```

### Health Check
```bash
curl http://localhost:3000/api/health
```

## Environment Variables

```bash
# Custom port
PORT=3001 node server.js

# Bridge script
CLAUDE_FLOW_HOST=localhost \
CLAUDE_FLOW_PORT=3000 \
node bridge.js "input" "output"
```

## Need Help?

- 📖 Full documentation: `README.md`
- 🔌 WebSocket guide: `WEBSOCKET.md`
- 🎯 Implementation details: `EPIC-3-WEBSOCKET-IMPLEMENTATION.md`

## What's New in WebSocket Mode?

- ⚡ Real-time updates (<50ms)
- 🔄 Auto-reconnection
- 📡 Multiple clients sync
- 🛡️ Automatic fallback
- 💾 File persistence

Enjoy real-time visualization! 🚀
