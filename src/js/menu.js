/**
 * Main Menu Module
 * Handles form selection and item loading
 */

let config = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration
    await loadConfig();

    // Check if user is already logged in
    if (initAuth()) {
        showMainMenu();
    } else {
        showLoginPanel();
    }

    // Setup event listeners
    setupLoginForm();
    setupMenuButtons();
});

/**
 * Load configuration from JSON
 */
async function loadConfig() {
    try {
        const response = await fetch('/config/exemplars.json');
        config = await response.json();
    } catch (error) {
        console.error('Failed to load configuration:', error);
        alert('Failed to load configuration. Please refresh the page.');
    }
}

/**
 * Setup login form
 */
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('bot-username').value;
        const password = document.getElementById('bot-password').value;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

        const result = await login(username, password);

        if (result.success) {
            showMainMenu();
        } else {
            alert('Login failed: ' + result.error);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

/**
 * Setup main menu buttons
 */
function setupMenuButtons() {
    // Create new item buttons
    document.querySelectorAll('[data-action="create"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const entityType = e.target.dataset.type;
            createNewItem(entityType);
        });
    });

    // Load item button
    const loadItemBtn = document.getElementById('load-item-btn');
    if (loadItemBtn) {
        loadItemBtn.addEventListener('click', loadItemForEditing);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Edit item button (shown after item is loaded)
    const editItemBtn = document.getElementById('edit-item-btn');
    if (editItemBtn) {
        editItemBtn.addEventListener('click', () => {
            const itemId = document.getElementById('item-search').value.trim();
            editItem(itemId);
        });
    }
}

/**
 * Show login panel
 */
function showLoginPanel() {
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('main-menu').style.display = 'none';
}

/**
 * Show main menu
 */
function showMainMenu() {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

/**
 * Create new item of specified type
 */
function createNewItem(entityType) {
    if (!config || !config.exemplars[entityType]) {
        alert('Invalid entity type: ' + entityType);
        return;
    }

    // Navigate to form page with create mode
    const params = new URLSearchParams({
        mode: 'create',
        type: entityType,
        exemplar: config.exemplars[entityType].id
    });

    window.location.href = `/src/forms/form.html?${params.toString()}`;
}

/**
 * Load item for editing
 */
async function loadItemForEditing() {
    const itemInput = document.getElementById('item-search');
    const itemPreview = document.getElementById('item-preview');
    const loadBtn = document.getElementById('load-item-btn');

    const input = itemInput.value.trim();
    if (!input) {
        alert('Please enter an item ID or URL');
        return;
    }

    // Extract Q number from input
    const qNumber = extractQNumber(input);
    if (!qNumber) {
        alert('Invalid item ID or URL. Please enter a Q number (e.g., Q507) or full URL');
        return;
    }

    // Show loading state
    loadBtn.disabled = true;
    loadBtn.innerHTML = '<span class="spinner"></span> Loading...';

    try {
        // Query Wikibase for item details
        const itemData = await fetchItemData(qNumber);

        // Display preview
        document.getElementById('item-preview-label').innerHTML =
            `<strong>${itemData.label || qNumber}</strong> (${qNumber})`;
        document.getElementById('item-preview-type').textContent =
            `Type: ${itemData.type || 'Unknown'}`;
        itemPreview.style.display = 'block';

        loadBtn.disabled = false;
        loadBtn.innerHTML = 'Load Item for Editing';

    } catch (error) {
        alert('Failed to load item: ' + error.message);
        loadBtn.disabled = false;
        loadBtn.innerHTML = 'Load Item for Editing';
        itemPreview.style.display = 'none';
    }
}

/**
 * Navigate to edit mode for item
 */
function editItem(itemId) {
    const qNumber = extractQNumber(itemId);
    if (!qNumber) {
        alert('Invalid item ID');
        return;
    }

    // Navigate to form page with edit mode
    const params = new URLSearchParams({
        mode: 'edit',
        item: qNumber
    });

    window.location.href = `/src/forms/form.html?${params.toString()}`;
}

/**
 * Extract Q number from various input formats
 */
function extractQNumber(input) {
    // Already a Q number
    if (/^Q\d+$/i.test(input)) {
        return input.toUpperCase();
    }

    // URL format
    const match = input.match(/[/:]([Q]\d+)$/i);
    if (match) {
        return match[1].toUpperCase();
    }

    return null;
}

/**
 * Fetch item data from Wikibase
 */
async function fetchItemData(qNumber) {
    const sparqlQuery = `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX wdt: <${config.wikibase.url}/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>

        SELECT ?itemLabel ?typeLabel WHERE {
            wd:${qNumber} rdfs:label ?itemLabel .
            FILTER(LANG(?itemLabel) = "en")

            OPTIONAL {
                wd:${qNumber} wdt:${config.properties.instanceOf} ?type .
                ?type rdfs:label ?typeLabel .
                FILTER(LANG(?typeLabel) = "en")
            }
        }
        LIMIT 1
    `;

    const response = await fetch(config.wikibase.sparqlEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: 'query=' + encodeURIComponent(sparqlQuery)
    });

    if (!response.ok) {
        throw new Error('Failed to fetch item data');
    }

    const data = await response.json();

    if (data.results.bindings.length === 0) {
        throw new Error('Item not found');
    }

    const binding = data.results.bindings[0];

    return {
        label: binding.itemLabel?.value,
        type: binding.typeLabel?.value
    };
}
