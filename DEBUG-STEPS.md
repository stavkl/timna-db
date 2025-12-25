# Debugging Steps for Dropdown Feature

## What We're Debugging

The dynamic form is loading properties correctly (you confirmed: "it's good! now I see the right properties"), but dropdown menus aren't appearing for properties with multiple values like P193 (Artifact Type).

## Next Steps

1. **Clear the cache**:
   - Open your browser's Developer Console (F12)
   - Go to Application tab → Local Storage
   - Find `localhost:3000` and delete `formSchema` and `formSchemaTimestamp`
   - Or simply run in console: `localStorage.clear()`

2. **Restart the server**:
   ```bash
   npm start
   ```

3. **Open the form**:
   - Go to `http://localhost:3000/dynamic-form.html`
   - Open browser console (F12)

4. **Login** with your bot credentials

5. **Check the console output** for these specific logs:

### Expected Console Logs

Look for these messages in order:

```
✅ Step 1: Properties Query
Raw properties response: {...}
Properties found: [NUMBER]

✅ Step 2: Values Query
Executing values query...
Values query: [SPARQL QUERY TEXT]
Values query results: [...]
Number of value bindings: [NUMBER]
Processed property values: {...}
Property IDs with values: [...]

✅ Step 3: Schema Processing
Property P193 (Artifact Type) is WikibaseItem type
  ✓ Found [NUMBER] values for P193
  OR
  ✗ No values found for P193 in propertyValues: [...]

✅ Step 4: Dropdown Creation
Creating dropdown for Artifact Type with [NUMBER] values: [...]
```

### What to Share

Please copy and paste these specific parts from your console:

1. **Number of value bindings**: This tells us if the values query found anything
2. **Property IDs with values**: This shows which properties have values discovered
3. **The P193 debug line**: Shows if P193 values were found or not
4. **Any error messages**: Especially SPARQL query errors

## Common Issues and Solutions

### Issue 1: "Number of value bindings: 0"
**Cause**: Values query returned no results
**Possible reasons**:
- No sites exist with instance of Q17
- Properties aren't marked as WikibaseItem type
- Sites don't have item-type property values yet

**Solution**: We need to adjust the values query

### Issue 2: "Property IDs with values: []" (empty array)
**Cause**: Values were returned but not processed correctly
**Solution**: Check the raw "Values query results" to see the structure

### Issue 3: "No values found for P193"
**Cause**: Values exist but property ID doesn't match
**Possible reasons**:
- Property ID format mismatch (P193 vs http://...P193)
- Values query returning different property IDs

**Solution**: Compare the property IDs from both queries

### Issue 4: Values found but dropdown not appearing
**Cause**: Field type not set to 'select'
**Solution**: Check if "Creating dropdown for Artifact Type" message appears

## Manual Testing Query

You can test the values query directly in your Wikibase SPARQL interface:

1. Go to: `https://timna-database.wikibase.cloud/query/`
2. Paste this query:

```sparql
PREFIX wd: <https://timna-database.wikibase.cloud/entity/>
PREFIX wdt: <https://timna-database.wikibase.cloud/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?property ?value ?valueLabel
WHERE {
    # Get Q507 and other sites with instance of property
    ?site wdt:P110 wd:Q17 .

    # Get all their property-value pairs where value is an item
    ?site ?propertyDirect ?value .

    # Convert direct property to full property
    ?property wikibase:directClaim ?propertyDirect .
    ?property wikibase:propertyType wikibase:WikibaseItem .

    # Make sure value is an item (not a literal)
    ?value a wikibase:Item .

    SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en" .
    }
}
ORDER BY ?propertyLabel ?valueLabel
```

3. Click "Run" and check if you get results
4. Look for P193 in the results

## What Success Looks Like

When working correctly, you should see:

```
Properties found: 15
Executing values query...
Values query results: [{property: {...}, value: {...}, valueLabel: {...}}, ...]
Number of value bindings: 25
Processed property values: {P193: [{id: 'Q45', label: 'Tuyère'}, ...], P207: [...], ...}
Property IDs with values: ['P193', 'P207', 'P215', ...]
Property P193 (Artifact Type) is WikibaseItem type
  ✓ Found 3 values for P193
Creating dropdown for Artifact Type with 3 values: [{id: 'Q45', label: 'Tuyère'}, ...]
```

And in the form, you should see a dropdown for Artifact Type instead of a text input.

---

**Last Updated**: 2025-12-24
