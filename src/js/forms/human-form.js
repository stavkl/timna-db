/**
 * Human Form Handler
 * Customizations specific to Human entity forms
 */

class HumanFormHandler extends BaseFormHandler {
    constructor(exemplarId) {
        super('Human', exemplarId);
    }

    /**
     * Customize schema for Human forms
     */
    customizeSchema(schema, currentData) {
        console.log('[HumanForm] Customizing schema');

        // Reorder fields to show name-related fields first
        const namePropertyIds = ['P205', 'P207']; // Given name (P205), Family name (P207)
        const nameFields = [];
        const otherFields = [];

        schema.properties.forEach(field => {
            if (namePropertyIds.includes(field.id)) {
                nameFields.push(field);
            } else {
                otherFields.push(field);
            }
        });

        // Put name fields first
        schema.properties = [...nameFields, ...otherFields];

        return schema;
    }

    /**
     * Determine if a property should be shown
     */
    shouldShowProperty(propertyId, mode) {
        // Example: Hide certain properties in create mode
        const hideInCreateMode = [];

        if (mode === 'create' && hideInCreateMode.includes(propertyId)) {
            return false;
        }

        return true;
    }

    /**
     * Make certain properties required for Human forms
     */
    isPropertyRequired(propertyId) {
        // Make family name and given name required
        const requiredProps = ['P205', 'P207']; // Given name (P205), Family name (P207)

        if (requiredProps.includes(propertyId)) {
            return true;
        }

        return null; // Use default
    }

    /**
     * Custom validation for Human forms
     */
    validateForm(formElement) {
        const errors = [];

        // Ensure at least one name field is filled
        // P205 (Given Name) has qualifiers, so check for P205-0-value (repeatable field format)
        // P207 (Family Name) is simple field
        const givenName = document.getElementById('P205-0-value')?.value ||
                         document.getElementById('P205')?.value;
        const familyName = document.getElementById('P207')?.value;

        if (!givenName && !familyName) {
            errors.push('At least one name field (Given Name or Family Name) must be filled');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Transform form data before submission
     */
    transformFormData(formData) {
        console.log('[HumanForm] Transforming form data');

        // Example: Ensure name fields are properly formatted
        // Add any Human-specific data transformations here

        return formData;
    }

    /**
     * Get custom field labels
     */
    getCustomFieldLabel(propertyId, defaultLabel) {
        const customLabels = {
            // Example: Override labels if needed
            // 'P147': 'First Name',
            // 'P148': 'Last Name'
        };

        return customLabels[propertyId] || null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HumanFormHandler;
}
