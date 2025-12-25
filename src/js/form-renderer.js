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
 * Counter for unique field IDs
 */
let fieldCounter = 0;

/**
 * Render a single field
 */
function renderField(field, currentData) {
    const requiredMark = field.required ? ' *' : '';
    const propertyBadge = field.id.startsWith('P')
        ? `<span class="property-badge">${field.id}</span>`
        : '';

    // Special handling for basic fields (label, description)
    if (field.isSpecial) {
        const currentValue = currentData ? (currentData[field.id] || '') : '';
        const required = field.required ? 'required' : '';
        let inputHTML = '';

        if (field.type === 'textarea') {
            inputHTML = `<textarea id="${field.id}" name="${field.id}" rows="3" ${required}>${currentValue}</textarea>`;
        } else {
            inputHTML = `<input type="text" id="${field.id}" name="${field.id}" ${required} value="${currentValue}">`;
        }

        return `
            <div class="field">
                <label for="${field.id}">${field.label}${requiredMark}</label>
                ${inputHTML}
            </div>
        `;
    }

    // For properties with qualifiers, render as repeatable sections
    if (field.qualifiers && field.qualifiers.length > 0) {
        return renderRepeatableFieldWithQualifiers(field, currentData);
    }

    // For properties without qualifiers, use existing logic
    return renderSimpleField(field, currentData);
}

/**
 * Render a simple field without qualifiers
 */
