# Quick Start Guide

## What You Have Now

Your Wikibase form system now has **three** different forms:

1. **Dynamic Form** (RECOMMENDED) - Auto-adapts to your ontology
2. **Static Site Form** - Full-featured, manually coded
3. **Simple Form** - Basic item creation

## Starting the Server

```bash
npm start
```

The server will show:
```
🚀 Wikibase Proxy Server running on http://localhost:3000
📊 Connected to: https://timna-database.wikibase.cloud

📝 Available Forms:
   • Dynamic Form (recommended): http://localhost:3000/dynamic-form.html
   • Static Site Form: http://localhost:3000/site-form.html
   • Simple Form: http://localhost:3000/simple-form.html
```

## Using the Dynamic Form (Recommended)

### First Time Setup

1. **Start the server**: `npm start`
2. **Open in browser**: `http://localhost:3000/dynamic-form.html`
3. **Login** with your bot credentials:
   - Username: `YourName@BotName`
   - Password: Your bot password from Special:BotPasswords

### Creating a Site

1. Form loads and auto-discovers your properties
2. Fill in the basic fields (Site Name, Description)
3. **For item properties** (like Artifact Type):
   - If values exist: Use the dropdown to select
   - If new value: Select "➕ Add new value" and enter ID
4. Fill in other fields (coordinates, dates, etc.)
5. Click "Create Site"
6. Done! View your new site in Wikibase

### After Updating Your Ontology

**Scenario**: You added a new property "Excavation Method" to your Wikibase

1. Click "🔄 Refresh Schema" button in the form
2. The form reloads and discovers the new property
3. New field appears automatically
4. Start using it immediately!

## Key Features

### ✨ Auto-Discovery
- Queries your Wikibase to find all properties
- Discovers values already used in existing sites
- Creates appropriate input types (text, number, date, dropdown, etc.)

### 📋 Smart Dropdowns
For properties like "Artifact Type":
- **First site**: Enter item ID manually (Q45)
- **Second site**: Dropdown appears with "Tuyère (Q45)"
- **Growing**: As you add more types, dropdown grows

Example dropdown:
```
Artifact Type: [Select...        ▼]
               • Tuyère (Q45)
               • Slag (Q67)
               • Scarab (Q89)
               • ➕ Add new value
```

### 🔄 One-Click Updates
- Add/change properties in Wikibase
- Click "Refresh Schema" in form
- Form updates instantly

## Common Workflows

### Workflow 1: Adding a New Property Type

**Goal**: Add "Soil Type" property to your ontology

1. **In Wikibase**:
   - Go to Special:NewProperty
   - Label: "Soil Type"
   - Datatype: String (or WikibaseItem if you want dropdowns later)
   - Save it (gets ID like P250)

2. **In Dynamic Form**:
   - Click "🔄 Refresh Schema"
   - New "Soil Type" field appears
   - Start using it!

### Workflow 2: Adding Values to Item Properties

**Goal**: Add "Pottery" as a new artifact type

1. **In Wikibase**:
   - Create new item for "Pottery"
   - Gets ID like Q234

2. **In Dynamic Form**:
   - Find "Artifact Type" field
   - Select "➕ Add new value"
   - Enter "Q234"
   - Submit site

3. **Next Time**:
   - "Artifact Type" dropdown now includes "Pottery (Q234)"
   - Other users can select it from dropdown

### Workflow 3: Team Collaboration

**Scenario**: Multiple people entering sites

**Person A** (Morning):
- Creates 3 sites with artifact types: Tuyère, Slag
- Uses Q45 and Q67

**Person B** (Afternoon):
- Opens form
- Sees dropdown with Tuyère and Slag
- Adds site with Slag (just clicks dropdown!)
- Introduces new type: Scarab (Q89)

**Person C** (Evening):
- Opens form
- Sees dropdown with all three: Tuyère, Slag, Scarab
- Creates site using existing values

## Troubleshooting

### Form shows "Loading form schema..."
- **Cause**: SPARQL endpoint not accessible
- **Fix**: Check your internet connection and Wikibase URL

### New property doesn't appear
- **Cause**: Cache still active
- **Fix**: Click "🔄 Refresh Schema"

### Dropdown doesn't show my value
- **Cause**: No sites have used this value yet
- **Fix**: This is normal for first use. Enter the ID manually, then it will appear in dropdown for next user

### Login fails
- **Cause**: Incorrect credentials or session timeout
- **Fix**:
  - Verify bot username format: `Username@BotName`
  - Generate new bot password if needed
  - Check server logs for detailed error

## File Reference

- `dynamic-form.html` - The dynamic form interface
- `dynamic-form.js` - Form logic and SPARQL queries
- `site-form.html` - Static form (alternative)
- `simple-form.html` - Basic form (alternative)
- `server.js` - Backend proxy server
- `.env` - Configuration (Wikibase URL)

## Documentation

- [README-DYNAMIC-FORM.md](README-DYNAMIC-FORM.md) - Detailed documentation
- [DROPDOWN-FEATURE.md](DROPDOWN-FEATURE.md) - How dropdowns work
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) - Production deployment

## Support

If something isn't working:
1. Check server is running: `http://localhost:3000/api/health`
2. Check browser console for JavaScript errors
3. Check server terminal for backend errors
4. Verify Wikibase URL in `.env` file

---

**Quick Reference**

| Action | Command/URL |
|--------|-------------|
| Start server | `npm start` |
| Open form | http://localhost:3000/dynamic-form.html |
| Refresh schema | Click 🔄 button in form |
| Create bot password | https://timna-database.wikibase.cloud/wiki/Special:BotPasswords |
| Check server health | http://localhost:3000/api/health |

**Last Updated:** 2025-12-24
