/**
 * Form Renderer Module
 * Handles rendering and submission of generated forms
 */

/**
 * Render the form with schema and optional current data
 */
function renderForm(currentData = null) {
    const container = document.getElementById('form-container');
    if (!container || !formState.schema) return;

    let html = '';

    // Basic fields section
    html += '<div class="form-section">';
    html += '<h2>Basic Information</h2>';

    formState.schema.basic.forEach(field => {
        html += renderField(field, currentData);
    });

    html += '</div>';

    // Property fields section
    if (formState.schema.properties.length > 0) {
        html += '<div class="form-section">';
        html += '<h2>Properties</h2>';

        formState.schema.properties.forEach(field => {
            html += renderField(field, currentData);
        });

        html += '</div>';
    }

    // Form actions
    html += '<div class="form-actions">';
    if (formState.mode === 'create') {
        html += '<button type="submit" class="btn btn-primary">Create Item</button>';
    } else {
        html += '<button type="submit" class="btn btn-primary">Update Item</button>';
    }
    html += '<a href="/src/index.html" class="btn btn-secondary">Cancel</a>';
    html += '</div>';

    container.innerHTML = html;

    // Attach event listeners for item inputs
    attachItemInputListeners();
}

/**
 * Render a single field
 */
function renderField(field, currentData) {
    const required = field.required ? 'required' : '';
    const requiredMark = field.required ? ' *' : '';
    const propertyBadge = field.id.startsWith('P')
        ? `<span class="property-badge">${field.id}</span>`
        : '';

    // Get current value(s) if in edit mode
    let currentValue = null;
    let currentValues = [];

    if (currentData) {
        if (field.isSpecial) {
            currentValue = currentData[field.id] || '';
        } else {
            const propData = currentData.properties[field.id];
            if (propData) {
                if (field.type === 'multiselect') {
                    currentValues = propData.map(v => v.id);
                } else if (propData.length > 0) {
                    currentValue = typeof propData[0] === 'object' ? propData[0].id : propData[0];
                }
            }
        }
    }

    let inputHTML = '';

    switch (field.type) {
        case 'text':
            inputHTML = `<input type="text" id="${field.id}" name="${field.id}" ${required} value="${currentValue || ''}">`;
            break;

        case 'textarea':
            inputHTML = `<textarea id="${field.id}" name="${field.id}" rows="3" ${required}>${currentValue || ''}</textarea>`;
            break;

        case 'number':
            inputHTML = `<input type="number" id="${field.id}" name="${field.id}" step="any" ${required} value="${currentValue || ''}">`;
            break;

        case 'url':
            inputHTML = `<input type="url" id="${field.id}" name="${field.id}" ${required} value="${currentValue || ''}">`;
            break;

        case 'date':
            inputHTML = `<input type="date" id="${field.id}" name="${field.id}" ${required} value="${currentValue || ''}">`;
            break;

        case 'coordinates':
            const coords = currentValue ? currentValue.split(',') : ['', ''];
            inputHTML = `
                <div class="field-group">
                    <input type="number" id="${field.id}-lat" step="0.000001" placeholder="Latitude" ${required} value="${coords[0]}">
                    <input type="number" id="${field.id}-lon" step="0.000001" placeholder="Longitude" ${required} value="${coords[1]}">
                </div>
            `;
            break;

        case 'multiselect':
            // Multi-select dropdown with existing values pre-selected
            const options = field.values.map(v => {
                const selected = currentValues.includes(v.id) ? 'selected' : '';
                return `<option value="${v.id}" ${selected}>${v.label} (${v.id})</option>`;
            }).join('');

            inputHTML = `
                <select id="${field.id}" name="${field.id}" multiple size="8">
                    ${options}
                </select>
                <small style="color: #059669;">
                    ✓ ${field.values.length} existing value(s) available.
                    Hold Ctrl (Cmd on Mac) to select multiple.
                </small>
                <div style="margin-top: 0.5rem;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addCustomValue('${field.id}')">
                        Add New Value (Q number)
                    </button>
                    <input type="text" id="${field.id}-custom" placeholder="Q123" style="display:none; margin-top:0.5rem;">
                </div>
            `;
            break;

        case 'item-input':
            // Direct item ID input
            inputHTML = `
                <input type="text" id="${field.id}" name="${field.id}" placeholder="Enter item ID (e.g., Q123)" ${required} value="${currentValue || ''}">
                <small>Enter the Q number of an existing item</small>
            `;
            break;

        default:
            inputHTML = `<input type="text" id="${field.id}" name="${field.id}" ${required} value="${currentValue || ''}">`;
    }

    // Render qualifiers if present
    let qualifiersHTML = '';
    if (field.qualifiers && field.qualifiers.length > 0) {
        qualifiersHTML = '<div class="qualifiers-section" style="margin-left: 1.5rem; margin-top: 1rem; padding-left: 1rem; border-left: 3px solid #e5e7eb;">';
        qualifiersHTML += '<div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Qualifiers:</div>';

        field.qualifiers.forEach(qualifier => {
            const qualifierId = `${field.id}-qualifier-${qualifier.id}`;
            const qualifierBadge = `<span class="property-badge" style="font-size: 0.75rem;">${qualifier.id}</span>`;

            let qualifierInputHTML = '';
            const qualifierInputType = mapDatatypeToInputType(qualifier.datatype);

            switch (qualifierInputType) {
                case 'text':
                    qualifierInputHTML = `<input type="text" id="${qualifierId}" name="${qualifierId}" placeholder="${qualifier.label}" style="font-size: 0.875rem;">`;
                    break;
                case 'number':
                    qualifierInputHTML = `<input type="number" id="${qualifierId}" name="${qualifierId}" step="any" placeholder="${qualifier.label}" style="font-size: 0.875rem;">`;
                    break;
                case 'url':
                    qualifierInputHTML = `<input type="url" id="${qualifierId}" name="${qualifierId}" placeholder="${qualifier.label}" style="font-size: 0.875rem;">`;
                    break;
                case 'date':
                    qualifierInputHTML = `<input type="date" id="${qualifierId}" name="${qualifierId}" style="font-size: 0.875rem;">`;
                    break;
                default:
                    qualifierInputHTML = `<input type="text" id="${qualifierId}" name="${qualifierId}" placeholder="${qualifier.label}" style="font-size: 0.875rem;">`;
            }

            qualifiersHTML += `
                <div class="field" style="margin-bottom: 0.75rem;">
                    <label for="${qualifierId}" style="font-size: 0.875rem; font-weight: normal;">${qualifier.label} ${qualifierBadge}</label>
                    ${qualifierInputHTML}
                </div>
            `;
        });

        qualifiersHTML += '</div>';
    }

    return `
        <div class="field">
            <label for="${field.id}">${field.label}${requiredMark} ${propertyBadge}</label>
            ${inputHTML}
            ${field.description ? `<small>${field.description}</small>` : ''}
            ${qualifiersHTML}
        </div>
    `;
}

