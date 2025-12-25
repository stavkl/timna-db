# Simple Form for Non-Technical Users

A user-friendly form interface for team members to easily add new items to the Timna Wikibase without needing to understand the technical details.

## Features

- **Clean, Intuitive Interface**: Simple form layout with clear labels and help text
- **Category Selection**: Choose from existing categories in your ontology
- **Hierarchical Categories**: Shows parent-child relationships in the category dropdown
- **Dynamic Fields**: Automatically shows relevant fields based on selected category
- **Helpful Hints**: Built-in help panel and field descriptions
- **Recent Items Tracking**: See recently created items
- **Mobile Responsive**: Works on phones, tablets, and desktops

## How to Use

### For Team Members

1. **Open the Form**
   - Navigate to `simple-form.html` in your browser
   - Or visit: `https://[your-github-pages-url]/simple-form.html`

2. **Fill in the Details**
   - **Item Name**: Give your item a clear, descriptive name (required)
   - **Description**: Add a brief explanation of what the item is (optional)
   - **Category**: Select the type/category that best fits your item (required)
   - **Other Names**: Add alternative names separated by commas (optional)

3. **Additional Information**
   - After selecting a category, additional relevant fields will appear
   - Fill in any that apply to your item
   - All additional fields are optional

4. **Submit**
   - Click "Create Item"
   - Follow the instructions provided to complete creation in Wikibase

### Current Limitation (Read-Only Mode)

Due to browser security restrictions (CORS), the form currently operates in **read-only mode**:

- The form will **prepare all the information** for you
- It will then **show you instructions** on how to create the item in Wikibase
- You'll need to **manually enter the data** in Wikibase by clicking the provided link

This ensures data accuracy while we work on implementing direct write access.

## Files

- `simple-form.html` - Main form interface
- `simple-form.css` - Styling for the form
- `simple-form.js` - Form logic and Wikibase integration
- `wikibase-api.js` - Shared API client (used by both forms)

## Accessing the Form

### Local Testing

1. Start a local server:
   ```bash
   cd wikibase-ontology-editor
   python -m http.server 8000
   ```

2. Open in browser:
   ```
   http://localhost:8000/simple-form.html
   ```

### GitHub Pages

Once deployed to GitHub Pages, the form will be accessible at:
```
https://[your-username].github.io/wikibase-ontology-editor/simple-form.html
```

## Customization

### Adding Category-Specific Fields

You can customize which fields appear for each category by modifying the `loadDynamicFields()` function in [simple-form.js](simple-form.js:109).

### Changing Appearance

All visual styling is in [simple-form.css](simple-form.css). You can easily change:
- Colors (see CSS variables at the top)
- Fonts
- Layout
- Button styles

### Help Text

Modify the help panel in [simple-form.html](simple-form.html:159) to add instructions specific to your team.

## Future Enhancements

When write access is enabled (via OAuth or backend proxy):

- ✓ Direct item creation without manual steps
- ✓ Auto-save drafts
- ✓ File upload support for images
- ✓ Bulk item creation
- ✓ Template-based creation for common item types

## Comparison with Main Editor

| Feature | Simple Form | Main Editor |
|---------|-------------|-------------|
| **Audience** | Non-technical team members | Ontology administrators |
| **Purpose** | Quick item creation | Full ontology management |
| **Interface** | Single page form | Multi-panel tree view |
| **Learning Curve** | None - just fill and submit | Requires understanding of ontology structure |
| **Features** | Create items with basic properties | View/edit classes, properties, hierarchies |
| **Best For** | Day-to-day data entry | Setting up and organizing ontology |

## Support

If you encounter issues or have questions:

1. Check the Help panel in the form
2. Review this README
3. Contact your ontology administrator

## Technical Details

- Uses Wikibase Cloud SPARQL endpoint for reading data
- Loads categories and properties dynamically from your ontology
- Stores recent items in browser localStorage
- Built with vanilla JavaScript (no framework dependencies)
- Fully responsive CSS Grid and Flexbox layout
