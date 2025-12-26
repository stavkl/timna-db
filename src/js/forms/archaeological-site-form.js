/**
 * Archaeological Site Form Handler
 * Customizations specific to Archaeological Site entity forms
 */

class ArchaeologicalSiteFormHandler extends BaseFormHandler {
    constructor(exemplarId) {
        super('Archaeological_Site', exemplarId);
    }

    /**
     * Customize schema for Archaeological Site forms
     */
    customizeSchema(schema, currentData) {
        console.log('[ArchaeologicalSiteForm] Customizing schema');

        // Example: Group fields logically
        // You can reorder properties to show location/administrative info first

        return schema;
    }

    /**
     * Determine if a property should be shown
     */
    shouldShowProperty(propertyId, mode) {
        // Example: Hide certain technical properties in create mode
        const hideInCreateMode = [];

        if (mode === 'create' && hideInCreateMode.includes(propertyId)) {
            return false;
        }

        return true;
    }

    /**
     * Make certain properties required for Archaeological Site forms
     */
    isPropertyRequired(propertyId) {
        // Example: Make location-related fields required
        const requiredProps = [];

        if (requiredProps.includes(propertyId)) {
            return true;
        }

        return null; // Use default
    }

    /**
     * Custom validation for Archaeological Site forms
     */
    validateForm(formElement) {
        const errors = [];

        // Example: Add custom validation rules
        // e.g., ensure coordinates are within expected range
        const coordInputs = formElement.querySelectorAll('[id*="-lat"]');
        coordInputs.forEach(input => {
            const lat = parseFloat(input.value);
            if (lat && (lat < -90 || lat > 90)) {
                errors.push('Latitude must be between -90 and 90 degrees');
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Transform form data before submission
     */
    transformFormData(formData) {
        console.log('[ArchaeologicalSiteForm] Transforming form data');

        // Add any Archaeological Site-specific data transformations here

        return formData;
    }

    /**
     * Customize entity data before submission
     */
    customizeEntityData(entityData, formData) {
        console.log('[ArchaeologicalSiteForm] Customizing entity data');

        // Example: Add Archaeological Site-specific metadata or computed fields

        return entityData;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArchaeologicalSiteFormHandler;
}
