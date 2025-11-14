# CLAUDE.md - AI Assistant Guide for Claude Flow V2

> **Purpose**: This document provides AI assistants with comprehensive guidance on the Claude Flow V2 codebase structure, development patterns, and conventions.

**Last Updated**: 2025-11-14
**Project Status**: Production Ready | Quality Score: A+ (95/100)
**Project Size**: ~18,000+ lines across 93 files

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Reference](#quick-reference)
3. [Architecture Overview](#architecture-overview)
4. [Key Files Map](#key-files-map)
5. [Development Patterns](#development-patterns)
6. [Common Modification Tasks](#common-modification-tasks)
7. [Critical Integration Points](#critical-integration-points)
8. [Testing & Debugging](#testing--debugging)
9. [Documentation Index](#documentation-index)
10. [Conventions & Standards](#conventions--standards)

---

## 1. Project Overview

### What is Claude Flow V2?

**Claude Flow V2** is a production-ready web application that visualizes Claude Code CLI conversations as interactive, real-time node-based flow graphs. It transforms terminal interactions into visual diagrams showing the AI's reasoning process.

### Key Technologies

**Backend**:
- Node.js 14+ with Express.js ^4.18.2
- WebSocket server (ws ^8.14.2)
- File-based persistence (JSON)
- Claude Code CLI integration

**Frontend**:
- Vanilla JavaScript (ES6+)
- D3.js v7 (force-directed layouts, zoom/pan)
- Tailwind CSS (utility-first styling)
- SVG/Canvas rendering
- IndexedDB + localStorage persistence

**Architecture Pattern**: Event-driven, component-based, real-time bidirectional communication

### Development Methodology

Built using **BMAD v6** (Behavior-Driven Agile Development) methodology across **7 complete epics**:
1. UI/UX Redesign (modern dark theme, glass-morphism)
2. Advanced Canvas Features (D3.js, minimap, search)
3. WebSocket Integration (real-time updates, HTTP API)
4. Enhanced Parser (multi-skill support)
5. Node Interactions (tooltips, modals, context menus)
6. Performance & Optimization (virtual rendering, object pooling)
7. Export & Persistence (PNG/SVG/JSON/MD export, multi-conversation)

---

## 2. Quick Reference

### Installation & Startup

```bash
# Install dependencies
npm install

# Start server (recommended)
./start.sh
# Or manually: node server.js

# Open browser
http://localhost:3000
```

### Quick Commands

```bash
# Development with auto-reload
npm run dev

# Run tests
npm test

# Test WebSocket integration
node bridge.js "input text" "output text"

# Validate production build
./validate-production.sh

# Test terminal integration
./test-terminal.sh
```

### Keyboard Shortcuts

- **P**: Toggle performance monitor
- **T**: Toggle test UI with data generator
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z**: Redo
- **Ctrl+F**: Search nodes
- **Ctrl+E**: Export menu
- **Ctrl+S**: Save conversation

### Browser Console Quick Access

```javascript
// Main application instance
window.app

// Canvas renderer
window.canvas

// Parser instance
window.parser

// Minimap manager
window.minimapManager

// Search manager
window.searchManager

// Performance monitor
window.perfMonitor

// Example: Test node creation
testSave("user input", "ai response")
```

---

## 3. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
├─────────────────────────────────────────────────────────────┤
│  Terminal Input → Parser → Canvas Renderer → Visual Nodes   │
│       ↓              ↓           ↓                           │
│  IndexedDB      localStorage   SVG/D3.js                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket (ws://)
                       │ HTTP API (/api/*)
┌──────────────────────┴──────────────────────────────────────┐
│                    Node.js Server (server.js)                │
├─────────────────────────────────────────────────────────────┤
│  Express HTTP Server + WebSocket Server                      │
│  Client Manager + Data Persistence (flow.json)               │
│  Command Execution (shell + Claude Code CLI)                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (Terminal)
    ↓
Parser.parseInteraction()
    ↓
Create Nodes/Edges
    ↓
WebSocket → Server
    ↓
Broadcast to All Clients
    ↓
Save to flow.json
    ↓
Client Receives Update
    ↓
Canvas.render()
    ↓
Visual Nodes + Edges
```

### Component Architecture

**Frontend Components** (all classes exposed on `window` object):

```javascript
// Main application controller
window.app = new AppV2()

// Canvas renderer with D3.js force layout
window.canvas = new CanvasV2()

// Multi-skill parser (Excel, PDF, PPTX, DOCX, etc.)
window.parser = new ParserV2()

// Performance optimization engine
window.performance = new Performance()

// Node interaction manager
window.interactions = new InteractionManager()

// Minimap for navigation
window.minimapManager = new MinimapManager()

// Node search functionality
window.searchManager = new SearchManager()

// Tooltip system
window.tooltip = new TooltipManager()

// Modal dialogs
window.modal = new ModalManager()

// Context menu
window.contextMenu = new ContextMenuManager()

// Export system
window.exportManager = new ExportManager()

// Undo/redo history
window.history = new HistoryManager()

// Auto-save persistence
window.persistence = new PersistenceManager()

// Multi-conversation manager
window.conversations = new ConversationManager()
```

### File Organization

**Flat Structure** (all files at root level):

```
claude-flow-v2/
├── data/                          # Persisted conversation data
│   └── flow.json                  # Current conversation state
├── [Core Files]
│   ├── index-production.html      # Production entry point
│   ├── server.js                  # WebSocket + HTTP server
│   ├── app-v2.js                  # Main application logic
│   ├── canvas-v2.js               # D3.js canvas renderer
│   ├── parser-v2.js               # Enhanced multi-skill parser
│   ├── terminal-input.js          # Interactive terminal
│   └── bridge.js                  # CLI integration tool
├── [Canvas & Visualization]
│   ├── canvas.js                  # Legacy SVG canvas
│   ├── virtual-canvas.js          # Virtual rendering (1000+ nodes)
│   ├── minimap.js                 # Canvas minimap
│   ├── search.js                  # Node search
│   └── webworker-layout.js        # Web Worker for layouts
├── [Interactions]
│   ├── interactions.js            # Node interaction engine
│   ├── tooltip.js                 # Tooltip system
│   ├── modal.js                   # Modal dialogs
│   └── context-menu.js            # Right-click menu
├── [Performance]
│   ├── performance.js             # Optimization engine
│   ├── perf-monitor.js            # Performance dashboard
│   └── test-data-generator.js    # Test data (up to 1000 nodes)
├── [Persistence & Export]
│   ├── persistence.js             # IndexedDB auto-save
│   ├── export.js                  # PNG/SVG/JSON/MD export
│   ├── import.js                  # Import conversations
│   ├── conversations.js           # Multi-conversation
│   ├── history.js                 # Undo/redo
│   └── share.js                   # QR code sharing
├── [UI Components]
│   ├── ui-utils.js                # Toast, badges, overlays
│   ├── keyboard.js                # Keyboard shortcuts
│   └── style-v2.css               # Modern dark theme (45KB)
├── [Documentation - 32 files]
│   ├── README.md                  # Complete guide
│   ├── QUICK-START.md             # 30-second setup
│   ├── DEPLOYMENT-GUIDE.md        # Production deployment
│   ├── USAGE-GUIDE.md             # Feature documentation
│   ├── PERFORMANCE.md             # Performance optimization
│   ├── EXPORT-GUIDE.md            # Export/import guide
│   ├── WEBSOCKET.md               # WebSocket integration
│   ├── EPIC-*.md                  # Implementation details
│   └── ...                        # 25+ more docs
└── [Test Files - 11 files]
    ├── test-ws.html               # WebSocket testing
    ├── test-parser.js             # Parser unit tests
    ├── debug-terminal.html        # Terminal debugging
    └── ...                        # 8+ more test files
```

---

## 4. Key Files Map

### Essential Files (Must Know)

| File | Lines | Purpose | Critical Sections |
|------|-------|---------|-------------------|
| **server.js** | 555 | WebSocket + HTTP server, Claude Code CLI integration | Lines 402-502: Command execution |
| **index-production.html** | 900+ | Production entry point with Tailwind + D3.js | Script load order |
| **app-v2.js** | 250+ | Main application controller, WebSocket client | handleMessage() |
| **canvas-v2.js** | 900+ | D3.js force-directed layout, zoom/pan, rendering | render(), updateSimulation() |
| **parser-v2.js** | 1400+ | Multi-skill pattern parser (Excel, PDF, PPTX, etc.) | parseInteraction(), patterns |
| **terminal-input.js** | 700+ | Interactive terminal, Claude Code integration | Lines 201-235: createNodes() |

### Parser System

| File | Purpose | Key Methods |
|------|---------|-------------|
| **parser-v2.js** | Enhanced parser with multi-skill support | parseInteraction(), detectSkillPattern() |
| **parser.js** | Legacy parser (basic patterns) | parseInteraction() |
| **parser-config.json** | Parser configuration | enabled_patterns, pattern_priority |
| **test-parser.js** | Parser unit tests | Test cases for all patterns |

**Supported Skills**:
- Metacognitive-flow patterns
- XLSX/Excel skill patterns
- PDF skill patterns
- PPTX/PowerPoint patterns
- DOCX/Word patterns
- Code block detection
- Table extraction
- URL and file references

### Canvas & Visualization

| File | Purpose | Key Features |
|------|---------|--------------|
| **canvas-v2.js** | D3.js force-directed layout | Force simulation, zoom/pan, hierarchical |
| **canvas.js** | Legacy SVG canvas | Manual layout, basic rendering |
| **virtual-canvas.js** | Virtual rendering | LOD optimization, 1000+ nodes |
| **webworker-layout.js** | Web Worker layouts | Offload calculations |
| **minimap.js** | Canvas minimap | Navigation, viewport indicator |
| **search.js** | Node search/filter | Fuzzy search, type filters |

### Interaction System

| File | Purpose | Key Features |
|------|---------|--------------|
| **interactions.js** | Node interaction engine | Hover, click, selection, drag |
| **tooltip.js** | Tooltip system | Content tooltips, node info |
| **modal.js** | Modal dialogs | Node details, settings, export |
| **context-menu.js** | Right-click menu | Copy, delete, export actions |
| **keyboard.js** | Keyboard shortcuts | 15+ shortcuts, customizable |

### Performance & Optimization

| File | Purpose | Key Features |
|------|---------|--------------|
| **performance.js** | Optimization engine | Virtual rendering, object pooling, batching |
| **perf-monitor.js** | Performance dashboard | Real-time FPS, memory, node count |
| **test-data-generator.js** | Test data generator | Up to 1000 nodes, stress testing |

**Performance Targets**:
- 100 nodes: 60fps ✅
- 500 nodes: 45fps ✅
- 1000 nodes: 30fps ✅

### Persistence & Export

| File | Purpose | Formats |
|------|---------|---------|
| **persistence.js** | Auto-save to IndexedDB | Automatic, versioned |
| **export.js** | Export conversations | PNG, SVG, JSON, Markdown |
| **import.js** | Import conversations | JSON format |
| **conversations.js** | Multi-conversation management | Create, switch, delete |
| **history.js** | Undo/redo system | 50 levels deep |
| **share.js** | Sharing features | QR codes, links |

---

## 5. Development Patterns

### Component Pattern

**All components are classes with:**
- Constructor initialization
- Public API methods
- Event listeners
- Cleanup methods
- Window object exposure

**Example**:
```javascript
class ComponentName {
  constructor() {
    this.state = {};
    this.init();
  }

  init() {
    // Initialize component
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Bind events
  }

  publicMethod() {
    // Public API
  }

  cleanup() {
    // Cleanup on destroy
  }
}

// Expose globally
window.componentName = new ComponentName();
```

### Event-Driven Communication

**WebSocket Messages**:
```javascript
// Client → Server
{
  type: 'NODE_UPDATE' | 'EDGE_UPDATE' | 'CLEAR' | 'REQUEST_STATE',
  data: {...}
}

// Server → Client
{
  type: 'STATE' | 'NODE_UPDATE' | 'EDGE_UPDATE' | 'CLEAR' | 'ERROR',
  data: {...}
}
```

**DOM Events**:
```javascript
// Listen for custom events
document.addEventListener('nodeSelected', (e) => {
  console.log('Node selected:', e.detail);
});

// Dispatch custom events
document.dispatchEvent(new CustomEvent('nodeSelected', {
  detail: { nodeId: 'node-123' }
}));
```

### Error Handling Pattern

**Standard Pattern**:
```javascript
try {
  await someAsyncOperation();
} catch (error) {
  console.error('Operation failed:', error);
  showToast(`Error: ${error.message}`, 'error');
  // Fallback behavior
  useFallback();
}
```

**WebSocket Fallback**:
```javascript
// Try WebSocket first
if (this.ws && this.ws.readyState === WebSocket.OPEN) {
  this.ws.send(JSON.stringify(data));
} else {
  // Fallback to direct render
  console.warn('WebSocket unavailable, using fallback');
  this.canvas.render(data);
}
```

### Performance Patterns

**Throttling**:
```javascript
// Throttle zoom/pan to 60fps (16ms)
let lastRender = 0;
function onZoom() {
  const now = Date.now();
  if (now - lastRender >= 16) {
    render();
    lastRender = now;
  }
}
```

**Debouncing**:
```javascript
// Debounce search input
let searchTimeout;
function onSearchInput(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 300);
}
```

**Virtual Rendering**:
```javascript
// Only render visible nodes
const visibleNodes = nodes.filter(node => {
  return isInViewport(node, viewport);
});
renderNodes(visibleNodes);
```

**Object Pooling**:
```javascript
// Reuse DOM elements
class NodePool {
  constructor() {
    this.pool = [];
  }

  acquire() {
    return this.pool.pop() || this.create();
  }

  release(node) {
    this.pool.push(node);
  }
}
```

### Naming Conventions

**Files**: `lowercase-with-hyphens.js`
- Example: `canvas-v2.js`, `ui-utils.js`
- Version suffix: `-v2` for enhanced versions
- Test prefix: `test-*.html`, `test-*.js`

**Classes**: `PascalCase`
- Example: `CanvasV2`, `ParserV2`, `SearchManager`

**Functions**: `camelCase`
- Example: `parseInteraction()`, `handleMessage()`, `createNodes()`

**Constants**: `UPPER_SNAKE_CASE`
- Example: `MESSAGE_TYPE`, `PORT`, `DEFAULT_CONFIG`

**Private methods**: Prefix with `_`
- Example: `_updateLayout()`, `_calculateBounds()`

---

## 6. Common Modification Tasks

### Task 1: Add a New Node Type

**Files to modify**:
1. **parser-v2.js** (define pattern)
2. **index-production.html** (add SVG gradient)
3. **canvas-v2.js** (rendering logic)

**Steps**:

```javascript
// 1. Add pattern in parser-v2.js
detectCustomPattern(text) {
  if (text.includes('MY_PATTERN')) {
    return {
      type: 'custom',
      label: 'Custom Type',
      content: text,
      metadata: { ... }
    };
  }
  return null;
}

// 2. Add to pattern matching in parseInteraction()
const patterns = [
  this.detectCustomPattern.bind(this),
  // ... other patterns
];

// 3. Add SVG gradient in index-production.html
<linearGradient id="gradient-custom" ...>
  <stop offset="0%" stop-color="#FF6B6B"/>
  <stop offset="100%" stop-color="#4ECDC4"/>
</linearGradient>

// 4. Update canvas-v2.js node rendering
const fillColor = node.type === 'custom'
  ? 'url(#gradient-custom)'
  : this.getNodeFill(node);
```

### Task 2: Adjust Performance Settings

**File**: `performance.js`

```javascript
// Modify config in constructor
this.config = {
  enableVirtual: true,        // Toggle virtual rendering
  enablePooling: true,        // Toggle object pooling
  virtualThreshold: 500,      // Enable virtual at 500+ nodes
  batchSize: 50,              // Process 50 nodes per frame
  virtualPadding: 200,        // Render padding (px)
  lodThreshold: 1000,         // LOD optimization threshold
  maxFPS: 60,                 // Target FPS
  updateInterval: 16          // Update interval (ms)
};
```

### Task 3: Customize UI Theme

**Files to modify**:
1. **index-production.html** (Tailwind config)
2. **style-v2.css** (custom styles)

```html
<!-- Modify Tailwind config in index-production.html -->
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          'custom-primary': '#FF6B6B',
          'custom-secondary': '#4ECDC4'
        }
      }
    }
  }
</script>
```

```css
/* Add custom styles in style-v2.css */
:root {
  --color-primary: #FF6B6B;
  --color-secondary: #4ECDC4;
  --glass-bg: rgba(255, 255, 255, 0.05);
}
```

### Task 4: Add Export Format

**File**: `export.js`

```javascript
class ExportManager {
  // Add new export method
  async exportToCustomFormat() {
    const data = this.prepareData();
    const customFormat = this.convertToCustomFormat(data);
    this.downloadFile(customFormat, 'conversation.custom');
  }

  convertToCustomFormat(data) {
    // Custom format conversion logic
    return customFormatData;
  }

  // Add to export menu
  setupExportMenu() {
    const menu = {
      png: this.exportToPNG.bind(this),
      svg: this.exportToSVG.bind(this),
      json: this.exportToJSON.bind(this),
      markdown: this.exportToMarkdown.bind(this),
      custom: this.exportToCustomFormat.bind(this)  // Add here
    };
  }
}
```

### Task 5: Add Layout Algorithm

**File**: `canvas-v2.js`

```javascript
class CanvasV2 {
  constructor() {
    this.layoutModes = {
      force: this.forceLayout.bind(this),
      hierarchical: this.hierarchicalLayout.bind(this),
      custom: this.customLayout.bind(this)  // Add new layout
    };
  }

  customLayout(nodes, edges) {
    // Custom layout algorithm
    nodes.forEach((node, i) => {
      node.x = ...; // Calculate position
      node.y = ...;
    });
  }

  setLayoutMode(mode) {
    if (this.layoutModes[mode]) {
      this.currentLayout = this.layoutModes[mode];
      this.updateLayout();
    }
  }
}
```

### Task 6: Extend Parser Patterns

**File**: `parser-v2.js`

```javascript
// Add new skill pattern
detectNewSkill(text) {
  const pattern = /\[NEW_SKILL_PATTERN\](.*?)\[\/NEW_SKILL_PATTERN\]/gs;
  const match = pattern.exec(text);

  if (match) {
    return {
      type: 'skill',
      subtype: 'new-skill',
      label: 'New Skill',
      content: match[1].trim(),
      metadata: {
        skill: 'new-skill',
        timestamp: Date.now()
      }
    };
  }

  return null;
}

// Add to parseInteraction()
const patterns = [
  this.detectMetacognitivePattern.bind(this),
  this.detectXLSXPattern.bind(this),
  this.detectNewSkill.bind(this),  // Add here
  // ... other patterns
];
```

### Task 7: Add WebSocket Message Type

**Files**: `server.js`, `app-v2.js`

```javascript
// server.js - Handle new message type
function handleMessage(ws, message) {
  switch (message.type) {
    case 'NEW_MESSAGE_TYPE':
      handleNewMessageType(ws, message.data);
      break;
    // ... other cases
  }
}

function handleNewMessageType(ws, data) {
  // Process message
  const result = processData(data);

  // Broadcast to all clients
  broadcast({
    type: 'NEW_MESSAGE_TYPE_RESPONSE',
    data: result
  });
}

// app-v2.js - Handle response
handleMessage(event) {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'NEW_MESSAGE_TYPE_RESPONSE':
      this.handleNewResponse(message.data);
      break;
    // ... other cases
  }
}
```

---

## 7. Critical Integration Points

### 7.1 Server Command Execution

**File**: `server.js`, **Lines**: 402-502

**Purpose**: Execute shell commands or Claude Code CLI commands

**Critical Logic**:
```javascript
// Intelligent command routing
function isShellCommand(input) {
  const shellCommands = [
    'ls', 'cd', 'pwd', 'cat', 'grep', 'find',
    'git', 'npm', 'node', 'python', 'pip',
    // ... 40+ commands
  ];

  const firstWord = input.trim().split(/\s+/)[0];
  return shellCommands.includes(firstWord) ||
         input.includes('|') ||
         input.includes('&&');
}

// Execute with timeout
async function executeCommand(input, type) {
  const timeout = type === 'shell' ? 30000 : 60000;

  try {
    const result = await execWithTimeout(input, timeout);
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**When to modify**:
- Add new shell commands to detection list
- Adjust timeouts
- Add command preprocessing
- Modify error handling

### 7.2 Terminal Node Creation

**File**: `terminal-input.js`, **Lines**: 201-235

**Purpose**: Create nodes from terminal input and send to server

**Critical Logic**:
```javascript
async createNodes(input, output) {
  // Parse input/output into nodes
  const parsedInput = this.parser.parseInteraction(input, 'input');
  const parsedOutput = this.parser.parseInteraction(output, 'output');

  // Create node data
  const nodes = [
    { id: 'input-' + Date.now(), ...parsedInput },
    { id: 'output-' + Date.now(), ...parsedOutput }
  ];

  // Create edge
  const edges = [{
    id: 'edge-' + Date.now(),
    from: nodes[0].id,
    to: nodes[1].id
  }];

  // Send via WebSocket
  try {
    await this.sendToServer({ nodes, edges });
  } catch (error) {
    // Fallback to direct render
    this.canvas.render({ nodes, edges });
  }
}
```

**When to modify**:
- Change node ID generation
- Modify node/edge structure
- Add preprocessing
- Adjust fallback behavior

### 7.3 Parser Pattern Matching

**File**: `parser-v2.js`, **Lines**: throughout

**Purpose**: Parse text into structured node data

**Critical Logic**:
```javascript
parseInteraction(text, type) {
  // Pattern matching priority order
  const patterns = [
    this.detectMetacognitivePattern.bind(this),
    this.detectXLSXPattern.bind(this),
    this.detectPDFPattern.bind(this),
    this.detectPPTXPattern.bind(this),
    this.detectDOCXPattern.bind(this),
    this.detectCodeBlock.bind(this),
    this.detectTable.bind(this),
    this.detectSection.bind(this),
    this.detectAnalysis.bind(this)
  ];

  // Try each pattern
  for (const detectPattern of patterns) {
    const result = detectPattern(text);
    if (result) {
      return this.enrichResult(result, type);
    }
  }

  // Fallback to basic node
  return this.createBasicNode(text, type);
}
```

**When to modify**:
- Add new patterns (insert in priority order)
- Modify pattern detection logic
- Adjust metadata extraction
- Change enrichment logic

### 7.4 Canvas Rendering

**File**: `canvas-v2.js`, **Method**: `render()`

**Purpose**: Render nodes and edges with D3.js force layout

**Critical Logic**:
```javascript
render(data) {
  // Prepare data
  const { nodes, edges } = this.prepareData(data);

  // Apply performance optimizations
  if (this.performance.shouldUseVirtual(nodes)) {
    nodes = this.filterVisibleNodes(nodes);
  }

  // Update D3 simulation
  this.simulation
    .nodes(nodes)
    .force('link').links(edges);

  // Render nodes
  this.renderNodes(nodes);
  this.renderEdges(edges);

  // Restart simulation
  this.simulation.alpha(0.3).restart();
}
```

**When to modify**:
- Add new node rendering styles
- Adjust force simulation parameters
- Modify virtual rendering threshold
- Change layout algorithm

### 7.5 WebSocket Message Handling

**File**: `app-v2.js`, **Method**: `handleMessage()`

**Purpose**: Process incoming WebSocket messages

**Critical Logic**:
```javascript
handleMessage(event) {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'STATE':
      // Initial state received
      this.loadState(message.data);
      break;

    case 'NODE_UPDATE':
      // New nodes received
      this.addNodes(message.data.nodes);
      this.canvas.render(this.state);
      break;

    case 'EDGE_UPDATE':
      // New edges received
      this.addEdges(message.data.edges);
      this.canvas.render(this.state);
      break;

    case 'CLEAR':
      // Clear all data
      this.clearState();
      this.canvas.clear();
      break;

    case 'ERROR':
      // Handle error
      this.handleError(message.data);
      break;
  }
}
```

**When to modify**:
- Add new message types
- Modify state updates
- Change error handling
- Add message validation

---

## 8. Testing & Debugging

### Browser Console Testing

**Quick Access**:
```javascript
// Main components
window.app          // Application instance
window.canvas       // Canvas renderer
window.parser       // Parser instance
window.performance  // Performance manager

// Test node creation
testSave("user input", "ai response")

// Check state
console.log(app.state)
console.log(canvas.nodes)

// Performance stats
perfMonitor.getStats()
```

### Performance Monitoring

**Keyboard Shortcut**: Press **P**

**Displays**:
- Current FPS (target: 60fps)
- Node count
- Visible nodes (if virtual rendering enabled)
- Memory usage
- Render time
- Update time

**Programmatic Access**:
```javascript
// Get performance stats
const stats = window.perfMonitor.getStats();
console.log('FPS:', stats.fps);
console.log('Nodes:', stats.nodeCount);
console.log('Memory:', stats.memory);
```

### Test UI

**Keyboard Shortcut**: Press **T**

**Features**:
- Generate test data (10, 50, 100, 500, 1000 nodes)
- Stress test canvas rendering
- Test virtual rendering
- Test performance optimizations

**Programmatic Access**:
```javascript
// Generate test data
const testData = window.testDataGenerator.generate(100);
window.canvas.render(testData);

// Stress test
window.testDataGenerator.stressTest(1000);
```

### Debug Files

**HTML Debug Pages**:
- **test-ws.html**: WebSocket connection testing
- **test-ws-edges.html**: WebSocket edge rendering
- **test-edges.html**: Edge rendering tests
- **test-edge-flow.html**: Edge flow visualization
- **test-simple.html**: Simple rendering test
- **test-direct.html**: Direct rendering (no WebSocket)
- **test-debug.html**: Debug interface
- **debug-terminal.html**: Terminal debugging

**Usage**:
```bash
# Open debug page
http://localhost:3000/test-debug.html

# Test WebSocket
http://localhost:3000/test-ws.html

# Debug terminal
http://localhost:3000/debug-terminal.html
```

### Parser Testing

**File**: `test-parser.js`

**Run Tests**:
```bash
node test-parser.js
```

**Test Cases**:
- Metacognitive patterns
- XLSX skill patterns
- PDF skill patterns
- PPTX skill patterns
- DOCX skill patterns
- Code blocks
- Tables
- Sections
- Analysis detection

### Network Testing

**WebSocket Testing**:
```javascript
// Check WebSocket status
window.app.ws.readyState
// 0 = CONNECTING
// 1 = OPEN
// 2 = CLOSING
// 3 = CLOSED

// Test message send
window.app.ws.send(JSON.stringify({
  type: 'PING'
}));

// Monitor messages
window.app.ws.addEventListener('message', (event) => {
  console.log('Received:', event.data);
});
```

**HTTP API Testing**:
```bash
# Health check
curl http://localhost:3000/api/health

# Get state
curl http://localhost:3000/api/state

# Add nodes
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{"nodes": [...], "edges": [...]}'

# Clear data
curl -X POST http://localhost:3000/api/clear

# Execute command
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la", "type": "shell"}'
```

### Common Issues & Solutions

**Issue**: WebSocket not connecting
```javascript
// Check server status
curl http://localhost:3000/api/health

// Check WebSocket URL
console.log(window.app.wsUrl);

// Fallback to file polling
window.app.useFallback = true;
```

**Issue**: Nodes not rendering
```javascript
// Check data
console.log(window.app.state);

// Force re-render
window.canvas.render(window.app.state);

// Check virtual rendering
console.log(window.performance.config.enableVirtual);
```

**Issue**: Poor performance
```javascript
// Enable virtual rendering
window.performance.config.enableVirtual = true;

// Enable object pooling
window.performance.config.enablePooling = true;

// Reduce node count threshold
window.performance.config.virtualThreshold = 300;
```

**Issue**: Parser not detecting patterns
```javascript
// Test parser directly
const result = window.parser.parseInteraction(text, 'output');
console.log(result);

// Check enabled patterns
console.log(window.parser.config.enabled_patterns);

// Enable specific pattern
window.parser.config.enabled_patterns.xlsx = true;
```

---

## 9. Documentation Index

### Core Documentation (Read These First)

| Document | Purpose | Priority |
|----------|---------|----------|
| **README.md** | Complete project guide | ⭐⭐⭐ HIGH |
| **QUICK-START.md** | 30-second setup guide | ⭐⭐⭐ HIGH |
| **DEPLOYMENT-GUIDE.md** | Production deployment | ⭐⭐⭐ HIGH |
| **START-HERE.txt** | Quick reference | ⭐⭐ MEDIUM |

### Feature Documentation

| Document | Purpose |
|----------|---------|
| **USAGE-GUIDE.md** | Feature usage instructions |
| **EXPORT-GUIDE.md** | Export/import functionality |
| **PERFORMANCE.md** | Performance optimization |
| **PERFORMANCE-QUICKSTART.md** | Quick performance setup |
| **WEBSOCKET.md** | WebSocket integration |
| **TERMINAL-INTEGRATION.md** | Terminal integration details |

### Implementation Documentation (BMAD v6 Epics)

| Document | Epic | Topics |
|----------|------|--------|
| **BMAD-V6-FINAL-SUMMARY.md** | All | Complete project summary |
| **EPIC1-SUMMARY.md** | 1 | UI/UX redesign |
| **UI-REDESIGN.md** | 1 | UI implementation details |
| **EPIC-2-SUMMARY.md** | 2 | Canvas features |
| **EPIC-2-FEATURES.md** | 2 | Feature details |
| **EPIC-3-WEBSOCKET-IMPLEMENTATION.md** | 3 | WebSocket implementation |
| **PARSER-V2-SUMMARY.md** | 4 | Enhanced parser |
| **PARSER-QUICK-REFERENCE.md** | 4 | Parser quick reference |
| **PARSER-ANALYSIS-INDEX.md** | 4 | Parser analysis index |
| **PARSER-ANALYSIS-DETAILED.md** | 4 | Detailed parser analysis |
| **PARSER-SYSTEM-DIAGRAMS.md** | 4 | Parser system diagrams |
| **EPIC-5-SUMMARY.md** | 5 | Node interactions |
| **EPIC-5-QUICK-REFERENCE.md** | 5 | Interaction quick reference |
| **EPIC-6-SUMMARY.md** | 6 | Performance optimization |
| **EPIC-7-SUMMARY.md** | 7 | Export & persistence |

### Technical Analysis

| Document | Purpose |
|----------|---------|
| **websocket_analysis.md** | Complete WebSocket analysis (814 lines) |
| **WEBSOCKET-ANALYSIS-SUMMARY.md** | WebSocket executive summary |
| **ANALYSIS-FILES-README.txt** | Analysis documents index |
| **metacognitive-sugar-analysis.md** | Metacognitive pattern analysis |
| **skill-patterns.md** | Claude Code skill patterns |

### Status & Testing

| Document | Purpose |
|----------|---------|
| **IMPLEMENTATION-COMPLETE.md** | Implementation status |
| **TESTING-RESULTS.md** | Test results & benchmarks |
| **FIXES-APPLIED.md** | Bug fixes applied |
| **PRODUCTION-CHECKLIST.md** | Production validation |

### Integration Guides

| Document | Purpose |
|----------|---------|
| **CLAUDE-INTEGRATION-COMPLETE.md** | Claude Code CLI integration |
| **TERMINAL-FLOW-PLAN.md** | Terminal flow architecture |
| **INTERACTIVE-TERMINAL-GUIDE.txt** | Interactive terminal usage |
| **integration_guide.md** | WebSocket integration guide |

---

## 10. Conventions & Standards

### Code Style

**JavaScript**:
- ES6+ syntax
- Semicolons optional (consistent within file)
- 2-space indentation
- Single quotes for strings (unless template literals)
- JSDoc comments for public methods

**Example**:
```javascript
/**
 * Parse interaction text into structured node data
 * @param {string} text - The text to parse
 * @param {string} type - The interaction type ('input' or 'output')
 * @returns {Object} Parsed node data
 */
parseInteraction(text, type) {
  // Implementation
}
```

**HTML**:
- 2-space indentation
- Semantic HTML5 elements
- Accessible attributes (aria-*, role)
- Data attributes for component state

**CSS**:
- Tailwind utility classes preferred
- Custom CSS in style-v2.css
- CSS variables for theme values
- BEM naming for custom classes (optional)

### Git Workflow

**Branch Naming**:
- Feature: `claude/feature-name-session-id`
- Bug fix: `claude/fix-name-session-id`
- Current: `claude/claude-md-mhyjkfc2p5l3mwhb-01XYLxv2hSJWqjLmxawCk8mr`

**Commit Messages**:
```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- perf: Performance improvement
- test: Tests
- chore: Maintenance

**Example**:
```
feat: Add virtual rendering for large graphs

Implement virtual rendering to improve performance with 1000+ nodes.
Uses viewport culling and LOD optimization.

Closes #123
```

### API Conventions

**HTTP Endpoints**:
- RESTful naming: `/api/resource`
- HTTP methods: GET (read), POST (create/update), DELETE (remove)
- JSON request/response bodies
- Standard HTTP status codes

**WebSocket Messages**:
- JSON format
- Required fields: `type`, `data`
- Optional fields: `id`, `timestamp`, `metadata`
- Type naming: `UPPER_SNAKE_CASE`

**Node Structure**:
```javascript
{
  id: 'unique-id',           // Required
  type: 'input|output|skill', // Required
  subtype: 'string',          // Optional
  label: 'string',            // Optional
  content: 'string',          // Required
  timestamp: 1234567890,      // Optional
  metadata: {                 // Optional
    skill: 'string',
    format: 'string',
    author: 'string',
    // ... custom fields
  },
  x: 100,                     // Set by layout
  y: 100,                     // Set by layout
  vx: 0,                      // Set by simulation
  vy: 0                       // Set by simulation
}
```

**Edge Structure**:
```javascript
{
  id: 'unique-id',            // Required
  from: 'node-id',            // Required (source)
  to: 'node-id',              // Required (target)
  type: 'default|control',    // Optional
  metadata: {                 // Optional
    // ... custom fields
  }
}
```

### Performance Guidelines

**Targets**:
- Initial page load: < 2 seconds
- Time to interactive: < 3 seconds
- WebSocket latency: < 50ms
- Render updates: 60fps (16ms per frame)
- 100 nodes: 60fps
- 500 nodes: 45fps
- 1000 nodes: 30fps

**Optimization Checklist**:
- [ ] Use virtual rendering for 500+ nodes
- [ ] Enable object pooling
- [ ] Throttle zoom/pan events (16ms)
- [ ] Debounce search/filter (300ms)
- [ ] Batch DOM updates
- [ ] Use Web Workers for heavy calculations
- [ ] Cache parsed results
- [ ] Lazy load non-critical features

### Security Considerations

**Server-Side**:
- Input validation on all endpoints
- Command execution sandboxing (if applicable)
- Rate limiting on API endpoints
- CORS configuration
- No eval() or unsafe code execution

**Client-Side**:
- Sanitize user input before rendering
- No inline event handlers
- Content Security Policy headers
- Secure WebSocket connections (wss:// in production)
- No sensitive data in localStorage

**Data Storage**:
- No passwords or secrets in flow.json
- Clear sensitive data on export
- Encrypt exported data (if needed)
- Validate imported data structure

---

## Appendix A: Quick Command Reference

### Server Management

```bash
# Start server
npm start
# or
./start.sh

# Development mode (auto-reload)
npm run dev

# Run tests
npm test

# Validate production
./validate-production.sh
```

### Testing Commands

```bash
# Test WebSocket integration
node bridge.js "input" "output"

# Test terminal integration
./test-terminal.sh

# Run parser tests
node test-parser.js

# Generate test data
node test-data-generator.js
```

### API Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Get current state
curl http://localhost:3000/api/state

# Add nodes
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{"nodes": [...], "edges": [...]}'

# Execute command
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls", "type": "shell"}'
```

---

## Appendix B: Component API Reference

### App API (window.app)

```javascript
// State management
app.state               // Current application state
app.addNodes(nodes)     // Add nodes to state
app.addEdges(edges)     // Add edges to state
app.clearState()        // Clear all state

// WebSocket
app.ws                  // WebSocket connection
app.sendMessage(data)   // Send WebSocket message
app.reconnect()         // Reconnect WebSocket

// Rendering
app.render()            // Trigger canvas render
app.refresh()           // Refresh entire UI
```

### Canvas API (window.canvas)

```javascript
// Rendering
canvas.render(data)     // Render nodes and edges
canvas.clear()          // Clear canvas
canvas.updateLayout()   // Update layout

// Layout modes
canvas.setLayoutMode('force' | 'hierarchical')

// Zoom/Pan
canvas.zoomIn()
canvas.zoomOut()
canvas.resetView()
canvas.fitToScreen()

// Selection
canvas.selectNode(nodeId)
canvas.deselectAll()
canvas.getSelectedNodes()
```

### Parser API (window.parser)

```javascript
// Parse text
const result = parser.parseInteraction(text, type)

// result = {
//   type: 'input|output|skill',
//   subtype: 'string',
//   label: 'string',
//   content: 'string',
//   metadata: {...}
// }

// Configuration
parser.config.enabled_patterns
parser.config.pattern_priority
```

### Performance API (window.performance)

```javascript
// Configuration
performance.config.enableVirtual
performance.config.enablePooling
performance.config.virtualThreshold

// Methods
performance.shouldUseVirtual(nodes)
performance.filterVisible(nodes, viewport)
performance.getNodeFromPool()
performance.releaseNode(node)
```

---

## Appendix C: Troubleshooting Checklist

### Server Issues

- [ ] Is Node.js installed? (`node --version`)
- [ ] Are dependencies installed? (`npm install`)
- [ ] Is port 3000 available? (`lsof -i :3000`)
- [ ] Is server running? (`curl http://localhost:3000/api/health`)
- [ ] Check server logs for errors

### WebSocket Issues

- [ ] Is WebSocket URL correct? (ws://localhost:3000)
- [ ] Check browser console for connection errors
- [ ] Test WebSocket with test-ws.html
- [ ] Verify server WebSocket handler is running
- [ ] Check firewall/proxy settings

### Rendering Issues

- [ ] Are nodes in state? (`console.log(app.state.nodes)`)
- [ ] Is canvas initialized? (`console.log(canvas)`)
- [ ] Check browser console for errors
- [ ] Try force re-render (`canvas.render(app.state)`)
- [ ] Check virtual rendering settings

### Performance Issues

- [ ] How many nodes? (Check with `app.state.nodes.length`)
- [ ] Is virtual rendering enabled? (500+ nodes)
- [ ] Is object pooling enabled?
- [ ] Check FPS (Press P)
- [ ] Try reducing node count for testing

### Parser Issues

- [ ] Test parser directly (`parser.parseInteraction(text, type)`)
- [ ] Check enabled patterns (`parser.config.enabled_patterns`)
- [ ] Verify pattern matching logic
- [ ] Check parser-config.json

---

## Appendix D: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-14 | Initial CLAUDE.md creation |

---

**End of CLAUDE.md**

For questions or issues, refer to the main README.md or relevant EPIC documentation.
