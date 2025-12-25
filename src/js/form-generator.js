/**
 * Form Generator Module
 * Generates forms based on exemplar items using the pipeline approach
 */

// Form state
const formState = {
    mode: null, // 'create' or 'edit'
    entityType: null,
    exemplarId: null,
    itemId: null, // For edit mode
    instanceOfValue: null,
    schema: null,
    currentData: null, // Existing data in edit mode
    config: null
};

/**
 * Initialize form generator
 */
async function initFormGenerator() {
    // Load configuration
    formState.config = await loadConfig();

    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    formState.mode = params.get('mode');
    formState.entityType = params.get('type');
    formState.exemplarId = params.get('exemplar');
    formState.itemId = params.get('item');

    // Validate mode
    if (!formState.mode || (formState.mode !== 'create' && formState.mode !== 'edit')) {
        showError('Invalid mode. Please return to the main menu.');
        return;
    }

    // Check authentication
    if (!initAuth()) {
        window.location.href = '/src/index.html';
        return;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Generate form based on mode
    if (formState.mode === 'create') {
        await generateCreateForm();
    } else {
        await generateEditForm();
    }

    // Setup form submission
    const form = document.getElementById('main-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Generate form for creating new item
 */
async function generateCreateForm() {
    if (!formState.exemplarId) {
        showError('Missing exemplar ID');
        return;
    }

    showLoadingMessage('Analyzing exemplar item...');

    try {
        // Step 1: Get Instance Of value from exemplar
        const instanceOfQuery = buildInstanceOfQuery(formState.config, formState.exemplarId);
        const instanceOfResults = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            instanceOfQuery
        );

        if (instanceOfResults.length === 0) {
            throw new Error('Could not determine entity type from exemplar');
        }

        formState.instanceOfValue = instanceOfResults[0].instanceOf.value.split('/').pop();
        const entityTypeName = instanceOfResults[0].instanceOfLabel?.value || formState.instanceOfValue;

        updatePageTitle(`Create New ${entityTypeName}`);

        // Step 2: Extract all properties from exemplar
        showLoadingMessage('Discovering properties from exemplar...');
        const propertiesQuery = buildExemplarPropertiesQuery(formState.config, formState.exemplarId);
        const properties = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            propertiesQuery
        );

        console.log(`Found ${properties.length} properties from exemplar`);

        // Step 3: For each WikibaseItem property, get all possible values
        showLoadingMessage('Loading dropdown values from database...');
        const schema = await buildSchemaWithValues(properties, formState.instanceOfValue);

        formState.schema = schema;

        // Step 4: Render the form
        renderForm();

    } catch (error) {
        console.error('Error generating create form:', error);
        showError('Failed to generate form: ' + error.message);
    }
}

/**
 * Generate form for editing existing item
 */
async function generateEditForm() {
    if (!formState.itemId) {
        showError('Missing item ID');
        return;
    }

    showLoadingMessage('Loading item data...');

    try {
        // Step 1: Get item's Instance Of value
        const instanceOfQuery = buildInstanceOfQuery(formState.config, formState.itemId);
        const instanceOfResults = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            instanceOfQuery
        );

        if (instanceOfResults.length === 0) {
            throw new Error('Could not determine entity type');
        }

        formState.instanceOfValue = instanceOfResults[0].instanceOf.value.split('/').pop();
        const entityTypeName = instanceOfResults[0].instanceOfLabel?.value || formState.instanceOfValue;

        // Find matching exemplar
        formState.exemplarId = findExemplarByInstanceOf(formState.instanceOfValue);
        if (!formState.exemplarId) {
            throw new Error(`No exemplar configured for type: ${entityTypeName}`);
        }

        updatePageTitle(`Edit ${entityTypeName}`);

        // Step 2: Get current item data
        showLoadingMessage('Loading current values...');
        const itemDataQuery = buildItemDataQuery(formState.config, formState.itemId);
        const itemData = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            itemDataQuery
        );

        // Also get label and description
        const labelDescQuery = buildLabelDescriptionQuery(formState.config, formState.itemId);
        const labelDescResults = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            labelDescQuery
        );

        formState.currentData = processItemData(itemData, labelDescResults);
        console.log('Current item data:', formState.currentData);

        // Step 3: Get properties from exemplar
        showLoadingMessage('Discovering properties...');
        const propertiesQuery = buildExemplarPropertiesQuery(formState.config, formState.exemplarId);
        const properties = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            propertiesQuery
        );

        // Step 4: Build schema with values
        showLoadingMessage('Loading dropdown values...');
        const schema = await buildSchemaWithValues(properties, formState.instanceOfValue);

        formState.schema = schema;

        // Step 5: Render form with current data pre-filled
        renderForm(formState.currentData);

    } catch (error) {
        console.error('Error generating edit form:', error);
        showError('Failed to load item for editing: ' + error.message);
    }
}

