# Claude Flow

A visual node-based canvas for visualizing Claude Code conversations and AI reasoning.

## Overview

Claude Flow transforms Claude Code's terminal interactions into an interactive node-based flow graph, making the AI's reasoning process visible and explorable.

## Features

- **Two-Panel Interface**: Terminal + Visual Canvas
- **Node Types**:
  - Input nodes (user messages)
  - Output nodes (Claude responses)
  - Skill nodes (metacognitive-flow visualization)
  - Auto-detected nodes (Analysis, Summary, etc.)
- **Interactive Canvas**:
  - Zoom in/out (mouse wheel or buttons)
  - Pan/drag canvas
  - Node click for details
- **Real-time Updates**: Automatic polling for new conversation data

## Installation

### Prerequisites

- Termux (Android) or any Linux environment
- Node.js 14+ (for WebSocket server)
- Python 3 (optional, for fallback mode)
- Claude Code CLI (optional for full integration)

### Quick Start

1. **Navigate to project directory**:
   ```bash
   cd ~/claude-flow
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the WebSocket server**:
   ```bash
   ./start.sh
   # Or manually: node server.js
   ```

4. **Open in browser**:
   ```bash
   termux-open-url http://localhost:3000
   # Or visit: http://localhost:3000
   ```

### Fallback Mode (Python Server)

If Node.js is not available, you can use the legacy file-polling mode:

1. **Start Python server**:
   ```bash
   python3 -m http.server 8080
   ```

2. **Open in browser**:
   ```bash
   termux-open-url http://localhost:8080
   ```

Note: Fallback mode uses file polling instead of WebSocket for updates.

## Usage

### Viewing Demo Data

The project comes with sample data in `data/flow.json`. Simply start the server and open the browser to see the demo visualization.

### Testing with Console

1. Open browser developer tools (console)
2. Use the test function:
   ```javascript
   testSave("Your input", "Claude's response")
   ```

### File Structure

```
claude-flow/
├── server.js           # WebSocket server
├── start.sh            # Quick start script
├── bridge.js           # Bridge script for sending nodes
├── package.json        # Node.js dependencies
├── index.html          # Main application UI
├── style.css           # Legacy styles
├── style-v2.css        # Enhanced styles with Tailwind
├── app.js              # Main logic (WebSocket + fallback)
├── canvas.js           # SVG rendering & zoom/pan
├── parser.js           # Output parsing
├── data/
│   └── flow.json      # Conversation data (persisted)
└── lib/
    └── (optional libraries)
```

## How It Works

### Data Flow (WebSocket Mode)

```
Claude Code Output
    ↓
Bridge Script / API
    ↓
WebSocket Server
    ↓
Real-time Broadcast
    ↓
All Connected Clients
    ↓
Parser (extract nodes)
    ↓
Canvas Renderer (SVG)
    ↓
Visual Nodes
```

### Data Flow (Fallback Mode)

```
Claude Code Output
    ↓
flow.json (updated)
    ↓
File Polling (200ms)
    ↓
Parser (extract nodes)
    ↓
Canvas Renderer (SVG)
    ↓
Visual Nodes
```

### Node Detection

**Metacognitive Flow Skill**:
- Detects patterns like `**Thought**: ...`
- Creates 5 separate nodes: Thought, Emotion, Imagination, Belief, Action

**Auto-Detection**:
- Markdown headers: `## Analysis`
- Common patterns: `**Summary**: ...`
- Creates separate nodes automatically

### Controls

- **Zoom In/Out**: Use mouse wheel or +/- buttons
- **Pan**: Click and drag on canvas
- **Reset**: Click "Reset" button
- **Clear**: Click "Clear" to remove all nodes
- **Node Click**: Click any node to see full content

## Configuration

### Adjust Polling Interval

Edit `app.js`:
```javascript
this.pollInterval = 200; // Change to desired ms
```

### Customize Node Layout

Edit `canvas.js`:
```javascript
this.config = {
    verticalSpacing: 150,    // Vertical space between nodes
    horizontalSpacing: 220,  // Horizontal space for skill nodes
    nodeWidth: 180,          // Node width
    nodeHeight: 100,         // Node height
};
```

### Add Custom Patterns

Edit `parser.js`:
```javascript
this.patterns = {
    // Add your custom patterns here
    customPattern: /\*\*YourPattern\*\*:?\s*([^\n]+)/gi,
};
```

## WebSocket Integration

### Architecture

Claude Flow now uses WebSocket for real-time communication:

- **Server**: Node.js + Express + WebSocket (`ws` library)
- **Client**: Browser with automatic reconnection
- **Protocol**: JSON-based message protocol
- **Fallback**: Automatic fallback to file polling if WebSocket unavailable

