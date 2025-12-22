# Quick Setup Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and log in
2. Click the "+" icon in the top right and select "New repository"
3. Name it `wikibase-ontology-editor`
4. Choose "Public" (required for free GitHub Pages)
5. **Do NOT** initialize with README (we already have one)
6. Click "Create repository"

## Step 2: Push Your Code

Open a terminal in this project folder and run:

```bash
# Add the GitHub repository as remote
git remote add origin https://github.com/YOUR-USERNAME/wikibase-ontology-editor.git

# Push your code
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click "Save"

GitHub will show you the URL where your app is published (e.g., `https://YOUR-USERNAME.github.io/wikibase-ontology-editor/`)

It may take a few minutes for the site to become available.

## Step 4: Get Bot Credentials from Wikibase

1. Log in to your Wikibase Cloud instance: https://timna-database.wikibase.cloud
2. Navigate to `Special:BotPasswords`:
   - Click your username in the top right
   - Go to "Special pages" → "BotPasswords"
   - Or visit directly: https://timna-database.wikibase.cloud/wiki/Special:BotPasswords

3. Create a new bot:
   - Bot name: `OntologyEditor` (or any name you prefer)
   - Select grants:
     - ✓ High-volume editing
     - ✓ Edit existing pages
     - ✓ Create, edit, and move pages
   - Click "Create"

4. **Save the credentials shown!** They look like:
   - Username: `YourUsername@OntologyEditor`
   - Password: `a1b2c3d4e5f6g7h8i9j0` (random string)

   **Important**: You can only see the password once! Save it securely.

## Step 5: Use Your App

1. Open your GitHub Pages URL
2. Enter:
   - Wikibase URL: `https://timna-database.wikibase.cloud`
   - Bot Username: (from Step 4)
   - Bot Password: (from Step 4)
3. Click "Connect"

You should now see your ontology structure!

## Testing Locally First

Before deploying, you can test locally:

```bash
# Using Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

## Important Notes About Your Wikibase Instance

### Finding Property IDs

Your Wikibase uses specific property IDs that may differ from standard Wikidata. You need to find:

1. **"subclass of" property**: Used to build the class hierarchy
   - Go to `https://timna-database.wikibase.cloud/wiki/Special:ListProperties`
   - Find the property for subclass relationships
   - Note its ID (e.g., P1, P2, etc.)

2. **"instance of" property**: Used to identify entity types
   - Same process as above

### Updating Property IDs in Code

If your property IDs differ from `P279` (subclass of), edit [wikibase-api.js](wikibase-api.js:122):

```javascript
// Line ~122, update the property ID in the SPARQL query
async getOntologyClasses() {
    const query = `
        SELECT DISTINCT ?class ?classLabel ?parent ?parentLabel WHERE {
            ?class wdt:P279 ?parent .  // <-- Change P279 to your property ID
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
        }
        ORDER BY ?classLabel
    `;
    ...
}
```

## Troubleshooting

### App doesn't load ontology
- Check browser console (F12) for errors
- Verify SPARQL endpoint is accessible
- Confirm property IDs match your Wikibase setup

### Can't create new items
- Verify bot has editing permissions
- Check that CSRF token is being retrieved correctly

### GitHub Pages shows 404
- Wait a few minutes after enabling Pages
- Check that main branch is selected as source
- Ensure `index.html` is in the root of the repository

## Next Steps

Once your app is working:

1. **Customize the SPARQL queries** to match your ontology structure
2. **Add more property types** in the create property form
3. **Enhance the statement editor** for your specific needs
4. **Add validation rules** specific to your domain

## Getting Help

- Check the [README.md](README.md) for detailed documentation
- Review browser console for error messages
- Verify Wikibase API responses in Network tab (F12 → Network)
