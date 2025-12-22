/**
 * Main Application Logic
 */

// Global state
const state = {
    api: new WikibaseAPI(),
    currentEntity: null,
    classes: [],
    properties: [],
    viewMode: 'classes', // 'classes' or 'properties'
    expandedNodes: new Set(),
    originalEntityData: null
};

// DOM Elements
const elements = {
    loginPanel: document.getElementById('login-panel'),
    mainContent: document.getElementById('main-content'),
    loginForm: document.getElementById('login-form'),
    connectionStatus: document.getElementById('connection-status'),
    treeContainer: document.getElementById('tree-container'),
    searchBox: document.getElementById('search-box'),
    refreshBtn: document.getElementById('refresh-btn'),
    viewClassesBtn: document.getElementById('view-classes'),
    viewPropertiesBtn: document.getElementById('view-properties'),
    createClassBtn: document.getElementById('create-class-btn'),
    createPropertyBtn: document.getElementById('create-property-btn'),
    welcomeMessage: document.getElementById('welcome-message'),
    entityEditor: document.getElementById('entity-editor'),
    createModal: document.getElementById('create-modal'),
    createForm: document.getElementById('create-form')
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

/**
 * Set up event listeners
 */
function initializeEventListeners() {
    // Login
    elements.loginForm.addEventListener('submit', handleLogin);

    // View mode toggle
    elements.viewClassesBtn.addEventListener('click', () => switchViewMode('classes'));
    elements.viewPropertiesBtn.addEventListener('click', () => switchViewMode('properties'));

    // Refresh
    elements.refreshBtn.addEventListener('click', loadOntologyData);

    // Search
    elements.searchBox.addEventListener('input', handleSearch);

    // Create buttons
    elements.createClassBtn.addEventListener('click', () => openCreateModal('class'));
    elements.createPropertyBtn.addEventListener('click', () => openCreateModal('property'));

    // Modal close
    document.querySelector('.close').addEventListener('click', closeCreateModal);
    document.querySelector('.cancel-modal').addEventListener('click', closeCreateModal);
    elements.createForm.addEventListener('submit', handleCreateEntity);

    // Entity editor
    document.getElementById('save-btn').addEventListener('click', saveEntityChanges);
    document.getElementById('cancel-btn').addEventListener('click', cancelEntityEdit);
    document.getElementById('add-statement-btn').addEventListener('click', addStatement);
}

/**
 * Handle login
 */
async function handleLogin(e) {
    e.preventDefault();

    const url = document.getElementById('wikibase-url').value;
    const username = document.getElementById('bot-username').value;
    const password = document.getElementById('bot-password').value;

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Connecting...';
    submitBtn.disabled = true;

    try {
        const result = await state.api.connect(url, username, password);

        if (result.success) {
            // Update UI
            elements.connectionStatus.textContent = `Connected to ${url}`;
            elements.connectionStatus.className = 'status-connected';
            elements.loginPanel.style.display = 'none';
            elements.mainContent.style.display = 'block';

            // Load ontology data
            await loadOntologyData();
        } else {
            alert(`Connection failed: ${result.error}`);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        alert(`Connection error: ${error.message}`);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Load ontology data
 */
async function loadOntologyData() {
    elements.treeContainer.innerHTML = '<div class="loading">Loading ontology...</div>';

    try {
        // Load classes and properties in parallel
        const [classes, properties] = await Promise.all([
            state.api.getOntologyClasses(),
            state.api.getAllProperties()
        ]);

        state.classes = classes;
        state.properties = properties;

        // Render current view
        renderTree();
    } catch (error) {
        console.error('Failed to load ontology:', error);
        elements.treeContainer.innerHTML = `<div class="loading">Error loading ontology: ${error.message}</div>`;
    }
}

/**
 * Switch view mode between classes and properties
 */
function switchViewMode(mode) {
    state.viewMode = mode;

    // Update button states
    elements.viewClassesBtn.classList.toggle('active', mode === 'classes');
    elements.viewPropertiesBtn.classList.toggle('active', mode === 'properties');

    // Render tree
    renderTree();
}

/**
 * Render tree view
 */
function renderTree() {
    const data = state.viewMode === 'classes' ? state.classes : state.properties;

    if (data.length === 0) {
        elements.treeContainer.innerHTML = '<div class="loading">No items found</div>';
        return;
    }

    if (state.viewMode === 'classes') {
        renderClassTree(data);
    } else {
        renderPropertyList(data);
    }
}

/**
 * Render class hierarchy as a tree
 */
function renderClassTree(classes) {
    // Build tree structure
    const tree = buildClassTree(classes);

    // Render tree
    elements.treeContainer.innerHTML = '';
    renderTreeNodes(tree, elements.treeContainer);
}

/**
 * Build hierarchical tree from flat class list
 */
function buildClassTree(classes) {
    const classMap = new Map();
    const roots = [];

    // Create map of all classes
    classes.forEach(cls => {
        const id = extractId(cls.class);
        if (!classMap.has(id)) {
            classMap.set(id, {
                id: id,
                label: cls.classLabel || id,
                uri: cls.class,
                children: []
            });
        }
    });

    // Build parent-child relationships
    classes.forEach(cls => {
        const childId = extractId(cls.class);
        const parentId = cls.parent ? extractId(cls.parent) : null;

        const child = classMap.get(childId);

        if (parentId && classMap.has(parentId)) {
            const parent = classMap.get(parentId);
            if (!parent.children.find(c => c.id === childId)) {
                parent.children.push(child);
            }
        } else {
            // No parent or parent not in our set - this is a root
            if (!roots.find(r => r.id === childId)) {
                roots.push(child);
            }
        }
    });

    return roots;
}

/**
 * Render tree nodes recursively
 */
function renderTreeNodes(nodes, container, level = 0) {
    nodes.forEach(node => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        itemDiv.dataset.entityId = node.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tree-item-content';

        // Toggle button for expandable items
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        if (node.children && node.children.length > 0) {
            toggle.textContent = state.expandedNodes.has(node.id) ? '▼' : '▶';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleNode(node.id);
            });
        } else {
            toggle.textContent = '•';
        }

        const label = document.createElement('span');
        label.className = 'tree-item-label';
        label.textContent = node.label;

        const id = document.createElement('span');
        id.className = 'tree-item-id';
        id.textContent = node.id;

        contentDiv.appendChild(toggle);
        contentDiv.appendChild(label);
        contentDiv.appendChild(id);
        itemDiv.appendChild(contentDiv);

        // Click handler to load entity
        itemDiv.addEventListener('click', () => selectEntity(node.id));

        container.appendChild(itemDiv);

        // Render children if expanded
        if (node.children && node.children.length > 0 && state.expandedNodes.has(node.id)) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-children';
            renderTreeNodes(node.children, childrenDiv, level + 1);
            container.appendChild(childrenDiv);
        }
    });
}

