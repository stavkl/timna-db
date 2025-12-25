/**
 * Archaeological Site Form
 * Full write access via backend proxy server
 */

// Configuration
const API_BASE = window.location.origin + '/api';
const WIKIBASE_URL = 'https://timna-database.wikibase.cloud';

// Property IDs (based on your Wikibase structure from Q508)
const PROPERTIES = {
    INSTANCE_OF: 'P110',
    IDENTIFIER: 'P226',
    RESEARCH_PROJECT: 'P173',
    IAA_NAME: 'P13',
    IAA_ID: 'P14',
    IAA_MAP: 'P15',
    IAA_LINK: 'P16',
    DESCRIPTION: 'P80',
    LATITUDE: 'P27',
    LONGITUDE: 'P26',
    X_ITM: 'P23',
    Y_ITM: 'P24',
    ALTITUDE: 'P25',
    POLYGON_AREA: 'P189',
    ARCHAEOLOGICAL_PERIOD: 'P93',
    DATE_RANGE: 'P201',
    DATING_METHOD: 'P104',
    SITE_FUNCTION: 'P227',
    ARTIFACT_TYPE: 'P193'
};

// Item IDs
const ARCHAEOLOGICAL_SITE_ID = 'Q17'; // "Archaeological_Site" - adjust if different

// Global state
const state = {
    sessionId: null,
    isLoggedIn: false,
    recentSites: [],
    periodsLoaded: false,
    projectsLoaded: false
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Login failed');
        }

        // Store session
        state.sessionId = data.sessionId;
        localStorage.setItem('sessionId', data.sessionId);
        state.isLoggedIn = true;

        // Show main form
        showMainForm();

    } catch (error) {
        alert('Login failed: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Show main form and load data
 */
async function showMainForm() {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('main-form').style.display = 'block';
    document.getElementById('connection-status').textContent = 'Connected';
    document.getElementById('connection-status').className = 'status-badge connected';

    // Load dropdown data
    await Promise.all([
        loadPeriods(),
        loadDatingMethods(),
        loadSiteFunctions(),
        loadArtifactTypes(),
        loadResearchProjects()
    ]);
}

/**
 * Load archaeological periods
 */
async function loadPeriods() {
    // For now, add common periods manually
    // In production, you'd query these from your Wikibase
    const periods = [
        { id: 'Q7', label: 'Late Bronze Age' },
        { id: 'Q8', label: 'Iron Age I' },
        { id: 'Q9', label: 'Iron Age II' },
        { id: 'Q10', label: 'Persian Period' },
        { id: 'Q11', label: 'Hellenistic Period' },
        { id: 'Q12', label: 'Roman Period' },
        { id: 'Q13', label: 'Byzantine Period' },
        { id: 'Q14', label: 'Early Islamic Period' }
    ];

    const select = document.getElementById('archaeological-period');
    select.innerHTML = '<option value="">-- Select Period --</option>';

    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period.id;
        option.textContent = period.label;
        select.appendChild(option);
    });
}

/**
 * Load dating methods
 */
async function loadDatingMethods() {
    const methods = [
        { id: 'Q100', label: 'C14' },
        { id: 'Q101', label: 'Archaeomagnetism' },
        { id: 'Q102', label: 'Pottery Typology' },
        { id: 'Q103', label: 'Stratigraphy' }
    ];

    const select = document.getElementById('dating-method');
    select.innerHTML = '';

    methods.forEach(method => {
        const option = document.createElement('option');
        option.value = method.id;
        option.textContent = method.label;
        select.appendChild(option);
    });
}

/**
 * Load site functions
 */
async function loadSiteFunctions() {
    const functions = [
        { id: 'Q200', label: 'Smelting' },
        { id: 'Q201', label: 'Burial' },
        { id: 'Q202', label: 'Habitation' },
        { id: 'Q203', label: 'Mining' },
        { id: 'Q204', label: 'Religious' },
        { id: 'Q205', label: 'Industrial' },
        { id: 'Q206', label: 'Agricultural' }
    ];

    const select = document.getElementById('site-function');
    select.innerHTML = '';

    functions.forEach(func => {
        const option = document.createElement('option');
        option.value = func.id;
        option.textContent = func.label;
        select.appendChild(option);
    });
}

/**
 * Load artifact types
 */
async function loadArtifactTypes() {
    const types = [
        { id: 'Q300', label: 'Pottery' },
        { id: 'Q301', label: 'Bone' },
        { id: 'Q302', label: 'Slag' },
        { id: 'Q303', label: 'Stone Tools' },
        { id: 'Q304', label: 'Metal Objects' },
        { id: 'Q305', label: 'Glass' },
        { id: 'Q306', label: 'Textiles' }
    ];

    const select = document.getElementById('artifact-types');
    select.innerHTML = '';

    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.label;
        select.appendChild(option);
    });
}

