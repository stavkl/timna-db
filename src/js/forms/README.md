# Form-Specific Handlers

This directory contains form-specific handler classes that customize the behavior of forms for different entity types.

## Architecture

- **base-form.js**: Base class with default form behavior and hooks for customization
- **human-form.js**: Customizations for Human entity forms
- **archaeological-site-form.js**: Customizations for Archaeological Site entity forms
- **form-handler-registry.js**: Maps entity types to their specific handlers

## Creating a New Form Handler

1. Create a new file in this directory (e.g., `locus-form.js`)
2. Extend the `BaseFormHandler` class
3. Override any hooks you need to customize
4. Register your handler in `form-handler-registry.js`

Example:

```javascript
class LocusFormHandler extends BaseFormHandler {
    constructor(exemplarId) {
        super('Locus', exemplarId);
    }

    customizeSchema(schema, currentData) {
        // Customize the schema
        return schema;
    }

    validateForm(formElement) {
        // Add custom validation
        return { valid: true, errors: [] };
    }
}
```

Then in `form-handler-registry.js`:

```javascript
function getFormHandler(formType, exemplarId) {
    switch (formType) {
        case 'Locus':
            return new LocusFormHandler(exemplarId);
        // ... other cases
    }
}
```

## Available Hooks

### `customizeSchema(schema, currentData)`
Called after schema is built, before rendering. Use to add/remove/reorder fields.

**Parameters:**
- `schema`: The generated schema object
- `currentData`: Existing data (in edit mode) or null (in create mode)

**Returns:** Modified schema object

**Example:**
```javascript
customizeSchema(schema, currentData) {
    // Reorder fields - put name fields first
    const nameFields = schema.properties.filter(f => f.id === 'P147' || f.id === 'P148');
    const otherFields = schema.properties.filter(f => f.id !== 'P147' && f.id !== 'P148');
    schema.properties = [...nameFields, ...otherFields];
    return schema;
}
```

### `processExistingData(processedData)`
Called after SPARQL data is processed. Use to transform existing data.

**Parameters:**
- `processedData`: The processed data from SPARQL results

**Returns:** Modified data object

### `renderCustomField(field, currentData)`
Called when rendering a specific field. Return null for default rendering or custom HTML.

**Parameters:**
- `field`: Field configuration object
- `currentData`: Existing data

**Returns:** Custom HTML string or null

### `validateForm(formElement)`
Called before form data is collected. Add custom validation rules.

**Parameters:**
- `formElement`: The form DOM element

**Returns:** Object with `{ valid: boolean, errors: string[] }`

**Example:**
```javascript
validateForm(formElement) {
    const errors = [];

    const givenName = document.getElementById('P147')?.value;
    const familyName = document.getElementById('P148')?.value;

    if (!givenName && !familyName) {
        errors.push('At least one name field must be filled');
    }

    return { valid: errors.length === 0, errors };
}
```

### `transformFormData(formData)`
Called after form data is collected, before building entity data. Transform the data.

**Parameters:**
- `formData`: Collected form data

**Returns:** Modified form data object

### `customizeEntityData(entityData, formData)`
Called after entity data is built, before submission. Customize the Wikibase entity structure.

**Parameters:**
- `entityData`: The built entity data
- `formData`: The original form data

**Returns:** Modified entity data object

### `shouldShowProperty(propertyId, mode)`
Determine if a property should be shown in the form.

**Parameters:**
- `propertyId`: Property ID (e.g., 'P147')
- `mode`: 'create' or 'edit'

**Returns:** Boolean

### `isPropertyRequired(propertyId)`
Determine if a property should be required.

**Parameters:**
- `propertyId`: Property ID

**Returns:** Boolean or null (null means use default)

### `getFieldOrder()`
Get custom field ordering.

**Returns:** Array of property IDs in desired order, or null for default

### `getCustomFieldLabel(propertyId, defaultLabel)`
Get custom label for a field.

**Parameters:**
- `propertyId`: Property ID
- `defaultLabel`: The default label from SPARQL

**Returns:** Custom label string or null

### `getCustomFieldDescription(propertyId, defaultDescription)`
Get custom description for a field.

**Parameters:**
- `propertyId`: Property ID
- `defaultDescription`: The default description from SPARQL

**Returns:** Custom description string or null

## Integration

The form handlers are automatically loaded and used by the form generation system:

1. When a form is initialized, `getFormHandler()` is called with the entity type
2. The appropriate handler is instantiated and stored in `formState.formHandler`
3. At various points in the form lifecycle, the hooks are called:
   - After processing existing data → `processExistingData()`
   - After building schema → `customizeSchema()`
   - Before form submission → `validateForm()`
   - After collecting form data → `transformFormData()`
   - After building entity data → `customizeEntityData()`

## Best Practices

1. **Keep handlers focused**: Each handler should only customize what's specific to that entity type
2. **Use hooks sparingly**: Only override hooks when you need custom behavior
3. **Log your changes**: Use `console.log()` to make debugging easier
4. **Validate carefully**: Custom validation should provide clear, helpful error messages
5. **Don't break the base functionality**: Always call `return schema;` at the end of customization hooks