/**
 * Render property list (flat)
 */
function renderPropertyList(properties) {
    elements.treeContainer.innerHTML = '';

    properties.forEach(prop => {
        const id = extractId(prop.property);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        itemDiv.dataset.entityId = id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tree-item-content';

        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.textContent = '•';

        const label = document.createElement('span');
        label.className = 'tree-item-label';
        label.textContent = prop.propertyLabel || id;

        const idSpan = document.createElement('span');
        idSpan.className = 'tree-item-id';
        idSpan.textContent = id;

        contentDiv.appendChild(toggle);
        contentDiv.appendChild(label);
        contentDiv.appendChild(idSpan);
        itemDiv.appendChild(contentDiv);

        itemDiv.addEventListener('click', () => selectEntity(id));

        elements.treeContainer.appendChild(itemDiv);
    });
}

/**
 * Toggle tree node expansion
 */
function toggleNode(nodeId) {
    if (state.expandedNodes.has(nodeId)) {
        state.expandedNodes.delete(nodeId);
    } else {
        state.expandedNodes.add(nodeId);
    }
    renderTree();
}

/**
 * Select and load entity for editing
 */
async function selectEntity(entityId) {
    // Update selected state in tree
    document.querySelectorAll('.tree-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.entityId === entityId);
    });

    // Load entity data
    try {
        const entity = await state.api.getEntity(entityId);
        state.currentEntity = entity;
        state.originalEntityData = JSON.parse(JSON.stringify(entity)); // Deep copy

        displayEntity(entity);
    } catch (error) {
        alert(`Failed to load entity: ${error.message}`);
    }
}