/**
 * Load research projects
 */
async function loadResearchProjects() {
    const projects = [
        { id: 'Q400', label: 'Aravah Expedition' },
        { id: 'Q401', label: 'CTV Project' },
        { id: 'Q402', label: 'Timna Valley Project' }
    ];

    const select = document.getElementById('research-project');
    select.innerHTML = '<option value="">-- Select Project --</option>';

    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.label;
        select.appendChild(option);
    });
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    if (!state.sessionId) {
        alert('Session expired. Please log in again.');
        handleLogout();
        return;
    }

    // Show progress
    showProgress('Creating archaeological site...');

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        // Step 1: Create the item with basic info
        const siteName = document.getElementById('site-name').value.trim();
        const siteDescription = document.getElementById('site-description').value.trim();

        const itemData = {
            labels: {
                en: { language: 'en', value: siteName }
            },
            descriptions: {
                en: { language: 'en', value: siteDescription }
            }
        };

        updateProgress('Creating item...', 20);

        const createResponse = await fetch(`${API_BASE}/create-item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: state.sessionId,
                data: itemData
            })
        });

        const createResult = await createResponse.json();

        if (!createResponse.ok || !createResult.success) {
            throw new Error(createResult.error || 'Failed to create item');
        }

        const entityId = createResult.entity.id;
        console.log('Created item:', entityId);

        updateProgress('Adding properties...', 40);

        // Step 2: Add all the properties
        await addAllProperties(entityId);

        updateProgress('Site created successfully!', 100);

        // Success
        showStatus(`Archaeological site created successfully: ${entityId}`, 'success');

        // Add to recent sites
        addToRecentSites({
            id: entityId,
            name: siteName,
            timestamp: new Date()
        });

        // Reset form
        document.getElementById('site-form').reset();

        // Hide progress after a moment
        setTimeout(() => {
            hideProgress();
        }, 2000);

    } catch (error) {
        console.error('Form submission error:', error);
        showStatus('Error creating site: ' + error.message, 'error');
        hideProgress();
    } finally {
        submitBtn.disabled = false;
    }
}

/**
 * Add all properties to the created item
 */
async function addAllProperties(entityId) {
    const properties = [];

    // Instance of Archaeological Site
    properties.push({
        property: PROPERTIES.INSTANCE_OF,
        value: ARCHAEOLOGICAL_SITE_ID,
        datatype: 'wikibase-item'
    });

    // Identifier
    const identifier = document.getElementById('site-identifier').value;
    if (identifier) {
        properties.push({
            property: PROPERTIES.IDENTIFIER,
            value: identifier,
            datatype: 'quantity'
        });
    }

    // Research Project
    const researchProject = document.getElementById('research-project').value;
    if (researchProject) {
        properties.push({
            property: PROPERTIES.RESEARCH_PROJECT,
            value: researchProject,
            datatype: 'wikibase-item'
        });
    }

    // IAA Information
    const iaaName = document.getElementById('iaa-name').value;
    if (iaaName) {
        properties.push({
            property: PROPERTIES.IAA_NAME,
            value: iaaName,
            datatype: 'string'
        });
    }

    const iaaId = document.getElementById('iaa-id').value;
    if (iaaId) {
        properties.push({
            property: PROPERTIES.IAA_ID,
            value: iaaId,
            datatype: 'quantity'
        });
    }

    const iaaMap = document.getElementById('iaa-map').value;
    if (iaaMap) {
        properties.push({
            property: PROPERTIES.IAA_MAP,
            value: iaaMap,
            datatype: 'quantity'
        });
    }

    const iaaLink = document.getElementById('iaa-link').value;
    if (iaaLink) {
        properties.push({
            property: PROPERTIES.IAA_LINK,
            value: iaaLink,
            datatype: 'url'
        });
    }

    // Detailed Description
    const detailedDesc = document.getElementById('detailed-description').value;
    if (detailedDesc) {
        properties.push({
            property: PROPERTIES.DESCRIPTION,
            value: detailedDesc,
            datatype: 'string'
        });
    }

    // Coordinates
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    if (latitude && longitude) {
        properties.push({
            property: PROPERTIES.LATITUDE,
            value: latitude,
            datatype: 'quantity'
        });
        properties.push({
            property: PROPERTIES.LONGITUDE,
            value: longitude,
            datatype: 'quantity'
        });
    }

    // ITM Coordinates
    const xItm = document.getElementById('x-itm').value;
    if (xItm) {
        properties.push({
            property: PROPERTIES.X_ITM,
            value: xItm,
            datatype: 'quantity'
        });
    }

    const yItm = document.getElementById('y-itm').value;
    if (yItm) {
        properties.push({
            property: PROPERTIES.Y_ITM,
            value: yItm,
            datatype: 'quantity'
        });
    }

    // Altitude
    const altitude = document.getElementById('altitude').value;
    if (altitude) {
        properties.push({
            property: PROPERTIES.ALTITUDE,
            value: altitude,
            datatype: 'quantity'
        });
    }

    // Polygon Area
    const polygonArea = document.getElementById('polygon-area').value;
    if (polygonArea) {
        properties.push({
            property: PROPERTIES.POLYGON_AREA,
            value: polygonArea,
            datatype: 'quantity'
        });
    }

    // Archaeological Period
    const period = document.getElementById('archaeological-period').value;
    if (period) {
        properties.push({
            property: PROPERTIES.ARCHAEOLOGICAL_PERIOD,
            value: period,
            datatype: 'wikibase-item'
        });
    }

    // Dating Methods (multiple)
    const datingMethods = Array.from(document.getElementById('dating-method').selectedOptions);
    datingMethods.forEach(option => {
        if (option.value) {
            properties.push({
                property: PROPERTIES.DATING_METHOD,
                value: option.value,
                datatype: 'wikibase-item'
            });
        }
    });

    // Site Functions (multiple)
    const siteFunctions = Array.from(document.getElementById('site-function').selectedOptions);
    siteFunctions.forEach(option => {
        if (option.value) {
            properties.push({
                property: PROPERTIES.SITE_FUNCTION,
                value: option.value,
                datatype: 'wikibase-item'
            });
        }
    });

    // Artifact Types (multiple)
    const artifactTypes = Array.from(document.getElementById('artifact-types').selectedOptions);
    artifactTypes.forEach(option => {
        if (option.value) {
            properties.push({
                property: PROPERTIES.ARTIFACT_TYPE,
                value: option.value,
                datatype: 'wikibase-item'
            });
        }
    });

    // Add all properties
    const total = properties.length;
    for (let i = 0; i < total; i++) {
        const prop = properties[i];
        const progress = 40 + Math.floor((i / total) * 50);
        updateProgress(`Adding property ${i + 1} of ${total}...`, progress);

        await addClaim(entityId, prop.property, prop.value, prop.datatype);

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

/**
 * Add a single claim to an entity
 */
async function addClaim(entityId, property, value, datatype) {
    try {
        const response = await fetch(`${API_BASE}/add-claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: state.sessionId,
                entityId,
                property,
                value,
                datatype
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error(`Failed to add property ${property}:`, result.error);
            // Don't throw - continue with other properties
        }

        return result;
    } catch (error) {
        console.error(`Error adding property ${property}:`, error);
        // Don't throw - continue with other properties
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    state.sessionId = null;
    state.isLoggedIn = false;
    localStorage.removeItem('sessionId');

    document.getElementById('main-form').style.display = 'none';
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('connection-status').textContent = 'Not Connected';
    document.getElementById('connection-status').className = 'status-badge disconnected';
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 10000);
    }
}

