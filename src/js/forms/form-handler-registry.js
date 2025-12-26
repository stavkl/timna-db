/**
 * Form Handler Registry
 * Maps entity types to their specific form handlers
 */

/**
 * Get the appropriate form handler for a given form type
 */
function getFormHandler(formType, exemplarId) {
    console.log(`[FormRegistry] Getting handler for form type: ${formType}`);

    switch (formType) {
        case 'Human':
            return new HumanFormHandler(exemplarId);

        case 'Archaeological_Site':
            return new ArchaeologicalSiteFormHandler(exemplarId);

        case 'Locus':
        case 'Feature':
        case 'Basket':
        default:
            // Use base handler for forms without specific customizations
            console.log(`[FormRegistry] Using base handler for ${formType}`);
            return new BaseFormHandler(formType, exemplarId);
    }
}

/**
 * Check if a form type has a specific handler
 */
function hasCustomHandler(formType) {
    return ['Human', 'Archaeological_Site'].includes(formType);
}