/**
 * Add custom value to multi-select
 */
async function addCustomValue(fieldId) {
    const customInput = document.getElementById(`${fieldId}-custom`);
    const select = document.getElementById(fieldId);

    if (customInput.style.display === 'none') {
        customInput.style.display = 'block';
        customInput.focus();
        return;
    }

    const value = customInput.value.trim();
    if (!value || !/^Q\d+$/i.test(value)) {
        alert('Please enter a valid Q number (e.g., Q123)');
        return;
    }

    const qNumber = value.toUpperCase();

    // Check if already exists
    const existingOption = Array.from(select.options).find(opt => opt.value === qNumber);
    if (existingOption) {
        existingOption.selected = true;
        customInput.value = '';
        customInput.style.display = 'none';
        return;
    }

    // Fetch label from Wikibase
    let label = qNumber;
    try {
        const labelQuery = `
            PREFIX wd: <${formState.config.wikibase.url}/entity/>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

            SELECT ?label
            WHERE {
                wd:${qNumber} rdfs:label ?label .
                FILTER(LANG(?label) = "en")
            }
            LIMIT 1
        `;

        const results = await executeSparqlQuery(
            formState.config.wikibase.sparqlEndpoint,
            labelQuery
        );

        if (results.length > 0) {
            label = results[0].label.value;
        } else {
            // Item exists but has no English label
            label = qNumber;
            console.warn(`No English label found for ${qNumber}`);
        }
    } catch (error) {
        console.error('Error fetching label:', error);
        // Fall back to Q number if query fails
        label = qNumber;
    }

    // Add new option with label
    const option = document.createElement('option');
    option.value = qNumber;
    option.text = `${label} (${qNumber})`;
    option.selected = true;
    select.appendChild(option);

    customInput.value = '';
    customInput.style.display = 'none';
}

