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
        formState.exemplarId = await findExemplarByInstanceOf(formState.instanceOfValue);
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

        // DEBUG: Log properties to check what's included
        console.log('=== CURRENT DATA DEBUG ===');
        console.log('Properties in currentData:', Object.keys(formState.currentData.properties));
        for (const [propId, values] of Object.entries(formState.currentData.properties)) {
            console.log(`  ${propId}: ${values.length} value(s)`, values);
        }

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
    console.log(`=== BUILDING SCHEMA FROM ${properties.length} PROPERTIES ===`);
    for (const prop of properties) {
        const propertyId = prop.property.value.split('/').pop();
        const datatype = prop.datatype.value.split('#').pop();
        console.log(`Processing property ${propertyId} (${prop.propertyLabel.value}) - datatype: ${datatype}`);

        // Skip Instance Of property in create mode (set automatically)
        // In edit mode, show it so users can see/modify multiple Instance Of values
        if (propertyId === formState.config.properties.instanceOf && formState.mode === 'create') {
            console.log(`  Skipping ${propertyId} (Instance Of in create mode)`);
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
            console.log(`  Instance Of value: ${instanceOfValue}`);
            const valuesQuery = buildPropertyValuesQuery(formState.config, propertyId, instanceOfValue);
            console.log(`  SPARQL Query:`, valuesQuery);
            const values = await executeSparqlQuery(
                formState.config.wikibase.sparqlEndpoint,
                valuesQuery
            );

            console.log(`  Query returned ${values.length} results`);
            if (values.length > 0) {
                console.log(`  Sample values:`, values.slice(0, 3));
                field.values = values.map(v => ({
                    id: v.value.value.split('/').pop(),
                    label: v.valueLabel.value
                }));
                field.type = 'multiselect';
                field.allowMultiple = true;
                console.log(`  ✓ Set field type to multiselect with ${field.values.length} values`);
            } else {
                console.log(`  ✗ No existing values found, will use item input`);
                field.type = 'item-input';
            }
        }

        // Check for qualifiers on this property
        console.log(`Checking for qualifiers on ${propertyId}...`);
        const qualifiersQuery = buildPropertyQualifiersQuery(formState.config, formState.exemplarId, propertyId);
        const qualifiersResults = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            qualifiersQuery
        );

        if (qualifiersResults.length > 0) {
            console.log(`  Found ${qualifiersResults.length} qualifier mappings`);

            // Build qualifier map: mainValue -> qualifiers
            const qualifierMap = {};
            const allQualifiers = new Map(); // Track all unique qualifiers

            for (const row of qualifiersResults) {
                const mainValueId = row.mainValue.value.includes('/entity/')
                    ? row.mainValue.value.split('/').pop()
                    : row.mainValue.value; // Could be literal value

                const qualifierId = row.qualifier.value.split('/').pop();
                const qualifierDatatype = row.qualifierDatatype.value.split('#').pop();

                // Track unique qualifiers
                if (!allQualifiers.has(qualifierId)) {
                    allQualifiers.set(qualifierId, {
                        id: qualifierId,
                        label: row.qualifierLabel.value,
                        datatype: qualifierDatatype
                    });
                }

                // Map qualifier to main value
                if (!qualifierMap[mainValueId]) {
                    qualifierMap[mainValueId] = new Set();
                }
                qualifierMap[mainValueId].add(qualifierId);
            }

            // For each qualifier, get possible values if it's WikibaseItem type
            const qualifiersWithValues = [];
            for (const [qualifierId, qualifierInfo] of allQualifiers) {
                const enrichedQualifier = { ...qualifierInfo };

                if (qualifierInfo.datatype === 'WikibaseItem') {
                    console.log(`  Fetching values for qualifier ${qualifierId}...`);
                    const valuesQuery = buildQualifierValuesQuery(formState.config, qualifierId, formState.instanceOfValue);
                    const values = await executeSparqlQuery(
                        formState.config.wikibase.sparqlEndpoint,
                        valuesQuery
                    );

                    if (values.length > 0) {
                        enrichedQualifier.values = values.map(v => ({
                            id: v.value.value.split('/').pop(),
                            label: v.valueLabel.value
                        }));
                        console.log(`    Found ${values.length} possible values`);
                    }
                }

                qualifiersWithValues.push(enrichedQualifier);
            }

            // Attach qualifier mapping to field
            field.qualifierMap = qualifierMap;
            field.qualifiers = qualifiersWithValues;
        }

        schema.properties.push(field);
    }

    console.log('=== FINAL SCHEMA ===');
    console.log(`Schema has ${schema.properties.length} properties:`, schema.properties.map(p => `${p.id} (${p.label})`));

    return schema;
}