/**
 * Show progress indicator
 */
function showProgress(message) {
    const progress = document.getElementById('progress');
    progress.style.display = 'block';
    document.getElementById('status-message').style.display = 'none';
    updateProgress(message, 0);
}

/**
 * Update progress
 */
function updateProgress(message, percent) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');

    if (progressBar && progressText) {
        progressBar.style.width = percent + '%';
        progressText.textContent = message;
    }
}

/**
 * Hide progress indicator
 */
function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

/**
 * Add to recent sites
 */
function addToRecentSites(site) {
    state.recentSites.unshift(site);
    if (state.recentSites.length > 5) {
        state.recentSites.pop();
    }

    localStorage.setItem('recentSites', JSON.stringify(state.recentSites));
    displayRecentSites();
}

/**
 * Load recent sites from localStorage
 */
function loadRecentSites() {
    const stored = localStorage.getItem('recentSites');
    if (stored) {
        state.recentSites = JSON.parse(stored);
        displayRecentSites();
    }
}

/**
 * Display recent sites
 */
function displayRecentSites() {
    const container = document.getElementById('recent-sites');
    const list = document.getElementById('recent-sites-list');

    if (state.recentSites.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = '';

    state.recentSites.forEach(site => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="site-info">
                <span class="site-name">${site.name}</span>
                <span class="site-id">${site.id}</span>
            </div>
            <a href="${WIKIBASE_URL}/wiki/${site.id}" target="_blank" class="site-link">View →</a>
        `;
        list.appendChild(li);
    });
}
