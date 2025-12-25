/**
 * Dynamic Archaeological Site Form
 * Auto-generates form fields from Wikibase ontology
 */

// Configuration
const API_BASE = window.location.origin + '/api';
const WIKIBASE_URL = 'https://timna-database.wikibase.cloud';
const SPARQL_ENDPOINT = `${WIKIBASE_URL}/query/sparql`;

// Configuration for the entity type we're creating
const CONFIG = {
    entityTypeId: 'Q17', // Archaeological Site
    instanceOfProperty: 'P110', // "instance of" property
};

// Global state
const state = {
    sessionId: null,
    isLoggedIn: false,
    schema: null,
    formData: {},
    recentSites: []
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadRecentSites();
    checkSession();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('site-form').addEventListener('submit', handleSubmit);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('refresh-schema-btn').addEventListener('click', () => loadSchema(true));
}

/**
 * Check for existing session
 */
function checkSession() {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
        state.sessionId = sessionId;
        showMainForm();
    }
}

/**
 * Handle login
 */
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('bot-username').value;
    const password = document.getElementById('bot-password').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Login failed');
        }

        state.sessionId = data.sessionId;
        localStorage.setItem('sessionId', data.sessionId);
        showMainForm();

    } catch (error) {
        alert('Login failed: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Show main form and load schema
 */
async function showMainForm() {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('main-form').style.display = 'block';
    document.getElementById('connection-status').className = 'status-badge connected';
    document.getElementById('connection-status').textContent = 'Connected';
    document.getElementById('refresh-schema-btn').style.display = 'inline-block';

    state.isLoggedIn = true;
    await loadSchema();
}

/**
 * Load schema from Wikibase
 */
async function loadSchema(forceRefresh = false) {
    // Check cache first
    const cachedSchema = localStorage.getItem('formSchema');
    const cacheTimestamp = localStorage.getItem('formSchemaTimestamp');
    const cacheAge = Date.now() - parseInt(cacheTimestamp || '0');

    // Use cache if less than 1 hour old and not forcing refresh
    if (!forceRefresh && cachedSchema && cacheAge < 3600000) {
        state.schema = JSON.parse(cachedSchema);
        buildForm();
        return;
    }

    document.getElementById('dynamic-fields').innerHTML = `
        <div class="field-loader">
            <div class="spinner"></div>
            <p>Discovering properties and values from ontology...</p>
        </div>
    `;

    try {
        // Step 1: Get ALL properties used on Archaeological Sites
        // Query Q507 (Site 002) which we know has all the properties
        const propertiesQuery = `
            PREFIX wd: <https://timna-database.wikibase.cloud/entity/>
            PREFIX wdt: <https://timna-database.wikibase.cloud/prop/direct/>
            PREFIX wikibase: <http://wikiba.se/ontology#>
            PREFIX bd: <http://www.bigdata.com/rdf#>

            SELECT DISTINCT ?property ?propertyLabel ?propertyDescription ?datatype
            WHERE {
                # Get all statements from Q507 (Site 002)
                wd:Q507 ?propertyDirect ?value .

                # Get the property details
                ?property wikibase:directClaim ?propertyDirect .
                ?property wikibase:propertyType ?datatype .

                SERVICE wikibase:label {
                    bd:serviceParam wikibase:language "en" .
                }
            }
            ORDER BY ?propertyLabel
        `;

        const propertiesResponse = await fetch(SPARQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: 'query=' + encodeURIComponent(propertiesQuery)
        });

        if (!propertiesResponse.ok) {
            const errorText = await propertiesResponse.text();
            console.error('Properties query failed:', propertiesResponse.status, errorText);
            throw new Error(`Failed to query SPARQL endpoint: ${propertiesResponse.status}`);
        }

        const propertiesData = await propertiesResponse.json();
        console.log('Raw properties response:', propertiesData);

        // Step 2: For item-type properties, get all used values
        document.getElementById('dynamic-fields').innerHTML = `
            <div class="field-loader">
                <div class="spinner"></div>
                <p>Loading property values from existing data...</p>
            </div>
        `;

        const valuesQuery = `
            PREFIX wd: <https://timna-database.wikibase.cloud/entity/>
            PREFIX wdt: <https://timna-database.wikibase.cloud/prop/direct/>
            PREFIX wikibase: <http://wikiba.se/ontology#>
            PREFIX bd: <http://www.bigdata.com/rdf#>

            SELECT DISTINCT ?property ?value ?valueLabel
            WHERE {
                # Get Q507 and other sites with instance of property
                ?site wdt:${CONFIG.instanceOfProperty} wd:${CONFIG.entityTypeId} .

                # Get all their property-value pairs where value is an item
                ?site ?propertyDirect ?value .

                # Convert direct property to full property
                ?property wikibase:directClaim ?propertyDirect .
                ?property wikibase:propertyType wikibase:WikibaseItem .

                # Make sure value is an item (not a literal)
                ?value a wikibase:Item .

                SERVICE wikibase:label {
                    bd:serviceParam wikibase:language "en" .
                }
            }
            ORDER BY ?propertyLabel ?valueLabel
        `;

        console.log('Executing values query...');
        console.log('Values query:', valuesQuery);

        const valuesResponse = await fetch(SPARQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: 'query=' + encodeURIComponent(valuesQuery)
        });

        let propertyValues = {};
        if (valuesResponse.ok) {
            const valuesData = await valuesResponse.json();
            console.log('Values query results:', valuesData.results.bindings);
            console.log('Number of value bindings:', valuesData.results.bindings.length);
            propertyValues = processPropertyValues(valuesData.results.bindings);
            console.log('Processed property values:', propertyValues);
            console.log('Property IDs with values:', Object.keys(propertyValues));
        } else {
            const errorText = await valuesResponse.text();
            console.error('Values query failed:', valuesResponse.status, errorText);
            console.warn('Continuing without dropdowns');
        }

        // Process results into schema
        console.log('Properties found:', propertiesData.results.bindings.length);
        state.schema = processSchemaResults(propertiesData.results.bindings, propertyValues);
        console.log('Final schema:', state.schema);

        // Cache the schema
        localStorage.setItem('formSchema', JSON.stringify(state.schema));
        localStorage.setItem('formSchemaTimestamp', Date.now().toString());

        buildForm();

    } catch (error) {
        console.error('Error loading schema:', error);
        document.getElementById('dynamic-fields').innerHTML = `
            <div class="error-box">
                <p><strong>Error loading schema:</strong> ${error.message}</p>
                <p>Falling back to basic form...</p>
            </div>
        `;
        // Fallback to basic form
        buildBasicForm();
    }
}