/**
 * Display entity in editor
 */
function displayEntity(entity) {
    elements.welcomeMessage.style.display = 'none';
    elements.entityEditor.style.display = 'block';

    // Header
    const label = getLabel(entity);
    document.getElementById('entity-label').textContent = label;
    document.getElementById('entity-id').textContent = entity.id;

    // Basic info
    document.getElementById('edit-label').value = label;
    document.getElementById('edit-description').value = getDescription(entity);
    document.getElementById('edit-aliases').value = getAliases(entity).join(', ');

    // Statements
    displayStatements(entity);

    // Show subclasses section if this is a class
    const subclassesSection = document.getElementById('subclasses-section');
    if (entity.claims && entity.claims.P279) { // Has "subclass of" property
        subclassesSection.style.display = 'block';
        displaySubclasses(entity);
    } else {
        subclassesSection.style.display = 'none';
    }
}

/**
 * Display statements
 */
function displayStatements(entity) {
    const container = document.getElementById('statements-list');
    container.innerHTML = '';

    if (!entity.claims) {
        container.innerHTML = '<p>No statements</p>';
        return;
    }

    for (let property in entity.claims) {
        const claims = entity.claims[property];

        claims.forEach((claim, index) => {
            const statementDiv = document.createElement('div');
            statementDiv.className = 'statement-item';

            const header = document.createElement('div');
            header.className = 'statement-header';

            const propSpan = document.createElement('span');
            propSpan.className = 'statement-property';
            propSpan.textContent = property; // TODO: Fetch property label

            const actions = document.createElement('div');
            actions.className = 'statement-actions';

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'secondary-btn';

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'secondary-btn';

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            header.appendChild(propSpan);
            header.appendChild(actions);

            const value = document.createElement('div');
            value.className = 'statement-value';
            value.textContent = formatClaimValue(claim);

            statementDiv.appendChild(header);
            statementDiv.appendChild(value);

            container.appendChild(statementDiv);
        });
    }
}

/**
 * Display subclasses
 */
function displaySubclasses(entity) {
    const container = document.getElementById('subclasses-list');
    container.innerHTML = '<p>Loading subclasses...</p>';

    // TODO: Query for items that have this entity as their parent
    // For now, just show placeholder
    container.innerHTML = '<p>Subclass functionality coming soon</p>';
}

/**
 * Format claim value for display
 */
function formatClaimValue(claim) {
    if (!claim.mainsnak || !claim.mainsnak.datavalue) {
        return 'No value';
    }

    const datavalue = claim.mainsnak.datavalue;

    switch (datavalue.type) {
        case 'wikibase-entityid':
            return datavalue.value.id; // TODO: Fetch entity label
        case 'string':
            return datavalue.value;
        case 'monolingualtext':
            return `${datavalue.value.text} (${datavalue.value.language})`;
        case 'time':
            return datavalue.value.time;
        case 'quantity':
            return datavalue.value.amount;
        default:
            return JSON.stringify(datavalue.value);
    }
}

/**
 * Save entity changes
 */
async function saveEntityChanges() {
    const label = document.getElementById('edit-label').value;
    const description = document.getElementById('edit-description').value;
    const aliases = document.getElementById('edit-aliases').value
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

    const data = {
        labels: { en: { language: 'en', value: label } },
        descriptions: { en: { language: 'en', value: description } },
        aliases: { en: aliases.map(a => ({ language: 'en', value: a })) }
    };

    try {
        await state.api.editEntity(state.currentEntity.id, data);
        alert('Changes saved successfully!');

        // Reload the entity to get updated data
        await selectEntity(state.currentEntity.id);

        // Refresh tree to show updated labels
        await loadOntologyData();
    } catch (error) {
        alert(`Failed to save changes: ${error.message}`);
    }
}

/**
 * Cancel entity edit
 */