/**
 * Build schema with dropdown values for WikibaseItem properties
 */
async function buildSchemaWithValues(properties, instanceOfValue) {
    const schema = {
        basic: [],
        properties: []
    };

    // Add label and description fields (always present)
    schema.basic.push({
        id: 'label',
        label: 'Name',
        type: 'text',
        required: true,
        isSpecial: true
    });

    schema.basic.push({
        id: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        isSpecial: true
    });

    // Process each property
    for (const prop of properties) {
        const propertyId = prop.property.value.split('/').pop();
        const datatype = prop.datatype.value.split('#').pop();

        // Skip Instance Of property (set automatically)
        if (propertyId === formState.config.properties.instanceOf) {
            continue;
        }

        const field = {
            id: propertyId,
            label: prop.propertyLabel.value,
            description: prop.propertyDescription?.value || '',
            datatype: datatype,
            type: mapDatatypeToInputType(datatype),
            required: false,
            isSpecial: false
        };

        // For WikibaseItem properties, get all possible values
        if (datatype === 'WikibaseItem') {
            console.log(`Fetching values for ${propertyId} (${field.label})...`);
            const valuesQuery = buildPropertyValuesQuery(formState.config, propertyId, instanceOfValue);
            const values = await executeSparqlQuery(
                formState.config.wikibase.sparqlEndpoint,
                valuesQuery
            );

            if (values.length > 0) {
                field.values = values.map(v => ({
                    id: v.value.value.split('/').pop(),
                    label: v.valueLabel.value
                }));
                field.type = 'multiselect';
                field.allowMultiple = true;
                console.log(`  Found ${field.values.length} values`);
            } else {
                console.log(`  No existing values found, will use item input`);
                field.type = 'item-input';
            }
        }

        schema.properties.push(field);
    }

    return schema;
}

/**
 * Process item data from SPARQL results
 */
function processItemData(itemData, labelDescResults) {
    const processed = {
        label: '',
        description: '',
        properties: {}
    };

    // Get label and description
    if (labelDescResults.length > 0) {
        processed.label = labelDescResults[0].label?.value || '';
        processed.description = labelDescResults[0].description?.value || '';
    }

    // Group property values
    itemData.forEach(row => {
        const propertyId = row.property.value.split('/').pop();
        const datatype = row.datatype.value.split('#').pop();

        if (!processed.properties[propertyId]) {
            processed.properties[propertyId] = [];
        }

        let value;
        if (datatype === 'WikibaseItem') {
            // Item reference
            value = {
                id: row.value.value.split('/').pop(),
                label: row.valueLabel?.value
            };
        } else {
            // Literal value
            value = row.value.value;
        }

        processed.properties[propertyId].push(value);
    });

    return processed;
}

/**
 * Find exemplar ID by Instance Of value
 */
function findExemplarByInstanceOf(instanceOfValue) {
    for (const [key, exemplar] of Object.entries(formState.config.exemplars)) {
        if (exemplar.id === instanceOfValue) {
            return exemplar.id;
        }
    }

    // If not found, try to match by querying each exemplar
    // For now, just return first available
    return Object.values(formState.config.exemplars)[0]?.id;
}

/**
 * Map Wikibase datatype to input type
 */
function mapDatatypeToInputType(datatype) {
    const typeMap = {
        'String': 'text',
        'Url': 'url',
        'Quantity': 'number',
        'Time': 'date',
        'GlobeCoordinate': 'coordinates',
        'WikibaseItem': 'item-input',
        'Monolingualtext': 'text',
        'ExternalId': 'text'
    };

    return typeMap[datatype] || 'text';
}

/**
 * Update page title
 */
function updatePageTitle(title) {
    document.title = title + ' - Timna Database';
    const headerTitle = document.querySelector('header h1');
    if (headerTitle) {
        headerTitle.textContent = title;
    }
}

/**
 * Show loading message
 */
function showLoadingMessage(message) {
    const container = document.getElementById('form-container');
    if (container) {
        container.innerHTML = `
            <div class="field-loader">
                <div class="spinner spinner-large"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.getElementById('form-container');
    if (container) {
        container.innerHTML = `
            <div class="error-box">
                <p><strong>Error:</strong> ${message}</p>
                <p><a href="/src/index.html">Return to Main Menu</a></p>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initFormGenerator);