/**
 * Process property values from SPARQL results
 */
function processPropertyValues(bindings) {
    const propertyValues = {};

    bindings.forEach(binding => {
        const propertyId = binding.property.value.split('/').pop();
        const valueId = binding.value.value.split('/').pop();
        const valueLabel = binding.valueLabel.value;

        if (!propertyValues[propertyId]) {
            propertyValues[propertyId] = [];
        }

        // Avoid duplicates
        if (!propertyValues[propertyId].find(v => v.id === valueId)) {
            propertyValues[propertyId].push({
                id: valueId,
                label: valueLabel
            });
        }
    });

    return propertyValues;
}

/**
 * Process SPARQL results into form schema
 */
function processSchemaResults(bindings, propertyValues = {}) {
    const schema = {
        basic: [],
        optional: []
    };

    // Core required fields (always included)
    const coreFields = [
        {
            id: 'label',
            label: 'Site Name',
            description: 'The primary name for this archaeological site',
            type: 'text',
            required: true,
            section: 'basic'
        },
        {
            id: 'description',
            label: 'Description',
            description: 'Brief description of the site',
            type: 'textarea',
            required: true,
            section: 'basic'
        }
    ];

    schema.basic.push(...coreFields);

    // Process properties from SPARQL
    bindings.forEach(binding => {
        const propertyId = binding.property.value.split('/').pop();
        const datatype = binding.datatype.value.split('#').pop();

        // Skip instance of property (we'll set it automatically)
        if (propertyId === CONFIG.instanceOfProperty) {
            return;
        }

        const field = {
            id: propertyId,
            label: binding.propertyLabel.value,
            description: binding.propertyDescription?.value || '',
            propertyType: datatype,
            type: mapDatatypeToInputType(datatype),
            required: false,
            section: 'optional'
        };

        // Add available values if this is an item property and we have values
        if (datatype === 'WikibaseItem') {
            console.log(`Property ${propertyId} (${binding.propertyLabel.value}) is WikibaseItem type`);
            if (propertyValues[propertyId]) {
                console.log(`  ✓ Found ${propertyValues[propertyId].length} values for ${propertyId}`);
                field.values = propertyValues[propertyId];
                field.type = 'select'; // Change to select dropdown
            } else {
                console.log(`  ✗ No values found for ${propertyId} in propertyValues:`, Object.keys(propertyValues));
            }
        }

        if (field.section === 'basic') {
            schema.basic.push(field);
        } else {
            schema.optional.push(field);
        }
    });

    return schema;
}

