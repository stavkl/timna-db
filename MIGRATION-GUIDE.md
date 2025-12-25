# Migration Guide: V1 to V2 (Exemplar-Driven Architecture)

## What Changed

Version 2.0 completely restructures the application from static/semi-dynamic forms to a fully exemplar-driven pipeline.

### Old Approach (V1)
- Hardcoded form fields
- Manual property specification
- Separate files for each entity type
- Limited flexibility

### New Approach (V2)
- Exemplar-based configuration
- Automatic property discovery via SPARQL
- Single unified form generator
- Multi-select dropdowns with value discovery
- Create and Edit modes

## Breaking Changes

### Removed Files
- `dynamic-form.html` → Replaced by `src/forms/form.html`
- `dynamic-form.js` → Split into modular JS files
- `simple-form.*` → Removed (old approach)
- `site-form.*` → Removed (old approach)
- `README-DYNAMIC-FORM.md` → Archived as `README-DYNAMIC-FORM-OLD.md`

### New Files
- `config/exemplars.json` - Configuration for exemplar items
- `src/index.html` - Main menu page
- `src/forms/form.html` - Dynamic form page
- `src/js/auth.js` - Authentication module
- `src/js/menu.js` - Main menu logic
- `src/js/form-generator.js` - Form generation pipeline
- `src/js/form-renderer.js` - Form rendering & submission
- `src/js/sparql-queries.js` - SPARQL query builders
- `src/css/styles.css` - Shared styles

### URL Changes

**Old:**
- `http://localhost:3000/dynamic-form.html`
- `http://localhost:3000/site-form.html`
- `http://localhost:3000/simple-form.html`

**New:**
- `http://localhost:3000/src/index.html` (Main menu - START HERE)
- `http://localhost:3000/src/forms/form.html?mode=create&type=Archaeological_Site`
- `http://localhost:3000/src/forms/form.html?mode=edit&item=Q507`

### API Changes

**New Endpoints:**
- `POST /api/create-entity` - Creates any entity type
- `POST /api/update-entity/:id` - Updates existing entity

**Still Available:**
- `POST /api/login`
- `POST /api/create-site` (legacy)
- `POST /api/logout`

## Migration Steps

### For Users

1. **Update bookmarks:**
   - Old: `http://localhost:3000/dynamic-form.html`
   - New: `http://localhost:3000/src/index.html`

2. **New workflow:**
   - Visit main menu
   - Choose "Create New" or "Edit Existing"
   - Select entity type
   - Fill form

### For Developers

1. **Update Configuration:**

   Create/update `config/exemplars.json`:
   ```json
   {
     "exemplars": {
       "Archaeological_Site": {
         "id": "Q507",
         "url": "https://timna-database.wikibase.cloud/wiki/Item:Q507",
         "label": "Archaeological Site",
         "description": "A location where archaeological materials are found"
       }
     },
     "wikibase": {
       "url": "https://timna-database.wikibase.cloud",
       "sparqlEndpoint": "https://timna-database.wikibase.cloud/query/sparql",
       "apiEndpoint": "https://timna-database.wikibase.cloud/w/api.php"
     },
     "properties": {
       "instanceOf": "P110"
     }
   }
   ```

2. **Restart Server:**
   ```bash
   npm start
   ```

3. **Test Workflows:**
   - Create new item
   - Edit existing item
   - Multi-select functionality
   - Custom Q number addition

## New Features

### 1. Exemplar-Based Configuration

Forms are generated from exemplar items configured in `config/exemplars.json`. When you need a new entity type:

1. Create exemplar item in Wikibase
2. Add it to config
3. Restart server
4. New button appears in main menu

### 2. Automatic Value Discovery

For WikibaseItem properties, the system:
1. Queries all items of the same type
2. Finds all values used for that property
3. Populates dropdown with discovered values

Example: For Archaeological Sites with Artifact_Type (P193):
- Queries all Q17 (Archaeological Site) items
- Finds all their P193 values
- Creates dropdown: [Tuyère (Q45), Slag (Q67), Scarab (Q89), ...]

### 3. Multi-Select Dropdowns

Properties that can have multiple values show as multi-select:
- Hold Ctrl (Cmd on Mac) to select multiple
- Selected values highlighted
- Can add custom Q numbers

### 4. Edit Mode

Load existing items for editing:
- Enter Q number or full URL
- System loads current values
- Multi-select dropdowns pre-select existing values
- Add/remove values as needed
- **Append mode**: New values added to existing ones

### 5. Modular Architecture

JavaScript split into focused modules:
- `auth.js` - Authentication & session
- `menu.js` - Main menu & item loading
- `form-generator.js` - Form generation pipeline
- `form-renderer.js` - Rendering & submission
- `sparql-queries.js` - Query builders

## Architecture Comparison

### V1 Architecture
```
dynamic-form.html
    ↓
dynamic-form.js (monolithic)
    ↓
SPARQL queries (hardcoded)
    ↓
Form rendering (mixed logic)
```

### V2 Architecture
```
index.html (Main Menu)
    ↓
menu.js (entity selection)
    ↓
form.html (Form Generator)
    ↓
form-generator.js (pipeline)
    ↓
sparql-queries.js (query builders)
    ↓
form-renderer.js (rendering)
```

## The Exemplar Pipeline

### Step-by-Step

1. **User Action**: Clicks "New Archaeological Site"

2. **Load Exemplar**: `config/exemplars.json` → Q507

3. **Get Instance Of**:
   ```sparql
   SELECT ?instanceOf WHERE {
     wd:Q507 wdt:P110 ?instanceOf
   }
   ```
   Result: Q17 (Archaeological Site)

4. **Extract Properties**:
   ```sparql
   SELECT ?property ?propertyLabel ?datatype WHERE {
     wd:Q507 ?propertyDirect ?value .
     ?property wikibase:directClaim ?propertyDirect .
     ?property wikibase:propertyType ?datatype .
   }
   ```
   Result: List of all properties used in Q507

5. **For Each WikibaseItem Property**:
   ```sparql
   SELECT ?value ?valueLabel WHERE {
     ?item wdt:P110 wd:Q17 .
     ?item wdt:P193 ?value .
   }
   ```
   Result: All artifact types used by archaeological sites

6. **Render Form**: Multi-select dropdown with discovered values

7. **Submit**: Create item with Instance Of = Q17

## Troubleshooting

### "Page not found" after upgrade

**Problem**: Old URLs bookmarked
**Solution**: Update to `http://localhost:3000/src/index.html`

### "No values in dropdown"

**Problem**: No items of this type have values for this property yet
**Solution**: This is normal for new properties. Users can add custom Q numbers.

### "Properties found: 0"

**Problem**: Exemplar ID incorrect or item doesn't exist
**Solution**: Check `config/exemplars.json` and verify item exists in Wikibase

### "Failed to load configuration"

**Problem**: `config/exemplars.json` missing or malformed
**Solution**: Check JSON syntax, ensure file exists

## Rollback (if needed)

To temporarily rollback to V1:

```bash
git checkout 9b5dab0  # Last V1 commit
npm start
```

Then visit `http://localhost:3000/dynamic-form.html`

**Note**: V1 is no longer maintained. Use V2 for new features and bug fixes.

## Questions?

- Check the new [README.md](README.md) for detailed documentation
- Review SPARQL queries in browser DevTools
- Check server logs for errors

---

**Migration Date**: 2024-12-24
**V1 Last Commit**: 9b5dab0
**V2 First Commit**: 52beddb
