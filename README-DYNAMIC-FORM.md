# Dynamic Form System

This dynamic form automatically adapts to your Wikibase ontology. When you add or modify properties for Archaeological Sites, the form updates accordingly.

## How It Works

### 1. **Ontology Discovery**
The form queries your Wikibase instance via SPARQL to discover:
- All available properties
- Property datatypes (string, number, date, coordinates, etc.)
- Property labels and descriptions
- Whether properties are required or optional
- **Existing values used across all sites** (e.g., all artifact types currently in use)

### 2. **Value Discovery**
For properties that reference other items (like "Artifact Type"), the form:
- Queries all existing Archaeological Sites
- Finds all values currently used for each property
- Creates dropdown menus with these values
- Allows adding new values when needed

### 3. **Automatic Form Generation**
Based on the discovered schema, the form automatically generates appropriate input fields:
- **Dropdown selects** for item properties with existing values (Artifact_Type → Tuyère, Slag, Scarab, etc.)
- Text inputs for strings and external IDs
- Number inputs for quantities
- Date pickers for time values
- Coordinate pair inputs for globe coordinates
- Manual item input for properties without existing values
- Textareas for longer text

### 4. **Smart Caching**
The schema is cached for 1 hour to improve performance. Click "Refresh Schema" to reload after making ontology changes.

## Usage

### Access the Form
Open `http://localhost:3000/dynamic-form.html` in your browser.

### After Updating Your Ontology

When you add a new property to your Wikibase instance:

1. **Create the Property** in your Wikibase
   - Go to your Wikibase instance
   - Create a new property (e.g., "excavation year", "site type", etc.)
   - Set the appropriate datatype
   - Add a label and description in English

2. **Refresh the Form**
   - Open the dynamic form
   - Click the "🔄 Refresh Schema" button
   - The form will re-query your ontology
   - New fields will appear automatically

3. **Create Items**
   - Fill in the form with your data
   - The form adapts to show all available properties
   - Submit to create the item in Wikibase

## Configuration

Edit `dynamic-form.js` to customize:

```javascript
const CONFIG = {
    entityTypeId: 'Q17',     // The item type ID (Archaeological Site)
    instanceOfProperty: 'P110' // The "instance of" property ID
};
```

## Advantages Over Static Forms

### Static Form (site-form.html)
- ✅ Fast and predictable
- ✅ Custom grouping and layout
- ❌ Must manually edit code to add fields
- ❌ Property IDs hardcoded
- ❌ Requires developer knowledge to update

### Dynamic Form (dynamic-form.html)
- ✅ **Automatically adapts to ontology changes**
- ✅ **Non-developers can update** by adding properties in Wikibase
- ✅ Always up-to-date with your schema
- ✅ Shows property IDs for reference
- ✅ One-click schema refresh
- ❌ Less control over field grouping
- ❌ Slightly slower initial load (cached after first load)

## SPARQL Query

The form uses this SPARQL query to discover properties:

\`\`\`sparql
SELECT DISTINCT ?property ?propertyLabel ?propertyDescription ?datatype
WHERE {
    ?property a wikibase:Property .
    ?property wikibase:propertyType ?datatype .

    SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en" .
    }
}
ORDER BY ?propertyLabel
\`\`\`

## Best Practices

### 1. **Use Descriptive Property Labels**
The property label becomes the field label in the form:
- ✅ Good: "Excavation Year", "Site Function", "GPS Coordinates"
- ❌ Avoid: "P123", "prop1", "data"

### 2. **Add Property Descriptions**
Descriptions appear as help text under fields:
```
Label: Excavation Year
Description: The year this site was first excavated
```

### 3. **Set Property Constraints** (Future Enhancement)
You can add constraints to properties in Wikibase:
- Mandatory constraint → Required field in form
- Allowed qualifiers → Additional fields
- Format constraint → Input validation

### 4. **Organize with Sections**
Properties marked as "mandatory" appear in "Basic Information"
Optional properties appear in "Additional Information"

## Troubleshooting

### Form shows "Loading form schema..."
- Check your SPARQL endpoint is accessible
- Verify the Wikibase URL in `dynamic-form.js`
- Check browser console for errors

### New property doesn't appear
- Click "Refresh Schema" button
- Clear browser cache
- Check property has an English label

### Wrong input type
- Edit `mapDatatypeToInputType()` in `dynamic-form.js`
- Add custom mapping for specific properties

## Future Enhancements

Possible improvements:
1. **Smart field grouping** based on property categories
2. **Validation rules** from Wikibase constraints
3. **Autocomplete** for item selectors
4. **Multi-language support** for labels/descriptions
5. **Field dependencies** (show field X only if field Y is filled)
6. **Custom field order** via configuration
7. **Template support** (save common field combinations)

## Dropdown Values Feature

### How It Works

When you have a property like "Artifact Type" (P193) that references items:

1. **First Site**: When creating the very first site, you'll enter item IDs manually (e.g., Q45 for "Tuyère")
2. **Subsequent Sites**: The form automatically discovers that Q45 (Tuyère) has been used and creates a dropdown
3. **Growing List**: As you add more artifact types to different sites, the dropdown grows automatically
4. **Example**: If sites have used:
   - Q45 → Tuyère
   - Q67 → Slag
   - Q89 → Scarab

   The "Artifact Type" field will show a dropdown with these three options

### Using Dropdowns

When you see a dropdown for an item property:
- **Select existing value**: Choose from the dropdown (e.g., "Tuyère (Q45)")
- **Add new value**: Select "➕ Add new value" and enter a new item ID in the text field that appears

### Benefits

- **Consistency**: Ensures you use the same items across sites (no typos like "Tuyer" vs "Tuyère")
- **Speed**: Much faster than looking up item IDs manually
- **Discovery**: See what values others have already used
- **Flexibility**: Can still add new values when needed

## Example Workflows

### Scenario 1: Using Existing Artifact Types

You're entering a new site that has slag and tuyère artifacts:

1. Open the dynamic form
2. Fill in site name and description
3. For "Artifact Type" field, see dropdown with:
   - Tuyère (Q45)
   - Slag (Q67)
   - Scarab (Q89)
4. Select "Slag (Q67)"
5. Submit - the site is created with the correct reference!

### Scenario 2: Adding a "Soil Type" property

1. **In Wikibase:**
   - Navigate to Special:NewProperty
   - Label: "Soil Type"
   - Description: "The predominant soil type at this site"
   - Datatype: String
   - Create property (gets ID like P250)

2. **In Dynamic Form:**
   - Open `http://localhost:3000/dynamic-form.html`
   - Log in
   - Click "🔄 Refresh Schema"
   - New field "Soil Type" appears automatically!
   - Fill it in when creating sites

3. **No code changes needed!** ✨

---

**Created:** $(date +%Y-%m-%d)
**Version:** 1.0
