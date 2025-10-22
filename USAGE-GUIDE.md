# Claude Flow V2 - Quick Start Guide

## Getting Started

1. **Open the Application**
   - Open `index.html` in a modern web browser
   - Chrome, Firefox, Safari, or Edge recommended

2. **Wait for Data**
   - The app automatically polls `flow_data.json` every 2 seconds
   - Nodes will appear when data is available

## Features Overview

### 1. Force-Directed Layout (Default)
The canvas uses D3.js physics simulation to automatically position nodes:
- **Nodes repel each other** to prevent overlap
- **Connected nodes attract** each other
- **Drag nodes** to reposition them
- **Layout settles** after 2-3 seconds

### 2. Minimap Navigation
Small overview in bottom-right corner:
- **Toggle**: Press `Space` or `M` key
- **Navigate**: Click anywhere on minimap to jump there
- **Green rectangle**: Shows current viewport
- **Auto-updates**: Syncs with main canvas

### 3. Search & Filter
Find specific nodes quickly:
- **Open Search**: Press `Ctrl/Cmd + F` or click search box in header
- **Type to Search**: Results update in real-time
- **Filter by Type**: Use dropdown (All, Input, Output, Skill, Auto)
- **Highlighted**: Matching nodes glow, others dim
- **Clear**: Press `Escape`

### 4. Keyboard Shortcuts

#### Navigation
- `F` - Focus all nodes (fit to view)
- `R` - Reset zoom to default
- `+` or `=` - Zoom in
- `-` - Zoom out

#### Layout & Display
- `L` - Toggle between Force and Hierarchical layouts
- `Space` or `M` - Toggle minimap

#### Search
- `Ctrl/Cmd + F` - Focus search box
- `Escape` - Clear search

#### Help
- `?` - Show keyboard shortcuts help
- Click or `?` again to close

## Layout Modes

### Force Layout (Recommended)
- **Dynamic**: Nodes move based on relationships
- **Auto-spacing**: Prevents overlap automatically
- **Interactive**: Drag nodes to reposition
- **Best for**: Exploring connections, discovering patterns

**How to use:**
1. Let simulation settle (2-3 seconds)
2. Drag nodes to group related items
3. Zoom/pan to explore

### Hierarchical Layout
- **Structured**: Fixed grid-based positioning
- **Predictable**: Same layout every time
- **Parent-child**: Clear hierarchy
- **Best for**: Understanding flow structure, presentations

**How to use:**
1. Press `L` to switch from Force layout
2. Nodes arrange in vertical tree
3. Scroll to see full hierarchy

## Tips & Tricks

### Best Practices
1. **Start with Force Layout**: Let it settle first
2. **Use Minimap**: Great for large graphs (50+ nodes)
3. **Search First**: Find specific nodes quickly
4. **Drag to Group**: Organize related nodes together
5. **Press F**: Fit all nodes when lost

### Performance Tips
- **Under 100 nodes**: Force layout works great
- **100-200 nodes**: Use minimap for navigation
- **200+ nodes**: Consider hierarchical layout
- **Laggy?**: Try hierarchical layout or close other tabs

### Common Workflows

#### Exploring a New Graph
1. Open app, wait for nodes to load
2. Press `F` to fit all nodes
3. Let force layout settle
4. Drag interesting nodes to group them

#### Finding Specific Nodes
1. Press `Ctrl/Cmd + F`
2. Type search query
3. App auto-focuses first result
4. Use filter dropdown for type-specific search

#### Presenting to Others
1. Press `L` to switch to hierarchical
2. Press `F` to fit all nodes
3. Use minimap for quick navigation
4. Share your screen

## Troubleshooting

### No Nodes Appearing
- **Check**: Is `flow_data.json` in the same directory?
- **Wait**: App polls every 2 seconds
- **Console**: Open browser DevTools (F12) to check for errors

### Force Layout Too Chaotic
- **Wait**: Give it 2-3 seconds to settle
- **Switch**: Press `L` for hierarchical layout
- **Adjust**: Edit force strengths in `canvas-v2.js`

### Search Not Working
- **Focus**: Click search box or press `Ctrl/Cmd + F`
- **Type**: Start typing immediately
- **Clear**: Press `Escape` to reset

### Minimap Not Visible
- **Toggle**: Press `Space` or `M`
- **Check**: Ensure nodes exist on canvas
- **Position**: Look in bottom-right corner

### Performance Issues
- **Close Tabs**: Free up browser resources
- **Hierarchical**: Press `L` to switch layout
- **Disable Minimap**: Press `M` to hide
- **Hardware Acceleration**: Enable in browser settings

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |

**Mobile Support:**
- Touch gestures work for pan/zoom
- Keyboard shortcuts not available
- Minimap may be small on phones

## Keyboard Shortcut Reference

```
NAVIGATION
  F          Focus all nodes (fit to view)
  R          Reset zoom
  +/=        Zoom in
  -          Zoom out

LAYOUT
  L          Toggle Force ↔ Hierarchical
  Space/M    Toggle minimap

SEARCH
  Ctrl/Cmd+F Open search
  Escape     Clear search

HELP
  ?          Show/hide help
```

## Advanced Usage

### Custom Node Colors
Edit gradients in `index.html`:
```html
<linearGradient id="inputGradient">
  <stop offset="0%" style="stop-color:#10b981;..." />
</linearGradient>
```

### Adjust Force Strengths
Edit `canvas-v2.js` in `initializeSimulation()`:
```javascript
.force('charge', d3.forceManyBody()
    .strength(-800)  // Change this
    .distanceMax(400))
```

### Change Poll Interval
Edit `app-v2.js`:
```javascript
this.pollInterval = 2000; // milliseconds
```

## Need Help?

- Check `EPIC-2-FEATURES.md` for technical details
- Open browser console (F12) for error messages
- Press `?` in app to see all keyboard shortcuts

## Version
Claude Flow V2.0 with D3.js integration