/**
 * Map Wikibase datatype to HTML input type
 */
function mapDatatypeToInputType(datatype) {
    const mapping = {
        'String': 'text',
        'Url': 'url',
        'ExternalId': 'text',
        'Quantity': 'number',
        'Time': 'date',
        'GlobeCoordinate': 'coordinates',
        'WikibaseItem': 'item-select',
        'Monolingualtext': 'text',
        'CommonsMedia': 'url'
    };
    return mapping[datatype] || 'text';
}

/**
 * Build form from schema
 */
function buildForm() {
    if (!state.schema) {
        buildBasicForm();
        return;
    }

    let html = '';

    // Basic/Required Section
    if (state.schema.basic.length > 0) {
        html += '<section class="form-section">';
        html += '<h2>Basic Information</h2>';
        state.schema.basic.forEach(field => {
            html += generateFieldHTML(field);
        });
        html += '</section>';
    }

    // Optional Section
    if (state.schema.optional.length > 0) {
        html += '<section class="form-section">';
        html += '<h2>Additional Information (Optional)</h2>';
        html += '<div class="field-group-dynamic">';
        state.schema.optional.forEach(field => {
            html += generateFieldHTML(field);
        });
        html += '</div>';
        html += '</section>';
    }

    document.getElementById('dynamic-fields').innerHTML = html;

    // Attach event listeners for select fields with custom option
    attachSelectListeners();
}

/**
 * Attach event listeners to select fields
 */
function attachSelectListeners() {
    if (!state.schema) return;

    const allFields = [...state.schema.basic, ...state.schema.optional];
    allFields.forEach(field => {
        if (field.type === 'select') {
            const select = document.getElementById(field.id);
            const customInput = document.getElementById(`${field.id}-custom`);

            if (select && customInput) {
                select.addEventListener('change', (e) => {
                    if (e.target.value === '__custom__') {
                        customInput.style.display = 'block';
                        customInput.required = select.required;
                    } else {
                        customInput.style.display = 'none';
                        customInput.required = false;
                        customInput.value = '';
                    }
                });
            }
        }
    });
}

/**
 * Generate HTML for a single field
 */
