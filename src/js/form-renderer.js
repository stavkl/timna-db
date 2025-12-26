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
    html += '<a href="https://github.com/stavkl/timna-db/issues/new" target="_blank" class="btn btn-secondary" style="background-color: #10b981; color: white; border-color: #10b981;"><img src="https://github.com/favicon.ico" alt="GitHub" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 0.5rem;">Report an Issue</a>';
    html += '</div>';

    container.innerHTML = html;

    // Attach event listeners for item inputs
    attachItemInputListeners();

    // Initialize qualifiers for existing data in edit mode
    if (currentData) {
        initializeExistingQualifiers(currentData);
    }
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

    // DEBUG: Log which field is being rendered
    console.log(`Rendering field: ${field.id} (${field.label}), has qualifiers: ${!!(field.qualifiers && field.qualifiers.length > 0)}`);
    if (currentData && currentData.properties && currentData.properties[field.id]) {
        console.log(`  Existing data for ${field.id}:`, currentData.properties[field.id]);
    }

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
        console.log(`  renderSimpleField for ${field.id}: propData =`, propData);
        if (propData) {
            if (field.type === 'multiselect') {
                currentValues = propData.map(v => v.value || v);
                console.log(`    multiselect: extracted ${currentValues.length} values`);
            } else if (Array.isArray(propData) && propData.length > 0) {
                // propData is array of {value, qualifiers, statementId}
                const firstItem = propData[0];
                currentValue = typeof firstItem === 'object' && firstItem.value
                    ? (typeof firstItem.value === 'object' ? firstItem.value.id : firstItem.value)
                    : firstItem;
                console.log(`    Got first value: ${currentValue}`);
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

    // Get existing values from currentData
    const existingValues = currentData?.properties?.[field.id] || [];
    console.log(`  renderRepeatableFieldWithQualifiers for ${field.id}: found ${existingValues.length} existing values`, existingValues);

    if (existingValues.length > 0) {
        // Render each existing value with its qualifiers
        existingValues.forEach((valueData, index) => {
            console.log(`    Rendering value ${index}:`, valueData);
            html += renderValueWithQualifiers(field, index, valueData);
        });
    } else {
        // Show one empty value section if no existing data
        console.log(`    No existing values, showing empty section`);
        html += renderValueWithQualifiers(field, 0, null);
    }

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
    const statementId = valueData?.statementId || '';  // Get statement ID if exists

    let html = `
        <div id="${sectionId}" class="value-section" style="padding: 1rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb;" data-field-id="${field.id}" data-index="${index}" data-statement-id="${statementId}">
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
        // Extract ID from value (could be string ID or {id, label} object)
        const currentValueId = typeof currentValue === 'object' ? currentValue.id : currentValue;

        const options = field.values.map(v => {
            const selected = currentValueId === v.id ? 'selected' : '';
            return `<option value="${v.id}" ${selected}>${v.label} (${v.id})</option>`;
        }).join('');

        inputHTML = `
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <select id="${uniqueId}-value" name="${uniqueId}-value" class="main-value-select" onchange="updateQualifiers('${field.id}', ${JSON.stringify(field).replace(/"/g, '&quot;')}, '${uniqueId}')" style="flex: 1;">
                    <option value="">-- Select --</option>
                    ${options}
                </select>
                <button type="button" onclick="clearSelection('${uniqueId}-value', '${field.id}', '${uniqueId}')" class="btn btn-text" style="padding: 0.25rem 0.5rem; color: #dc2626;" title="Clear selection">×</button>
            </div>
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
function updateQualifiers(fieldId, fieldData, uniqueId, existingQualifiers = null) {
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
    // First try direct match (specific value ID)
    let qualifierIds = field.qualifierMap[selectedValue];

    // If no direct match, try to find by Instance Of type
    // Look for the selectedValue in field.values and get its Instance Of from there
    if (!qualifierIds || qualifierIds.size === 0) {
        // Find the selected value in the field's values to get its Instance Of type
        const selectedValueObj = field.values?.find(v => v.id === selectedValue);

        // Note: field.values doesn't have Instance Of info currently
        // So we need to check all keys in qualifierMap to see if any match
        // This works because the map now uses Instance Of types as keys
        for (const [mapKey, quals] of Object.entries(field.qualifierMap)) {
            // mapKey is now the Instance Of type (e.g., Q1009)
            // We need to check if selectedValue is an instance of mapKey
            // For now, we'll just try all qualifier sets until we find one
            if (quals && quals.size > 0) {
                qualifierIds = quals;
                console.log(`Using qualifiers from map key: ${mapKey} for value ${selectedValue}`);
                break; // Use the first non-empty qualifier set
            }
        }
    }

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

        // Get existing value for this qualifier if available
        const existingValue = existingQualifiers?.[qualifierId]?.value || '';
        const existingValueId = typeof existingValue === 'object' ? existingValue.id : existingValue;

        let qualifierInput = '';

        // Render qualifier input based on type
        if (qualifier.datatype === 'WikibaseItem' && qualifier.values && qualifier.values.length > 0) {
            // Dropdown for WikibaseItem qualifiers
            const options = qualifier.values.map(v => {
                const selected = existingValueId === v.id ? 'selected' : '';
                return `<option value="${v.id}" ${selected}>${v.label} (${v.id})</option>`;
            }).join('');

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

            qualifierInput = `<input type="${inputType}" id="${qualifierFieldId}" name="${qualifierFieldId}" placeholder="${qualifier.label}" value="${existingValueId}" style="font-size: 0.875rem; width: 100%;">`;
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
 * Initialize qualifiers for existing data after form is rendered
 */
function initializeExistingQualifiers(currentData) {
    console.log('=== INITIALIZING EXISTING QUALIFIERS ===');
    if (!currentData || !currentData.properties) {
        console.log('No currentData or properties');
        return;
    }

    // For each property that has values with qualifiers
    for (const [propertyId, values] of Object.entries(currentData.properties)) {
        console.log(`Checking property ${propertyId} for qualifiers...`);

        // Find the field in schema
        const field = formState.schema.properties.find(f => f.id === propertyId);
        if (!field) {
            console.log(`  Field ${propertyId} not found in schema`);
            continue;
        }

        if (!field.qualifiers || field.qualifiers.length === 0) {
            console.log(`  Field ${propertyId} has no qualifiers in schema`);
            continue;
        }

        console.log(`  Field ${propertyId} has ${field.qualifiers.length} qualifiers, ${values.length} values`);

        // For each value, trigger qualifier update with existing qualifier data
        values.forEach((valueData, index) => {
            const uniqueId = `${propertyId}-${index}`;
            const valueElement = document.getElementById(`${uniqueId}-value`);

            console.log(`  Value ${index}: uniqueId=${uniqueId}, element exists=${!!valueElement}, has value=${!!valueElement?.value}`);
            if (valueData.qualifiers) {
                console.log(`    Existing qualifiers:`, valueData.qualifiers);
            }

            // Only initialize if the element exists and has a value
            if (valueElement && valueElement.value) {
                console.log(`    Calling updateQualifiers for ${uniqueId}`);
                updateQualifiers(propertyId, field, uniqueId, valueData.qualifiers);
            } else {
                console.log(`    Skipping - element not ready or no value`);
            }
        });
    }
    console.log('=== END QUALIFIER INITIALIZATION ===');
}

/**
 * Clear selection from a dropdown
 */
function clearSelection(selectId, fieldId, uniqueId) {
    const select = document.getElementById(selectId);
    if (select) {
        select.value = '';
        // Trigger change event to update qualifiers
        updateQualifiers(fieldId, null, uniqueId);
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
        // Hook: Custom validation
        if (formState.formHandler && formState.formHandler.validateForm) {
            const validation = formState.formHandler.validateForm(e.target);
            if (!validation.valid) {
                throw new Error(validation.errors.join('\n'));
            }
        }

        // Collect form data
        let formData = collectFormData();

        // Hook: Transform form data
        if (formState.formHandler && formState.formHandler.transformFormData) {
            formData = formState.formHandler.transformFormData(formData);
        }

        console.log('Submitting form data:', formData);

        // Build Wikibase entity data
        let entityData = buildEntityData(formData);

        // Hook: Customize entity data
        if (formState.formHandler && formState.formHandler.customizeEntityData) {
            entityData = formState.formHandler.customizeEntityData(entityData, formData);
        }

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
                const statementId = section.getAttribute('data-statement-id');  // Get existing statement ID

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

                // Add this value with its qualifiers and statement ID (for updates)
                valuesWithQualifiers.push({
                    value: mainValue,
                    qualifiers: Object.keys(qualifiers).length > 0 ? qualifiers : null,
                    statementId: (statementId && statementId.trim()) ? statementId.trim() : null  // Include statement ID if editing existing statement
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

    // Add Instance Of claim
    // In CREATE mode: Use the instanceOfValue from form state (set automatically)
    // In EDIT mode: Instance Of should be in formData.properties (shown in form now)
    //               BUT if not present (shouldn't happen), preserve the original value
    if (formState.mode === 'create' && formState.instanceOfValue) {
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
    } else if (formState.mode === 'edit' && !formData.properties[formState.config.properties.instanceOf] && formState.instanceOfValue) {
        // Fallback: If Instance Of not in form data (shouldn't happen), preserve original value
        console.warn('Instance Of not in form data, preserving original value:', formState.instanceOfValue);
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
    // Otherwise, Instance Of should be processed from formData.properties below

    // Add property claims
    for (const [propertyId, propertyData] of Object.entries(formData.properties)) {
        const field = formState.schema.properties.find(f => f.id === propertyId);
        if (!field) continue;

        let claims = [];

        // Check if this is an array of values with qualifiers (new repeatable structure)
        if (Array.isArray(propertyData) && propertyData.length > 0 && typeof propertyData[0] === 'object' && propertyData[0].value !== undefined) {
            // Multiple values with qualifiers
            for (const valueWithQualifiers of propertyData) {
                const claim = buildClaimForProperty(propertyId, valueWithQualifiers.value, field.datatype, valueWithQualifiers.qualifiers, valueWithQualifiers.statementId);
                if (claim && claim.length > 0) {
                    claims.push(...claim);
                }
            }
        } else {
            // Old structure: simple value or array of values
            const claim = buildClaimForProperty(propertyId, propertyData, field.datatype, null, null);
            if (claim) {
                claims = claim;
            }
        }

        if (claims.length > 0) {
            entity.claims[propertyId] = claims;
        }
    }

    console.log('Form data properties:', Object.keys(formData.properties));
    console.log('Instance Of property ID:', formState.config.properties.instanceOf);
    console.log('Instance Of in form data?', formData.properties[formState.config.properties.instanceOf]);
    console.log('Built entity data for submission:', JSON.stringify(entity, null, 2));
    return entity;
}

/**
 * Build claim structure for a property
 */
function buildClaimForProperty(propertyId, value, datatype, qualifiers = null, statementId = null) {
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

            case 'Monolingualtext':
                datavalue = {
                    value: {
                        text: val,
                        language: 'en'
                    },
                    type: 'monolingualtext'
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

        // NOTE: We don't include statement IDs in the claim structure
        // Instead, we use clear=true on the server to replace all claims
        // This prevents "Statement GUID can not be parsed" errors
        // The statementId parameter is kept for future reference but not used
        if (statementId) {
            console.log(`Statement ID available but not used (clear=true mode): ${statementId} for property ${propertyId}`);
        }

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

        case 'Monolingualtext':
            return {
                value: {
                    text: value,
                    language: 'en'
                },
                type: 'monolingualtext'
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

        // Check if session expired
        if (response.status === 401) {
            if (confirm('Your session has expired. Would you like to return to the login page?')) {
                // Clear expired session
                localStorage.removeItem('sessionId');
                localStorage.removeItem('username');
                window.location.href = '/src/index.html';
            }
        }

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
                <a href="https://github.com/stavkl/timna-db/issues/new" target="_blank" class="btn btn-secondary" style="background-color: #10b981; color: white; border-color: #10b981;"><img src="https://github.com/favicon.ico" alt="GitHub" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 0.5rem;">Report an Issue</a>
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