function cancelEntityEdit() {
    if (state.currentEntity) {
        displayEntity(state.originalEntityData);
    }
}

/**
 * Add statement
 */
function addStatement() {
    alert('Add statement functionality coming soon!');
    // TODO: Implement statement addition UI
}

/**
 * Handle search
 */
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();

    document.querySelectorAll('.tree-item').forEach(item => {
        const label = item.querySelector('.tree-item-label').textContent.toLowerCase();
        const id = item.querySelector('.tree-item-id').textContent.toLowerCase();

        if (label.includes(searchTerm) || id.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Open create modal
 */
function openCreateModal(type) {
    elements.createModal.style.display = 'flex';
    elements.createModal.dataset.entityType = type;

    document.getElementById('modal-title').textContent =
        type === 'class' ? 'Create New Class' : 'Create New Property';

    // Show/hide relevant fields
    const parentClassGroup = document.getElementById('parent-class-group');
    const propertyDatatypeGroup = document.getElementById('property-datatype-group');

    if (type === 'class') {
        parentClassGroup.style.display = 'block';
        propertyDatatypeGroup.style.display = 'none';
        populateParentClassSelect();
    } else {
        parentClassGroup.style.display = 'none';
        propertyDatatypeGroup.style.display = 'block';
    }

    // Clear form
    elements.createForm.reset();
}

/**
 * Close create modal
 */
function closeCreateModal() {
    elements.createModal.style.display = 'none';
}

/**
 * Populate parent class select
 */
function populateParentClassSelect() {
    const select = document.getElementById('parent-class');
    select.innerHTML = '<option value="">None (Root Class)</option>';

    state.classes.forEach(cls => {
        const id = extractId(cls.class);
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${cls.classLabel} (${id})`;
        select.appendChild(option);
    });
}

/**
 * Handle create entity
 */
async function handleCreateEntity(e) {
    e.preventDefault();

    const type = elements.createModal.dataset.entityType === 'class' ? 'item' : 'property';
    const label = document.getElementById('new-label').value;
    const description = document.getElementById('new-description').value;

    const data = {
        labels: { en: { language: 'en', value: label } },
        descriptions: { en: { language: 'en', value: description } }
    };

    // Add datatype for properties
    if (type === 'property') {
        data.datatype = document.getElementById('property-datatype').value;
    }

    try {
        const result = await state.api.createEntity(type, data);
        const newEntityId = result.entity.id;

        // If creating a class with a parent, add "subclass of" statement
        if (type === 'item') {
            const parentClass = document.getElementById('parent-class').value;
            if (parentClass) {
                // TODO: Get the correct property ID for "subclass of"
                // For now, using P279 as example
                await state.api.setClaim(
                    newEntityId,
                    'P279',
                    { value: { 'entity-type': 'item', id: parentClass }, type: 'wikibase-entityid' }
                );
            }
        }

        alert(`${type === 'item' ? 'Class' : 'Property'} created successfully: ${newEntityId}`);

        closeCreateModal();

        // Reload ontology data
        await loadOntologyData();

        // Select the newly created entity
        await selectEntity(newEntityId);
    } catch (error) {
        alert(`Failed to create entity: ${error.message}`);
    }
}

/**
 * Helper: Extract entity ID from URI
 */
function extractId(uri) {
    if (!uri) return null;
    const match = uri.match(/\/(Q|P)\d+$/);
    return match ? match[0].substring(1) : uri;
}

/**
 * Helper: Get label from entity
 */
function getLabel(entity, lang = 'en') {
    if (entity.labels && entity.labels[lang]) {
        return entity.labels[lang].value;
    }
    return entity.id;
}

/**
 * Helper: Get description from entity
 */
function getDescription(entity, lang = 'en') {
    if (entity.descriptions && entity.descriptions[lang]) {
        return entity.descriptions[lang].value;
    }
    return '';
}

/**
 * Helper: Get aliases from entity
 */
function getAliases(entity, lang = 'en') {
    if (entity.aliases && entity.aliases[lang]) {
        return entity.aliases[lang].map(a => a.value);
    }
    return [];
}
