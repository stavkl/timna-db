# Wikibase Ontology Editor

A web-based tool for viewing and editing Wikibase ontologies in a simple, intuitive interface. Built specifically for teams working with Wikibase Cloud instances who need a more user-friendly way to manage their knowledge graph structure.

## Features

- **Tree View**: Visual hierarchy of classes and their relationships
- **Property Management**: View and edit all properties in your ontology
- **Search & Filter**: Quickly find classes and properties
- **Entity Editor**: Edit labels, descriptions, aliases, and statements
- **Create New Items**: Add new classes and properties through simple forms
- **Bot Authentication**: Secure connection using Wikibase bot credentials

## Live Demo

Once deployed to GitHub Pages, your app will be available at:
`https://[your-username].github.io/wikibase-ontology-editor/`

## Setup

### Prerequisites

1. A Wikibase Cloud instance (e.g., `https://timna-database.wikibase.cloud`)
2. Bot credentials for your Wikibase instance

### Creating Bot Credentials

1. Log in to your Wikibase instance
2. Go to `Special:BotPasswords` (e.g., `https://timna-database.wikibase.cloud/wiki/Special:BotPasswords`)
3. Create a new bot password with the following grants:
   - High-volume editing
   - Edit existing pages
   - Create, edit, and move pages
4. Save the bot username and password securely

### Local Development

1. Clone this repository:
   ```bash
   git clone https://github.com/[your-username]/wikibase-ontology-editor.git
   cd wikibase-ontology-editor
   ```

2. Serve the files locally using any HTTP server. For example:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Node.js http-server
   npx http-server

   # Using PHP
   php -S localhost:8000
   ```

3. Open your browser to `http://localhost:8000`

4. Enter your Wikibase URL and bot credentials to connect

### Deploying to GitHub Pages

1. Create a new repository on GitHub named `wikibase-ontology-editor`

2. Push your code:
   ```bash
   git remote add origin https://github.com/[your-username]/wikibase-ontology-editor.git
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git push -u origin main
   ```

3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Under "Source", select "main" branch
   - Click Save

4. Your app will be live at `https://[your-username].github.io/wikibase-ontology-editor/`

## Usage

### Connecting to Your Wikibase

1. Open the app
2. Enter your Wikibase URL (e.g., `https://timna-database.wikibase.cloud`)
3. Enter your bot username (format: `YourUsername@YourBotName`)
4. Enter your bot password
5. Click "Connect"

### Viewing the Ontology

- **Classes Tab**: Shows hierarchical tree of all classes
- **Properties Tab**: Shows flat list of all properties
- Click the `▶` arrow to expand/collapse class hierarchies
- Use the search box to filter items

### Editing Entities

1. Click on any class or property in the tree
2. Edit the label, description, or aliases
3. Click "Save Changes" to update
4. Click "Cancel" to discard changes

### Creating New Items

1. Click "+ New Class" or "+ New Property"
2. Fill in the label and description
3. For classes: optionally select a parent class
4. For properties: select the datatype
5. Click "Create"

## Configuration

### SPARQL Query Customization

The app uses SPARQL queries to fetch ontology structure. You may need to adjust the property IDs based on your Wikibase setup:

In [wikibase-api.js](wikibase-api.js), update the property IDs:
- `P279`: "subclass of" property (used to build class hierarchy)

### Language Settings

By default, the app uses English (`en`) for labels and descriptions. To change this, edit the `lang` parameters in [app.js](app.js).

## Security Notes

- **Never commit your bot credentials** to the repository
- Credentials are only stored in the browser session and are not persisted
- The app runs entirely client-side in your browser
- All API requests are made directly from your browser to your Wikibase instance

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari

Requires a modern browser with ES6+ support.

## Troubleshooting

### CORS Errors

If you encounter CORS errors, ensure your Wikibase Cloud instance has CORS enabled. Wikibase Cloud instances typically have this enabled by default.

### Authentication Fails

- Verify your bot credentials are correct
- Check that your bot has the necessary permissions
- Ensure your Wikibase instance URL is correct (no trailing slash)

### Ontology Not Loading

- Check browser console for errors
- Verify your SPARQL endpoint is accessible
- Ensure property IDs (like P279 for "subclass of") match your Wikibase setup

## Future Enhancements

- [ ] Bulk import/export
- [ ] Visual graph view
- [ ] Statement editing
- [ ] Multi-language support
- [ ] Undo/redo functionality
- [ ] Collaborative editing indicators

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use and modify for your needs.

## Acknowledgments

Built for teams working with Wikibase Cloud to make ontology management more accessible.