/**
 * Attach event listeners for item inputs
 */
function attachItemInputListeners() {
    // Any additional listeners needed
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> ' +
        (formState.mode === 'create' ? 'Creating...' : 'Updating...');

    try {
        // Collect form data
        const formData = collectFormData();

        console.log('Submitting form data:', formData);

        // Build Wikibase entity data
        const entityData = buildEntityData(formData);

        // Submit to server
        const result = await submitEntityData(entityData);

        // Show success message
        showSuccessMessage(result);

    } catch (error) {
        console.error('Form submission error:', error);
        alert('Failed to submit form: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Collect form data
 */
function collectFormData() {
    const data = {
        label: document.getElementById('label')?.value || '',
        description: document.getElementById('description')?.value || '',
        properties: {}
    };

    formState.schema.properties.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element) return;

        let value = null;

        if (field.type === 'multiselect') {
            // Get selected options
            const selected = Array.from(element.selectedOptions).map(opt => opt.value);
            if (selected.length > 0) {
                value = selected;
            }
        } else if (field.type === 'coordinates') {
            const lat = document.getElementById(`${field.id}-lat`)?.value;
            const lon = document.getElementById(`${field.id}-lon`)?.value;
            if (lat && lon) {
                value = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
            }
        } else {
            value = element.value;
        }

        if (value) {
            data.properties[field.id] = value;

            // Collect qualifiers for this property
            if (field.qualifiers && field.qualifiers.length > 0) {
                const qualifiers = {};
                field.qualifiers.forEach(qualifier => {
                    const qualifierId = `${field.id}-qualifier-${qualifier.id}`;
                    const qualifierElement = document.getElementById(qualifierId);
                    if (qualifierElement && qualifierElement.value) {
                        qualifiers[qualifier.id] = {
                            value: qualifierElement.value,
                            datatype: qualifier.datatype
                        };
                    }
                });

                if (Object.keys(qualifiers).length > 0) {
                    // Store qualifiers with the property data
                    data.properties[field.id] = {
                        value: value,
                        qualifiers: qualifiers
                    };
                }
            }
        }
    });

    return data;
}

/**
 * Build Wikibase entity data structure
 */
function buildEntityData(formData) {
    const entity = {
        labels: {
            en: { language: 'en', value: formData.label }
        },
        descriptions: {
            en: { language: 'en', value: formData.description }
        },
        claims: {}
    };

    // Add Instance Of claim (only for new items, not updates)
    if (formState.mode === 'create') {
        entity.claims[formState.config.properties.instanceOf] = [{
            mainsnak: {
                snaktype: 'value',
                property: formState.config.properties.instanceOf,
                datavalue: {
                    value: {
                        'entity-type': 'item',
                        'numeric-id': parseInt(formState.instanceOfValue.substring(1)),
                        id: formState.instanceOfValue
                    },
                    type: 'wikibase-entityid'
                }
            },
            type: 'statement',
            rank: 'normal'
        }];
    }

    // Add property claims
    for (const [propertyId, propertyData] of Object.entries(formData.properties)) {
        const field = formState.schema.properties.find(f => f.id === propertyId);
        if (!field) continue;

        // Check if propertyData has qualifiers or is just a value
        let value, qualifiers;
        if (propertyData && typeof propertyData === 'object' && propertyData.value !== undefined) {
            value = propertyData.value;
            qualifiers = propertyData.qualifiers;
        } else {
            value = propertyData;
            qualifiers = null;
        }

        const claims = buildClaimForProperty(propertyId, value, field.datatype, qualifiers);
        if (claims) {
            entity.claims[propertyId] = claims;
        }
    }

    return entity;
}

/**
 * Build claim structure for a property
 */