function generateFieldHTML(field) {
    const required = field.required ? 'required' : '';
    const requiredMark = field.required ? '*' : '';
    const propertyBadge = field.id.startsWith('P')
        ? `<span class="property-badge">${field.id}</span>`
        : '';

    let inputHTML = '';

    switch (field.type) {
        case 'textarea':
            inputHTML = `<textarea id="${field.id}" rows="3" ${required}></textarea>`;
            break;

        case 'number':
            inputHTML = `<input type="number" id="${field.id}" step="any" ${required}>`;
            break;

        case 'url':
            inputHTML = `<input type="url" id="${field.id}" ${required}>`;
            break;

        case 'date':
            inputHTML = `<input type="date" id="${field.id}" ${required}>`;
            break;

        case 'coordinates':
            inputHTML = `
                <div class="field-group">
                    <input type="number" id="${field.id}-lat" step="0.000001" placeholder="Latitude" ${required}>
                    <input type="number" id="${field.id}-lon" step="0.000001" placeholder="Longitude" ${required}>
                </div>
            `;
            break;

        case 'select':
            // Dropdown with existing values
            console.log(`Creating dropdown for ${field.label} with ${field.values.length} values:`, field.values);
            const options = field.values.map(v =>
                `<option value="${v.id}">${v.label} (${v.id})</option>`
            ).join('');
            inputHTML = `
                <select id="${field.id}" ${required}>
                    <option value="">-- Select ${field.label} --</option>
                    ${options}
                    <option value="__custom__">➕ Add new value (enter ID below)</option>
                </select>
                <input type="text" id="${field.id}-custom"
                       placeholder="Enter new item ID (e.g., Q123)"
                       style="display:none; margin-top:0.5rem;">
                <small style="color: #059669;">✓ ${field.values.length} existing value(s) discovered</small>
            `;
            break;

        case 'item-select':
            inputHTML = `<input type="text" id="${field.id}" placeholder="Enter item ID (e.g., Q123)" ${required}>`;
            break;

        default:
            inputHTML = `<input type="text" id="${field.id}" ${required}>`;
    }

    return `
        <div class="field">
            <label for="${field.id}">${field.label} ${requiredMark} ${propertyBadge}</label>
            ${inputHTML}
            ${field.description ? `<small>${field.description}</small>` : ''}
        </div>
    `;
}

/**
 * Fallback basic form
 */
