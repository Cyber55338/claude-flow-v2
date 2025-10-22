/**
 * Search and Filter Component
 */

class SearchManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.activeFilter = 'all';
        this.searchQuery = '';
        this.create();
        this.setupListeners();
    }

    /**
     * Create search UI
     */
    create() {
        // Find header controls
        const header = document.querySelector('.header');
        const controls = document.querySelector('.controls');

        // Create search container
        this.container = document.createElement('div');
        this.container.className = 'search-container';

        // Create search input
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.id = 'search-input';
        this.searchInput.className = 'search-input';
        this.searchInput.placeholder = 'Search nodes... (Ctrl/Cmd+F)';

        // Create filter dropdown
        this.filterSelect = document.createElement('select');
        this.filterSelect.id = 'filter-select';
        this.filterSelect.className = 'filter-select';
        this.filterSelect.innerHTML = `
            <option value="all">All Types</option>
            <option value="input">Input</option>
            <option value="output">Output</option>
            <option value="skill">Skill</option>
            <option value="auto">Auto</option>
        `;

        // Create results count
        this.resultsCount = document.createElement('span');
        this.resultsCount.className = 'search-results';
        this.resultsCount.textContent = '';

        this.container.appendChild(this.searchInput);
        this.container.appendChild(this.filterSelect);
        this.container.appendChild(this.resultsCount);

        // Insert before controls
        header.insertBefore(this.container, controls);
    }

    /**
     * Setup event listeners
     */
    setupListeners() {
        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applySearch();
        });

        // Filter dropdown
        this.filterSelect.addEventListener('change', (e) => {
            this.activeFilter = e.target.value;
            this.applySearch();
        });

        // Clear search on Escape
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clear();
            }
        });
    }

    /**
     * Apply search and filter
     */
    applySearch() {
        if (!this.canvas.nodes || this.canvas.nodes.length === 0) {
            this.resultsCount.textContent = '';
            return;
        }

        // Find matching nodes
        const matches = this.canvas.nodes.filter(node => {
            // Filter by type
            if (this.activeFilter !== 'all' && node.type !== this.activeFilter) {
                return false;
            }

            // Filter by search query
            if (this.searchQuery) {
                const title = this.canvas.getNodeTitle(node).toLowerCase();
                const content = (node.content || '').toLowerCase();
                return title.includes(this.searchQuery) || content.includes(this.searchQuery);
            }

            return true;
        });

        // Update UI
        this.highlightMatches(matches);
        this.updateResultsCount(matches.length);

        // Auto-focus on first result if search is active
        if (this.searchQuery && matches.length > 0) {
            this.canvas.focusNode(matches[0].id);
        }
    }

    /**
     * Highlight matching nodes
     */
    highlightMatches(matches) {
        const matchIds = matches.map(n => n.id);

        if (this.searchQuery || this.activeFilter !== 'all') {
            this.canvas.highlightNodes(matchIds);
        } else {
            this.canvas.clearHighlights();
        }
    }

    /**
     * Update results count
     */
    updateResultsCount(count) {
        if (this.searchQuery || this.activeFilter !== 'all') {
            this.resultsCount.textContent = `${count} result${count !== 1 ? 's' : ''}`;
        } else {
            this.resultsCount.textContent = '';
        }
    }

    /**
     * Update search results (called when data changes)
     */
    updateResults() {
        if (this.searchQuery || this.activeFilter !== 'all') {
            this.applySearch();
        }
    }

    /**
     * Clear search
     */
    clear() {
        this.searchQuery = '';
        this.activeFilter = 'all';
        this.searchInput.value = '';
        this.filterSelect.value = 'all';
        this.resultsCount.textContent = '';
        this.canvas.clearHighlights();
    }

    /**
     * Focus search input
     */
    focus() {
        this.searchInput.focus();
        this.searchInput.select();
    }
}

window.SearchManager = SearchManager;
