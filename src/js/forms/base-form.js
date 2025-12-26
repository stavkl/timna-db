/**
 * Base Form Handler
 * Contains default form generation and processing logic
 * Can be extended by form-specific handlers
 */

class BaseFormHandler {
    constructor(formType, exemplarId) {
        this.formType = formType;
        this.exemplarId = exemplarId;
    }

    /**
     * Hook: Called after schema is built, before rendering
     * Override to customize the schema (add/remove/reorder fields)
     */
    customizeSchema(schema, currentData) {
        // Default: no customization
        return schema;
    }

    /**
     * Hook: Called after SPARQL data is processed
     * Override to customize how existing data is processed
     */
    processExistingData(processedData) {
        // Default: no customization
        return processedData;
    }

    /**
     * Hook: Called when rendering a specific field
     * Return null to use default rendering, or return custom HTML
     */
    renderCustomField(field, currentData) {
        // Default: use standard rendering
        return null;
    }

    /**
     * Hook: Called before form data is collected for submission
     * Override to add custom validation
     */
    validateForm(formElement) {
        // Default: no custom validation
        return { valid: true, errors: [] };
    }

    /**
     * Hook: Called after form data is collected, before building entity data
     * Override to transform the collected data
     */
    transformFormData(formData) {
        // Default: no transformation
        return formData;
    }

    /**
     * Hook: Called after entity data is built, before submission
     * Override to customize the entity structure
     */
    customizeEntityData(entityData, formData) {
        // Default: no customization
        return entityData;
    }

    /**
     * Hook: Determine if a property should be shown in the form
     * Override to hide specific properties
     */
    shouldShowProperty(propertyId, mode) {
        // Default: show all properties
        return true;
    }

    /**
     * Hook: Determine if a property should be required
     * Override to make specific properties required
     */
    isPropertyRequired(propertyId) {
        // Default: use property's own required setting
        return null; // null means use default
    }

    /**
     * Hook: Get custom field ordering
     * Return array of property IDs in desired order, or null for default
     */
    getFieldOrder() {
        // Default: use order from exemplar
        return null;
    }

    /**
     * Hook: Get custom label for a field
     * Return custom label or null to use default
     */
    getCustomFieldLabel(propertyId, defaultLabel) {
        // Default: use default label
        return null;
    }

    /**
     * Hook: Get custom description for a field
     * Return custom description or null to use default
     */
    getCustomFieldDescription(propertyId, defaultDescription) {
        // Default: use default description
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseFormHandler;
}
