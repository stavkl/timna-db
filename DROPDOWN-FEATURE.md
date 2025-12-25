# Dropdown Values Feature

## What Problem Does This Solve?

In your static forms, you had to remember and manually type item IDs like:
- "Q45" for Tuyère
- "Q67" for Slag
- "Q89" for Scarab

This was error-prone and required looking up IDs every time.

## The Solution: Auto-Generated Dropdowns

The dynamic form now **automatically discovers** what values you've already used and creates dropdown menus for you!

## How It Works

### Step 1: Form Discovers Existing Values

When you open the dynamic form, it runs this SPARQL query:

```sparql
SELECT DISTINCT ?property ?value ?valueLabel
WHERE {
    # Find all Archaeological Sites
    ?site wdt:P110 wd:Q17 .

    # Get all their property values
    ?site ?propertyDirect ?value .

    # Only for item-type properties
    ?property wikibase:directClaim ?propertyDirect .
    ?property wikibase:propertyType wikibase:WikibaseItem .

    SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en" .
    }
}
```

This discovers:
- Property: P193 (Artifact Type)
  - Q45 → Tuyère
  - Q67 → Slag
  - Q89 → Scarab
- Property: P93 (Archaeological Period)
  - Q120 → Iron Age
  - Q121 → Bronze Age

### Step 2: Form Creates Dropdowns

For each item property with existing values, the form generates a `<select>` dropdown:

```html
<label>Artifact Type <span class="property-badge">P193</span></label>
<select id="P193">
    <option value="">-- Select Artifact Type --</option>
    <option value="Q45">Tuyère (Q45)</option>
    <option value="Q67">Slag (Q67)</option>
    <option value="Q89">Scarab (Q89)</option>
    <option value="__custom__">➕ Add new value (enter ID below)</option>
</select>
```

### Step 3: User Selects or Adds Value

**Option A: Select Existing Value**
1. User sees dropdown with all previously used values
2. Clicks dropdown and selects "Slag (Q67)"
3. Form stores Q67 as the value

**Option B: Add New Value**
1. User selects "➕ Add new value"
2. A text input appears
3. User types new item ID (e.g., "Q234")
4. Form stores Q234 as the value

## Example: Artifact Type Field

### Before (Static Form)
```
Artifact Type: [_____________]
                 ↑ Type Q45, Q67, or Q89... which was which?
```

### After (Dynamic Form)
```
Artifact Type: [Tuyère (Q45)      ▼]
                 ↓ Dropdown shows:
                 -- Select Artifact Type --
                 Tuyère (Q45)
                 Slag (Q67)
                 Scarab (Q89)
                 ➕ Add new value
```

## Benefits

### 1. **No More Memorizing IDs**
You see "Tuyère (Q45)" instead of having to remember that Q45 = Tuyère

### 2. **Data Consistency**
Everyone uses the same IDs. No more:
- Site 1 uses Q45 for Tuyère
- Site 2 accidentally creates Q450 for "Tuyere" (typo)

### 3. **Auto-Discovery**
New team member joins? They immediately see what artifact types are already in the database

### 4. **Growing Vocabulary**
As your database grows, the dropdowns automatically include new items

### 5. **Still Flexible**
Need to add a new artifact type? Just select "Add new value" and enter the ID

## Technical Details

### When Dropdowns Appear

A field becomes a dropdown when:
1. ✅ Property datatype is `WikibaseItem`
2. ✅ At least one Archaeological Site uses this property
3. ✅ At least one value exists in the database

### When Dropdowns Don't Appear

A field stays as text input when:
- Property datatype is String, URL, Number, etc.
- No sites have used this property yet
- Property is brand new with no values

### Caching

- Values are cached for 1 hour
- Click "🔄 Refresh Schema" to reload immediately
- Useful when you've just added new sites with new values

## Real-World Example

Your database currently has 50 archaeological sites. You've used:
- 15 different artifact types
- 8 different archaeological periods
- 3 different research projects

**Without dropdowns:**
- You'd need to remember or look up ~26 different item IDs
- Risk of typos (Q45 vs Q54)
- Hard to maintain consistency

**With dropdowns:**
- See all 15 artifact types in one dropdown
- See all 8 periods in another dropdown
- See all 3 projects in another
- Just click to select
- No ID lookup needed!

## Future Enhancement Ideas

Could be extended to:
1. **Multi-select**: Select multiple artifact types for one site
2. **Hierarchical**: Group values by category
3. **Search**: Filter long dropdown lists
4. **Frequency**: Show most commonly used values first
5. **New item creation**: Create new items directly from form

---

**Created:** 2025-12-24
**Feature Status:** ✅ Active