function buildBasicForm() {
    const html = `
        <section class="form-section">
            <h2>Basic Information</h2>

            <div class="field">
                <label for="label">Site Name *</label>
                <input type="text" id="label" required>
                <small>The primary name for this archaeological site</small>
            </div>

            <div class="field">
                <label for="description">Description *</label>
                <textarea id="description" rows="3" required></textarea>
                <small>Brief description of the site</small>
            </div>
        </section>
    `;
    document.getElementById('dynamic-fields').innerHTML = html;
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating site...';

    try {
        // Collect form data
        const formData = collectFormData();

        // Build Wikibase entity data
        const entityData = buildEntityData(formData);

        // Create the item
        const response = await fetch(`${API_BASE}/create-item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: state.sessionId,
                data: entityData
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to create site');
        }

        // Success!
        const entityId = result.entity.id;
        showSuccess(entityId);
        saveRecentSite(entityId, formData.label);

        // Reset form
        document.getElementById('site-form').reset();

    } catch (error) {
        alert('Error creating site: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Collect form data from all fields
 */
function collectFormData() {
    const data = {
        label: document.getElementById('label')?.value || '',
        description: document.getElementById('description')?.value || '',
        claims: []
    };

    // Collect all property fields
    if (state.schema) {
        [...state.schema.basic, ...state.schema.optional].forEach(field => {
            if (field.id.startsWith('P')) {
                if (field.type === 'select') {
                    // Handle select dropdowns
                    const selectElement = document.getElementById(field.id);
                    const customInput = document.getElementById(`${field.id}-custom`);

                    let value = selectElement?.value;

                    // If custom option selected, use custom input value
                    if (value === '__custom__' && customInput?.value) {
                        value = customInput.value;
                    }

                    if (value && value !== '__custom__' && value !== '') {
                        data.claims.push({
                            property: field.id,
                            value: value,
                            datatype: field.propertyType
                        });
                    }
                } else if (field.type === 'coordinates') {
                    // Handle coordinates specially
                    const lat = document.getElementById(`${field.id}-lat`)?.value;
                    const lon = document.getElementById(`${field.id}-lon`)?.value;
                    if (lat && lon) {
                        data.claims.push({
                            property: field.id,
                            value: { lat, lon },
                            datatype: 'GlobeCoordinate'
                        });
                    }
                } else {
                    // Handle regular inputs
                    const element = document.getElementById(field.id);
                    if (element && element.value) {
                        data.claims.push({
                            property: field.id,
                            value: element.value,
                            datatype: field.propertyType
                        });
                    }
                }
            }
        });
    }

    return data;
}

/**
 * Build entity data for Wikibase
 */
function buildEntityData(formData) {
    const data = {
        labels: {
            en: { language: 'en', value: formData.label }
        },
        descriptions: {
            en: { language: 'en', value: formData.description }
        },
        claims: []
    };

    // Add instance of claim
    data.claims.push({
        mainsnak: {
            snaktype: 'value',
            property: CONFIG.instanceOfProperty,
            datavalue: {
                value: {
                    'entity-type': 'item',
                    'numeric-id': parseInt(CONFIG.entityTypeId.replace('Q', '')),
                    id: CONFIG.entityTypeId
                },
                type: 'wikibase-entityid'
            }
        },
        type: 'statement'
    });

    // Add property claims
    formData.claims.forEach(claim => {
        data.claims.push({
            mainsnak: {
                snaktype: 'value',
                property: claim.property,
                datavalue: buildDataValue(claim.value, claim.datatype)
            },
            type: 'statement'
        });
    });

    return data;
}

/**
 * Build datavalue based on type
 */
function buildDataValue(value, datatype) {
    switch (datatype) {
        case 'WikibaseItem':
            return {
                value: {
                    'entity-type': 'item',
                    'numeric-id': parseInt(value.replace('Q', '')),
                    id: value
                },
                type: 'wikibase-entityid'
            };

        case 'Quantity':
            return {
                value: {
                    amount: value.toString(),
                    unit: '1'
                },
                type: 'quantity'
            };

        case 'Time':
            return {
                value: {
                    time: '+' + value + 'T00:00:00Z',
                    timezone: 0,
                    before: 0,
                    after: 0,
                    precision: 11,
                    calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
                },
                type: 'time'
            };

        case 'GlobeCoordinate':
            return {
                value: {
                    latitude: parseFloat(value.lat),
                    longitude: parseFloat(value.lon),
                    altitude: null,
                    precision: 0.0001,
                    globe: 'http://www.wikidata.org/entity/Q2'
                },
                type: 'globecoordinate'
            };

        default:
            return {
                value: value,
                type: 'string'
            };
    }
}

/**
 * Show success message
 */
function showSuccess(entityId) {
    const link = `${WIKIBASE_URL}/wiki/${entityId}`;
    document.getElementById('site-link').href = link;
    document.getElementById('site-link').textContent = entityId;
    document.getElementById('success-message').style.display = 'block';

    setTimeout(() => {
        document.getElementById('success-message').style.display = 'none';
    }, 10000);
}

/**
 * Save recent site
 */
function saveRecentSite(id, label) {
    state.recentSites.unshift({ id, label, timestamp: new Date().toISOString() });
    state.recentSites = state.recentSites.slice(0, 5);
    localStorage.setItem('recentSites', JSON.stringify(state.recentSites));
    displayRecentSites();
}

/**
 * Load recent sites
 */
function loadRecentSites() {
    const saved = localStorage.getItem('recentSites');
    if (saved) {
        state.recentSites = JSON.parse(saved);
        displayRecentSites();
    }
}

/**
 * Display recent sites
 */
function displayRecentSites() {
    if (state.recentSites.length === 0) return;

    const list = document.getElementById('recent-sites-list');
    list.innerHTML = state.recentSites.map(site => `
        <li>
            <a href="${WIKIBASE_URL}/wiki/${site.id}" target="_blank">
                ${site.label} (${site.id})
            </a>
        </li>
    `).join('');

    document.getElementById('recent-sites').style.display = 'block';
}

/**
 * Handle logout
 */
function handleLogout() {
    localStorage.removeItem('sessionId');
    state.sessionId = null;
    state.isLoggedIn = false;

    document.getElementById('main-form').style.display = 'none';
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('connection-status').className = 'status-badge disconnected';
    document.getElementById('connection-status').textContent = 'Not Connected';
}