/**
 * Process item data from SPARQL results with qualifiers
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

    // Group statements by property and statement URI
    const statementMap = new Map();

    itemData.forEach(row => {
        const propertyId = row.property.value.split('/').pop();
        const statementUri = row.statement.value;
        const datatype = row.datatype.value.split('#').pop();

        // Extract statement GUID from URI (format: http://.../entity/statement/Q827-GUID)
        const statementGuid = statementUri.includes('/statement/')
            ? statementUri.split('/statement/').pop()
            : null;

        if (statementGuid) {
            console.log(`Extracted statement GUID: "${statementGuid}" from URI: ${statementUri}`);
        }

        // Create statement entry if doesn't exist
        if (!statementMap.has(statementUri)) {
            let mainValue;
            if (datatype === 'WikibaseItem') {
                mainValue = {
                    id: row.value.value.split('/').pop(),
                    label: row.valueLabel?.value
                };
            } else {
                mainValue = row.value.value;
            }

            statementMap.set(statementUri, {
                propertyId,
                value: mainValue,
                qualifiers: {},
                statementId: statementGuid  // Store the statement GUID for updates
            });
        }

        // Add qualifier if present
        if (row.qualifier) {
            const qualifierId = row.qualifier.value.split('/').pop();
            const qualifierDatatype = row.qualifierDatatype.value.split('#').pop();
            const statement = statementMap.get(statementUri);

            let qualifierValue;
            if (qualifierDatatype === 'WikibaseItem') {
                qualifierValue = {
                    id: row.qualifierValue.value.split('/').pop(),
                    label: row.qualifierValueLabel?.value
                };
            } else {
                qualifierValue = row.qualifierValue.value;
            }

            statement.qualifiers[qualifierId] = {
                value: qualifierValue,
                datatype: qualifierDatatype
            };
        }
    });

    // Group statements by property
    for (const statement of statementMap.values()) {
        if (!processed.properties[statement.propertyId]) {
            processed.properties[statement.propertyId] = [];
        }

        processed.properties[statement.propertyId].push({
            value: statement.value,
            qualifiers: Object.keys(statement.qualifiers).length > 0 ? statement.qualifiers : null,
            statementId: statement.statementId  // Include statement ID for updates
        });
    }

    return processed;
}

/**
 * Find exemplar ID by Instance Of value
 * This queries each exemplar to find which one has the matching Instance Of
 */
async function findExemplarByInstanceOf(instanceOfValue) {
    console.log(`Looking for exemplar with Instance Of: ${instanceOfValue}`);

    // Check each exemplar to see which one has this Instance Of value
    for (const [key, exemplar] of Object.entries(formState.config.exemplars)) {
        try {
            const instanceOfQuery = buildInstanceOfQuery(formState.config, exemplar.id);
            const results = await executeSparqlQuery(
                formState.config.wikibase.sparqlEndpoint,
                instanceOfQuery
            );

            if (results.length > 0) {
                const exemplarInstanceOf = results[0].instanceOf.value.split('/').pop();
                console.log(`  Exemplar ${exemplar.id} (${key}) has Instance Of: ${exemplarInstanceOf}`);

                if (exemplarInstanceOf === instanceOfValue) {
                    console.log(`  ✓ Found matching exemplar: ${exemplar.id} for type ${instanceOfValue}`);
                    return exemplar.id;
                }
            }
        } catch (error) {
            console.warn(`Error checking exemplar ${exemplar.id}:`, error);
        }
    }

    // If no match found, log error
    console.error(`No exemplar found for Instance Of: ${instanceOfValue}`);
    throw new Error(`No exemplar configured for this entity type (${instanceOfValue})`);
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