### WebSocket Server Features

- Real-time node broadcasting to all connected clients
- Automatic connection management and reconnection
- HTTP API endpoints for programmatic access
- File-based persistence (maintains `flow.json` for backup)
- Health check and status endpoints

### API Endpoints

#### POST /api/nodes
Add nodes to the flow and broadcast to all clients.

```bash
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "node-1", "type": "input", "content": "Hello"}
    ],
    "edges": []
  }'
```

#### POST /api/clear
Clear all flow data.

```bash
curl -X POST http://localhost:3000/api/clear
```

#### GET /api/state
Get current flow state and server stats.

```bash
curl http://localhost:3000/api/state
```

#### GET /api/health
Server health check.

```bash
curl http://localhost:3000/api/health
```

### Using the Bridge Script

Send nodes from command line or scripts:

```bash
# Basic usage
node bridge.js "User input" "Claude's response"

# With environment variables
CLAUDE_FLOW_HOST=localhost CLAUDE_FLOW_PORT=3000 \
  node bridge.js "Question" "Answer"
```

### Integration with Claude Code

#### Option 1: Bridge Script (Recommended)

Use the bridge script to send nodes after Claude Code interactions:

```bash
# In your workflow
node bridge.js "$USER_INPUT" "$CLAUDE_OUTPUT"
```

#### Option 2: HTTP API

Send nodes programmatically using the HTTP API:

```python
import requests

def send_to_claude_flow(nodes, edges=[]):
    response = requests.post(
        'http://localhost:3000/api/nodes',
        json={'nodes': nodes, 'edges': edges}
    )
    return response.json()
```

#### Option 3: Manual Update (Fallback)

In fallback mode, manually update `data/flow.json` - the file polling will detect changes within 200ms.

## Development

### Adding New Node Types

1. **Define detection pattern** in `parser.js`
2. **Add node color** in `index.html` (SVG gradients)
3. **Update parser logic** to extract new type
4. **Test** with sample data

### Testing Parser

```javascript
const parser = new Parser();
const result = parser.parseInteraction(
    "User input",
    "**Thought**: This is a test"
);
console.log(result);
```

### Testing Canvas

```javascript
const testData = {
    nodes: [
        {id: "1", type: "input", content: "Test", parent_id: null},
        {id: "2", type: "output", content: "Response", parent_id: "1"}
    ],
    edges: [{from: "1", to: "2"}]
};
window.app.canvas.render(testData);
```

## Troubleshooting

### Nodes not appearing

1. Check `data/flow.json` exists and is valid JSON
2. Open browser console for errors
3. Verify Python server is running
4. Check file permissions

### Canvas not responding

1. Try clicking "Reset" button
2. Refresh browser
3. Check console for JavaScript errors

### Polling not working

1. Verify `flow.json` path is correct
2. Check browser console for fetch errors
3. Ensure server allows CORS (Python http.server does by default)

## Performance

- **Tested with**: Up to 100 nodes
- **Smooth rendering**: 60fps on modern devices
- **Adaptive polling**: Slows down when idle (200ms → 2000ms)

## Roadmap

### Phase 1: MVP
- ✅ Basic node visualization
- ✅ Zoom/pan controls
- ✅ Metacognitive-flow support
- ✅ Auto-detection

### Phase 2: Enhanced
- ✅ WebSocket server integration
- ✅ Real-time updates
- ✅ Connection status indicator
- ✅ Automatic reconnection
- ✅ HTTP API endpoints
- [ ] Improved parser (more patterns)
- [ ] Better layout algorithms
- [ ] Node interactions (hover, tooltips)

### Phase 3: Advanced
- [ ] Multiple conversation support
- [ ] Conversation branching
- [ ] Export (PNG, JSON, Markdown)
- [ ] All skills support
- [ ] Gamification (points, achievements)

## Contributing

This is an MVP prototype. Contributions welcome!

1. Fork the repository
2. Create feature branch
3. Test thoroughly
4. Submit pull request

## License

MIT License - See LICENSE file for details

## Credits

Built for Claude Code users in Termux environments.

---

**Quick Start (WebSocket Mode)**:
```bash
cd ~/claude-flow
npm install
./start.sh
# Then open http://localhost:3000 in browser
```

**Quick Start (Fallback Mode)**:
```bash
cd ~/claude-flow
python3 -m http.server 8080
# Then open http://localhost:8080 in browser
```

**Test the Bridge**:
```bash
# Start server first, then in another terminal:
node bridge.js "Hello Claude" "Hello! How can I help you?"
```

**Questions?** Check the WebSocket Integration section above.
