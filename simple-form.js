/**
 * Simple Form for Non-Technical Users
 * Provides an easy interface to create new items in Wikibase
 */

// Configuration
const WIKIBASE_URL = 'https://timna-database.wikibase.cloud';

// Global state
const state = {
    api: new WikibaseAPI(),
    categories: [],
    properties: [],
    recentItems: [],
    propertyMappings: {} // Maps category IDs to relevant properties
};

// Initialize the form
document.addEventListener('DOMContentLoaded', async () => {
    await initializeForm();
    setupEventListeners();
    loadRecentItems();
});

/**
 * Initialize the form by loading categories and properties
 */
async function initializeForm() {
    showStatus('Connecting to database...', 'loading');

    try {
        // Connect to Wikibase (read-only mode for SPARQL queries)
        const result = await state.api.connect(WIKIBASE_URL, '', '');

        if (!result.success) {
            throw new Error('Failed to connect to database');
        }

        // Load categories (all top-level classes) and properties
        await Promise.all([
            loadCategories(),
            loadProperties()
        ]);

        hideStatus();
    } catch (error) {
        showStatus('Error connecting to database: ' + error.message, 'error');
        console.error('Initialization error:', error);
    }
}

/**
 * Load all categories from the ontology
 */
async function loadCategories() {
    try {
        const classes = await state.api.getOntologyClasses();
        state.categories = classes;

        // Populate category dropdown
        const categorySelect = document.getElementById('item-category');
        categorySelect.innerHTML = '<option value="">-- Select a category --</option>';

        // Build tree structure to show only top-level categories
        const tree = buildCategoryTree(classes);

        // Add top-level categories
        tree.forEach(category => {
            const option = document.createElement('option');
            option.value = extractId(category.class);
            option.textContent = category.classLabel || extractId(category.class);
            categorySelect.appendChild(option);

            // Add children with indentation
            if (category.children) {
                addChildCategories(categorySelect, category.children, 1);
            }
        });

    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

/**
 * Build category tree structure
 */
function buildCategoryTree(classes) {
    const categoryMap = new Map();
    const roots = [];

    // Create map of all categories
    classes.forEach(cls => {
        const id = extractId(cls.class);
        if (!categoryMap.has(id)) {
            categoryMap.set(id, {
                ...cls,
                children: []
            });
        }
    });

    // Build parent-child relationships
    classes.forEach(cls => {
        const childId = extractId(cls.class);
        const parentId = cls.parent ? extractId(cls.parent) : null;

        if (parentId && categoryMap.has(parentId)) {
            const parent = categoryMap.get(parentId);
            const child = categoryMap.get(childId);
            if (!parent.children.find(c => extractId(c.class) === childId)) {
                parent.children.push(child);
            }
        } else {
            // This is a root category
            if (!roots.find(r => extractId(r.class) === childId)) {
                roots.push(categoryMap.get(childId));
            }
        }
    });

    return roots;
}

/**
 * Recursively add child categories with indentation
 */
function addChildCategories(selectElement, children, level) {
    children.forEach(child => {
        const option = document.createElement('option');
        option.value = extractId(child.class);
        const indent = '\u00A0\u00A0'.repeat(level * 2); // Non-breaking spaces
        option.textContent = indent + '└─ ' + (child.classLabel || extractId(child.class));
        selectElement.appendChild(option);

        if (child.children && child.children.length > 0) {
            addChildCategories(selectElement, child.children, level + 1);
        }
    });
}

/**
 * Load all properties
 */
async function loadProperties() {
    try {
        const properties = await state.api.getAllProperties();
        state.properties = properties;
    } catch (error) {
        console.error('Failed to load properties:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const form = document.getElementById('item-form');
    const categorySelect = document.getElementById('item-category');

    form.addEventListener('submit', handleFormSubmit);
    categorySelect.addEventListener('change', handleCategoryChange);
}

/**
 * Handle category selection change
 */
function handleCategoryChange(e) {
    const categoryId = e.target.value;

    if (!categoryId) {
        // Clear dynamic fields
        document.getElementById('dynamic-fields').innerHTML = '';
        return;
    }

    // Load relevant properties for this category
    loadDynamicFields(categoryId);
}

/**
 * Load dynamic fields based on selected category
 */
async function loadDynamicFields(categoryId) {
    const container = document.getElementById('dynamic-fields');
    container.innerHTML = '<p style="color: #6b7280;">Loading relevant fields...</p>';

    try {
        // Get properties that are commonly used with this category
        // For now, show all available properties
        // In the future, this could be filtered based on property constraints

        container.innerHTML = '';

        // Show a selection of common properties
        const commonProperties = state.properties.filter(prop => {
            const id = extractId(prop.property);
            // Filter out system properties and show user-created ones
            return !id.match(/^P[1-5]$/); // Exclude P1-P5 which are often system properties
        });

        if (commonProperties.length === 0) {
            container.innerHTML = '<p style="color: #6b7280;">No additional fields available for this category.</p>';
            return;
        }

        // Limit to first 10 properties to avoid overwhelming users
        commonProperties.slice(0, 10).forEach(prop => {
            const fieldDiv = createDynamicField(prop);
            container.appendChild(fieldDiv);
        });

    } catch (error) {
        console.error('Failed to load dynamic fields:', error);
        container.innerHTML = '<p style="color: #ef4444;">Error loading fields</p>';
    }
}

/**
 * Create a dynamic field for a property
 */
function createDynamicField(property) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'dynamic-field';

    const id = extractId(property.property);
    const label = property.propertyLabel || id;
    const description = property.propertyDescription || '';

    fieldDiv.innerHTML = `
        <label for="field-${id}">${label}</label>
        ${description ? `<div class="field-hint">${description}</div>` : ''}
        <input
            type="text"
            id="field-${id}"
            data-property="${id}"
            class="dynamic-field-input"
            placeholder="Enter ${label.toLowerCase()}...">
    `;

    return fieldDiv;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> Creating...';

    try {
        // Get form values
        const itemName = document.getElementById('item-name').value.trim();
        const itemDescription = document.getElementById('item-description').value.trim();
        const itemCategory = document.getElementById('item-category').value;
        const itemAliases = document.getElementById('item-aliases').value
            .split(',')
            .map(a => a.trim())
            .filter(a => a.length > 0);

        // Validate required fields
        if (!itemName) {
            throw new Error('Item name is required');
        }
        if (!itemCategory) {
            throw new Error('Category is required');
        }

        showStatus('Creating new item...', 'loading');

        // Since we're in read-only mode, we'll show instructions instead
        // In a full implementation with write access, this would create the item

        const instructions = generateCreationInstructions(
            itemName,
            itemDescription,
            itemCategory,
            itemAliases
        );

        showStatus(instructions, 'success');

        // Add to recent items (simulated)
        addToRecentItems({
            id: 'Q???',
            name: itemName,
            timestamp: new Date()
        });

        // Reset form
        e.target.reset();
        document.getElementById('dynamic-fields').innerHTML = '';

    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
        console.error('Form submission error:', error);
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Generate instructions for creating an item manually
 * (This is a fallback since we're in read-only mode)
 */
function generateCreationInstructions(name, description, categoryId, aliases) {
    const category = state.categories.find(c => extractId(c.class) === categoryId);
    const categoryName = category ? category.classLabel : categoryId;

    return `
        <strong>Item ready to create!</strong><br><br>
        Since this tool is in read-only mode, please create the item manually:<br><br>
        1. Go to <a href="${WIKIBASE_URL}/wiki/Special:NewItem" target="_blank">Create New Item</a><br>
        2. Use these details:<br>
        - <strong>Label:</strong> ${name}<br>
        ${description ? `- <strong>Description:</strong> ${description}<br>` : ''}
        ${aliases.length > 0 ? `- <strong>Aliases:</strong> ${aliases.join(', ')}<br>` : ''}
        3. After creating, add a statement:<br>
        - <strong>Property:</strong> subclass of (P279 or similar)<br>
        - <strong>Value:</strong> ${categoryName} (${categoryId})<br><br>
        <a href="${WIKIBASE_URL}/wiki/Special:NewItem" target="_blank" class="btn btn-primary" style="display: inline-block; text-decoration: none; margin-top: 1rem;">
            Open Wikibase to Create Item
        </a>
    `;
}

/**
 * Add item to recent items list
 */
function addToRecentItems(item) {
    state.recentItems.unshift(item);
    if (state.recentItems.length > 5) {
        state.recentItems.pop();
    }

    // Save to localStorage
    localStorage.setItem('recentItems', JSON.stringify(state.recentItems));

    // Update display
    displayRecentItems();
}

/**
 * Load recent items from localStorage
 */
function loadRecentItems() {
    const stored = localStorage.getItem('recentItems');
    if (stored) {
        state.recentItems = JSON.parse(stored);
        displayRecentItems();
    }
}

/**
 * Display recent items
 */
function displayRecentItems() {
    const container = document.getElementById('recent-items');
    const list = document.getElementById('recent-items-list');

    if (state.recentItems.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = '';

    state.recentItems.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="item-name">${item.name}</span>
                <span class="item-id">${item.id}</span>
            </div>
            <a href="${WIKIBASE_URL}/wiki/${item.id}" target="_blank" class="item-link">View →</a>
        `;
        list.appendChild(li);
    });
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    // Auto-hide success messages after 10 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 10000);
    }
}

/**
 * Hide status message
 */
function hideStatus() {
    const statusDiv = document.getElementById('status-message');
    statusDiv.style.display = 'none';
}

/**
 * Extract entity ID from URI
 */
function extractId(uri) {
    if (!uri) return null;
    const match = uri.match(/\/(Q|P)\d+$/);
    return match ? match[0].substring(1) : uri;
}
