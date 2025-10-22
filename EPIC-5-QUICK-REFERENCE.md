# EPIC 5 - Quick Reference Guide

## Interaction Shortcuts

### Mouse Interactions
| Action | Result |
|--------|--------|
| **Hover over node** | Shows tooltip with preview |
| **Click node** | Opens modal with full details |
| **Double-click node** | Focus and zoom on node |
| **Right-click node** | Opens context menu |
| **Ctrl/Cmd + Click** | Multi-select nodes |
| **Click background** | Clear selections |
| **Hover edge** | Highlight edge |

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| **ESC** | Clear selections and highlights |
| **Ctrl/Cmd + A** | Select all nodes |
| **Ctrl/Cmd + Z** | Undo (future) |
| **Ctrl/Cmd + Shift + Z** | Redo (future) |
| **Delete** | Delete selected (future) |

### Mobile Gestures
| Gesture | Result |
|---------|--------|
| **Tap** | Open modal |
| **Long press (500ms)** | Open context menu |
| **Long press + hold** | Show tooltip |
| **Swipe** | Pan canvas |
| **Pinch** | Zoom canvas |

---

## Context Menu Actions

1. **View Details** - Open modal with full node information
2. **Copy Content** - Copy node content to clipboard
3. **Export Node** - Download node as JSON file
4. **View Connections** - Highlight connected nodes
5. **Focus Node** - Center and zoom on node
6. **Highlight Connected** - Show all connections
7. **Select Node** - Add to selection

---

## Tooltip Information

When hovering over a node, the tooltip shows:
- Node type badge (colored)
- Timestamp (relative time)
- Node title
- Content preview (300 chars)
- Metadata:
  - Skill name (if applicable)
  - Detected type (if applicable)
  - Parent ID
  - Node ID

---

## Modal Features

The modal provides:
- Full node content with markdown rendering
- Metadata cards:
  - Timestamp (full date/time)
  - Skill name
  - Detected type
  - Node ID
  - Parent ID
- Relationship viewer (parent/children)
- Action buttons:
  - Copy Content
  - Export Node
  - Close

### Markdown Support
- Headers: `# H1`, `## H2`, `### H3`
- Bold: `**text**`
- Italic: `*text*`
- Inline code: `` `code` ``
- Code blocks: ` ```language ... ``` `
- Lists: `- item`

---

## Node States

### Visual Indicators
- **Normal** - Default appearance
- **Hover** - Scaled up (1.05x) + glow
- **Selected** - Purple border + glow
- **Highlighted** - Blue border + bright glow
- **Dimmed** - 30% opacity

### State Combinations
- You can have multiple selected nodes
- Hovering shows connections temporarily
- Selected nodes stay highlighted
- Dimmed nodes are unrelated to current selection

---

## Color Coding

### Node Types
- **Input** (Green `#10b981`) - User messages
- **Output** (Blue `#3b82f6`) - Assistant responses
- **Skill** (Orange `#f59e0b`) - Skill executions
- **Auto** (Purple `#8b5cf6`) - Auto-detected nodes

### UI Elements
- **Primary** (Purple `#6366f1`) - Main accent color
- **Success** (Green `#10b981`) - Positive actions
- **Warning** (Orange `#f59e0b`) - Caution items
- **Error** (Red `#ef4444`) - Destructive actions
- **Info** (Blue `#3b82f6`) - Informational items

---

## Performance Tips

1. **Smooth animations** - All interactions run at 60fps
2. **Event delegation** - Efficient event handling
3. **Lazy loading** - Components load only when needed
4. **Memory management** - Proper cleanup on destroy
5. **Hardware acceleration** - CSS transforms for animations

---

## Accessibility

- **Keyboard navigation** - Full keyboard support
- **Focus indicators** - Clear visual focus
- **ARIA labels** - Screen reader support
- **High contrast** - WCAG AA compliant
- **Reduced motion** - Respects user preferences
- **Touch targets** - Minimum 44px on mobile

---

## Browser Support

Minimum versions:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Samsung Internet 14+

Required features:
- ES6+ JavaScript
- CSS Custom Properties
- SVG support
- Touch Events API
- Clipboard API

---

## Troubleshooting

### Tooltip not showing?
1. Check if `window.interactions` exists
2. Hover for at least 300ms
3. Verify node has valid data
4. Check browser console for errors

### Modal not opening?
1. Ensure interactions are initialized
2. Check node has valid ID
3. Verify modal.js is loaded
4. Check for JavaScript errors

### Context menu not appearing?
1. Right-click should not be blocked
2. On mobile: long-press for 500ms
3. Verify context-menu.js is loaded
4. Check if node has data-node-id

### Slow performance?
1. Check number of nodes (<100 recommended)
2. Enable hardware acceleration
3. Check for memory leaks
4. Disable animations if needed

---

## API Quick Reference

```javascript
// Access the interaction system
window.interactions

// Select nodes
interactions.selectNode('node-id')
interactions.deselectNode('node-id')
interactions.clearSelection()
interactions.selectAll()

// Highlight connections
interactions.highlightConnections('node-id')
interactions.clearHighlights()

// Focus on node
interactions.focusNode('node-id')

// Get node data
interactions.getNodeData('node-id')
interactions.getConnections('node-id')

// Open modal programmatically
interactions.modal.open(nodeData)
interactions.modal.close()

// Show tooltip
interactions.tooltip.show(nodeData, event)
interactions.tooltip.hide()

// Context menu
interactions.contextMenu.show(nodeData, x, y)
interactions.contextMenu.hide()
```

---

## File Structure

```
claude-flow/
├── tooltip.js           (380 lines) - Tooltip component
├── modal.js             (480 lines) - Modal component
├── context-menu.js      (320 lines) - Context menu
├── interactions.js      (520 lines) - Main engine
├── style-v2.css         (+700 lines) - All styling
├── canvas.js            (Updated) - Canvas integration
├── index.html           (Updated) - Script loading
└── EPIC-5-SUMMARY.md    (Documentation)
```

---

## Next Steps

After EPIC 5, consider:
1. Advanced search and filtering
2. Node editing capabilities
3. Batch operations on selections
4. Export to various formats
5. Drag-to-select rectangle tool
6. Minimap integration
7. Real-time collaboration
8. Custom node templates
9. Animation presets
10. Plugin system

---

**Quick Tip:** Press `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac) to open browser DevTools and explore the interaction system in the console with `window.interactions`.