function renderSimpleField(field, currentData) {
    const required = field.required ? 'required' : '';
    const requiredMark = field.required ? ' *' : '';
    const propertyBadge = field.id.startsWith('P')
        ? `<span class="property-badge">${field.id}</span>`
        : '';

    // Get current value(s) if in edit mode
    let currentValue = null;
    let currentValues = [];

    if (currentData) {
        const propData = currentData.properties[field.id];
        if (propData) {
            if (field.type === 'multiselect') {
                currentValues = propData.map(v => v.id);
            } else if (propData.length > 0) {
                currentValue = typeof propData[0] === 'object' ? propData[0].id : propData[0];
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

    return `
        <div class="field">
            <label for="${field.id}">${field.label}${requiredMark} ${propertyBadge}</label>
            ${inputHTML}
            ${field.description ? `<small>${field.description}</small>` : ''}
        </div>
    `;
}

/**
 * Render a repeatable field with conditional qualifiers
 */
function renderRepeatableFieldWithQualifiers(field, currentData) {
    const propertyBadge = `<span class="property-badge">${field.id}</span>`;
    const containerId = `${field.id}-container`;

    let html = `
        <div class="field repeatable-field">
            <label>${field.label} ${propertyBadge}</label>
            ${field.description ? `<small>${field.description}</small>` : ''}
            <div id="${containerId}" class="repeatable-values" style="margin-top: 0.5rem;">
    `;

    // TODO: Add existing values from currentData
    // For now, show one empty value section
    html += renderValueWithQualifiers(field, 0, null);

    html += `
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addValueSection('${field.id}')" style="margin-top: 0.5rem;">
                + Add Another ${field.label}
            </button>
        </div>
    `;

    return html;
}

/**
 * Render a single value with its conditional qualifiers
 */
function renderValueWithQualifiers(field, index, valueData) {
    const uniqueId = `${field.id}-${index}`;
    const sectionId = `${uniqueId}-section`;

    let html = `
        <div id="${sectionId}" class="value-section" style="padding: 1rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb;" data-field-id="${field.id}" data-index="${index}">
    `;

    // Render main value input
    html += renderMainValueInput(field, uniqueId, valueData);

    // Render qualifiers container (will be populated dynamically based on selected value)
    html += `<div id="${uniqueId}-qualifiers" class="qualifiers-container" style="margin-top: 1rem;"></div>`;

    // Remove button (only show if index > 0)
    if (index > 0) {
        html += `
            <button type="button" class="btn btn-text btn-sm" onclick="removeValueSection('${sectionId}')" style="margin-top: 0.5rem; color: #dc2626;">
                Remove
            </button>
        `;
    }

    html += `</div>`;

    return html;
}

/**
 * Render the main value input for a property
 */
function renderMainValueInput(field, uniqueId, valueData) {
    const currentValue = valueData?.value || '';

    let inputHTML = '';

    if (field.type === 'multiselect' || (field.values && field.values.length > 0)) {
        // Dropdown for WikibaseItem properties
        const options = field.values.map(v => {
            const selected = currentValue === v.id ? 'selected' : '';
            return `<option value="${v.id}" ${selected}>${v.label} (${v.id})</option>`;
        }).join('');

        inputHTML = `
            <select id="${uniqueId}-value" name="${uniqueId}-value" class="main-value-select" onchange="updateQualifiers('${field.id}', ${JSON.stringify(field).replace(/"/g, '&quot;')}, '${uniqueId}')" style="width: 100%;">
                <option value="">-- Select --</option>
                ${options}
            </select>
        `;
    } else if (field.type === 'coordinates') {
        const lat = valueData?.latitude || '';
        const lon = valueData?.longitude || '';
        inputHTML = `
            <div class="field-group">
                <input type="number" id="${uniqueId}-lat" step="0.000001" placeholder="Latitude" value="${lat}" onchange="updateQualifiers('${field.id}', ${JSON.stringify(field).replace(/"/g, '&quot;')}, '${uniqueId}')">
                <input type="number" id="${uniqueId}-lon" step="0.000001" placeholder="Longitude" value="${lon}">
            </div>
        `;
    } else {
        // Text/number/date inputs
        const inputType = field.type || 'text';
        inputHTML = `<input type="${inputType}" id="${uniqueId}-value" name="${uniqueId}-value" value="${currentValue}" onchange="updateQualifiers('${field.id}', ${JSON.stringify(field).replace(/"/g, '&quot;')}, '${uniqueId}')" style="width: 100%;">`;
    }

    return `
        <div class="field" style="margin-bottom: 0;">
            <label for="${uniqueId}-value">Value</label>
            ${inputHTML}
        </div>
    `;
}

/**
 * Add a new value section for a repeatable field
 */
function addValueSection(fieldId) {
    // Get field from schema
    const field = formState.schema.properties.find(f => f.id === fieldId);
    if (!field) return;

    // Get container
    const container = document.getElementById(`${fieldId}-container`);
    if (!container) return;

    // Find next index
    const existingSections = container.querySelectorAll('.value-section');
    const nextIndex = existingSections.length;

    // Render new section
    const newSection = renderValueWithQualifiers(field, nextIndex, null);

    // Add to container
    container.insertAdjacentHTML('beforeend', newSection);
}

/**
 * Remove a value section
 */
function removeValueSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.remove();
    }
}

/**
 * Update qualifiers based on selected value
 */
function updateQualifiers(fieldId, fieldData, uniqueId) {
    // Get the selected value
    const valueElement = document.getElementById(`${uniqueId}-value`);
    if (!valueElement) return;

    const selectedValue = valueElement.value;
    if (!selectedValue) {
        // Clear qualifiers if no value selected
        const qualifiersContainer = document.getElementById(`${uniqueId}-qualifiers`);
        if (qualifiersContainer) {
            qualifiersContainer.innerHTML = '';
        }
        return;
    }

    // Get field from schema (fieldData might be escaped HTML)
    const field = formState.schema.properties.find(f => f.id === fieldId);
    if (!field || !field.qualifierMap) return;

    // Get qualifiers for this value
    const qualifierIds = field.qualifierMap[selectedValue];
    if (!qualifierIds || qualifierIds.size === 0) {
        // No qualifiers for this value
        const qualifiersContainer = document.getElementById(`${uniqueId}-qualifiers`);
        if (qualifiersContainer) {
            qualifiersContainer.innerHTML = '';
        }
        return;
    }

    // Build qualifiers HTML
    let html = '<div style="padding-left: 1rem; border-left: 3px solid #e5e7eb; margin-top: 0.5rem;">';
    html += '<div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Qualifiers for this value:</div>';

    for (const qualifierId of qualifierIds) {
        const qualifier = field.qualifiers.find(q => q.id === qualifierId);
        if (!qualifier) continue;

        const qualifierFieldId = `${uniqueId}-qualifier-${qualifierId}`;
        const qualifierBadge = `<span class="property-badge" style="font-size: 0.75rem;">${qualifierId}</span>`;

        let qualifierInput = '';

        // Render qualifier input based on type
        if (qualifier.datatype === 'WikibaseItem' && qualifier.values && qualifier.values.length > 0) {
            // Dropdown for WikibaseItem qualifiers
            const options = qualifier.values.map(v =>
                `<option value="${v.id}">${v.label} (${v.id})</option>`
            ).join('');

            qualifierInput = `
                <select id="${qualifierFieldId}" name="${qualifierFieldId}" style="font-size: 0.875rem; width: 100%;">
                    <option value="">-- Select --</option>
                    ${options}
                </select>
            `;
        } else {
            // Text/number/date inputs
            const inputType = qualifier.datatype === 'Quantity' ? 'number' :
                            qualifier.datatype === 'Time' ? 'date' :
                            qualifier.datatype === 'Url' ? 'url' : 'text';

            qualifierInput = `<input type="${inputType}" id="${qualifierFieldId}" name="${qualifierFieldId}" placeholder="${qualifier.label}" style="font-size: 0.875rem; width: 100%;">`;
        }

        html += `
            <div class="field" style="margin-bottom: 0.75rem;">
                <label for="${qualifierFieldId}" style="font-size: 0.875rem; font-weight: normal;">${qualifier.label} ${qualifierBadge}</label>
                ${qualifierInput}
            </div>
        `;
    }

    html += '</div>';

    // Update qualifiers container
    const qualifiersContainer = document.getElementById(`${uniqueId}-qualifiers`);
    if (qualifiersContainer) {
        qualifiersContainer.innerHTML = html;
    }
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
        // Check if this is a repeatable field with qualifiers
        if (field.qualifiers && field.qualifiers.length > 0) {
            // Collect multiple values with their qualifiers
            const container = document.getElementById(`${field.id}-container`);
            if (!container) return;

            const valueSections = container.querySelectorAll('.value-section');
            const valuesWithQualifiers = [];

            valueSections.forEach(section => {
                const index = section.getAttribute('data-index');
                const uniqueId = `${field.id}-${index}`;

                // Get main value
                let mainValue = null;
                const valueElement = document.getElementById(`${uniqueId}-value`);

                if (field.type === 'coordinates') {
                    const lat = document.getElementById(`${uniqueId}-lat`)?.value;
                    const lon = document.getElementById(`${uniqueId}-lon`)?.value;
                    if (lat && lon) {
                        mainValue = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
                    }
                } else if (valueElement) {
                    mainValue = valueElement.value;
                }

                if (!mainValue) return;

                // Collect qualifiers for this value
                const qualifiers = {};
                field.qualifiers.forEach(qualifier => {
                    const qualifierFieldId = `${uniqueId}-qualifier-${qualifier.id}`;
                    const qualifierElement = document.getElementById(qualifierFieldId);
                    if (qualifierElement && qualifierElement.value) {
                        qualifiers[qualifier.id] = {
                            value: qualifierElement.value,
                            datatype: qualifier.datatype
                        };
                    }
                });

                // Add this value with its qualifiers
                valuesWithQualifiers.push({
                    value: mainValue,
                    qualifiers: Object.keys(qualifiers).length > 0 ? qualifiers : null
                });
            });

            if (valuesWithQualifiers.length > 0) {
                data.properties[field.id] = valuesWithQualifiers;
            }
        } else {
            // Simple field without qualifiers (original logic)
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

        let claims = [];

        // Check if this is an array of values with qualifiers (new repeatable structure)
        if (Array.isArray(propertyData) && propertyData.length > 0 && typeof propertyData[0] === 'object' && propertyData[0].value !== undefined) {
            // Multiple values with qualifiers
            for (const valueWithQualifiers of propertyData) {
                const claim = buildClaimForProperty(propertyId, valueWithQualifiers.value, field.datatype, valueWithQualifiers.qualifiers);
                if (claim && claim.length > 0) {
                    claims.push(...claim);
                }
            }
        } else {
            // Old structure: simple value or array of values
            const claim = buildClaimForProperty(propertyId, propertyData, field.datatype, null);
            if (claim) {
                claims = claim;
            }
        }

        if (claims.length > 0) {
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