function buildClaimForProperty(propertyId, value, datatype, qualifiers = null) {
    const claims = [];

    // Handle multi-value properties
    const values = Array.isArray(value) ? value : [value];

    values.forEach(val => {
        if (!val) return;

        let datavalue;

        switch (datatype) {
            case 'WikibaseItem':
                datavalue = {
                    value: {
                        'entity-type': 'item',
                        'numeric-id': parseInt(val.substring(1)),
                        id: val
                    },
                    type: 'wikibase-entityid'
                };
                break;

            case 'String':
            case 'ExternalId':
            case 'Url':
                datavalue = {
                    value: val,
                    type: 'string'
                };
                break;

            case 'Quantity':
                datavalue = {
                    value: {
                        amount: '+' + val,
                        unit: '1'
                    },
                    type: 'quantity'
                };
                break;

            case 'Time':
                datavalue = {
                    value: {
                        time: '+' + val + 'T00:00:00Z',
                        timezone: 0,
                        before: 0,
                        after: 0,
                        precision: 11,
                        calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
                    },
                    type: 'time'
                };
                break;

            case 'GlobeCoordinate':
                datavalue = {
                    value: {
                        latitude: val.latitude,
                        longitude: val.longitude,
                        precision: 0.0001,
                        globe: 'http://www.wikidata.org/entity/Q2'
                    },
                    type: 'globecoordinate'
                };
                break;

            default:
                datavalue = {
                    value: val,
                    type: 'string'
                };
        }

        const claim = {
            mainsnak: {
                snaktype: 'value',
                property: propertyId,
                datavalue: datavalue
            },
            type: 'statement',
            rank: 'normal'
        };

        // Add qualifiers if present
        if (qualifiers && Object.keys(qualifiers).length > 0) {
            claim.qualifiers = {};
            for (const [qualifierId, qualifierData] of Object.entries(qualifiers)) {
                const qualifierDatavalue = buildDatavalueForType(
                    qualifierData.value,
                    qualifierData.datatype
                );
                if (qualifierDatavalue) {
                    claim.qualifiers[qualifierId] = [{
                        snaktype: 'value',
                        property: qualifierId,
                        datavalue: qualifierDatavalue
                    }];
                }
            }
        }

        claims.push(claim);
    });

    return claims.length > 0 ? claims : null;
}

/**
 * Build datavalue structure for a given type
 */
function buildDatavalueForType(value, datatype) {
    switch (datatype) {
        case 'WikibaseItem':
            return {
                value: {
                    'entity-type': 'item',
                    'numeric-id': parseInt(value.substring(1)),
                    id: value
                },
                type: 'wikibase-entityid'
            };

        case 'String':
        case 'ExternalId':
        case 'Url':
            return {
                value: value,
                type: 'string'
            };

        case 'Quantity':
            return {
                value: {
                    amount: '+' + value,
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
                    latitude: value.latitude,
                    longitude: value.longitude,
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
 * Submit entity data to server
 */
async function submitEntityData(entityData) {
    const endpoint = formState.mode === 'create'
        ? '/api/create-entity'
        : `/api/update-entity/${formState.itemId}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionId()
        },
        body: JSON.stringify({ entity: entityData })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit data');
    }

    return await response.json();
}

/**
 * Show success message
 */
function showSuccessMessage(result) {
    const container = document.getElementById('form-container');
    const itemId = result.entity?.id || formState.itemId;
    const itemUrl = `${formState.config.wikibase.url}/wiki/Item:${itemId}`;

    container.innerHTML = `
        <div class="success-box">
            <h3>${formState.mode === 'create' ? 'Item Created Successfully!' : 'Item Updated Successfully!'}</h3>
            <p><strong>Item ID:</strong> <a href="${itemUrl}" target="_blank">${itemId}</a></p>
            <div class="form-actions" style="margin-top: 1.5rem;">
                <a href="${itemUrl}" target="_blank" class="btn btn-primary">View Item</a>
                <a href="/src/index.html" class="btn btn-secondary">Return to Main Menu</a>
                ${formState.mode === 'create' ?
                    `<button onclick="location.reload()" class="btn btn-secondary">Create Another</button>` :
                    ''}
            </div>
        </div>
    `;
}

/**
 * Load configuration
 */
async function loadConfig() {
    const response = await fetch('/config/exemplars.json');
    return await response.json();
}
