# Timna Database - Form Generator

A dynamic form generation system for Wikibase that creates data entry forms based on exemplar items. This system automatically discovers properties and their values from your Wikibase ontology and generates appropriate form fields.

## Overview

This application generates forms for creating and editing Wikibase items based on an **exemplar-driven pipeline**:

1. **Exemplar Item** - A permanent reference item (e.g., Site Q507) that defines the structure
2. **Property Discovery** - Automatically extracts all properties from the exemplar
3. **Value Discovery** - For item-type properties, queries all items of the same type to find existing values
4. **Form Generation** - Creates a form with appropriate inputs and multi-select dropdowns

## Key Features

### Create Mode
- Start with empty form based on exemplar structure
- Multi-select dropdowns populated with existing values from similar items
- Ability to add custom Q numbers for properties

### Edit Mode
- Load existing item data
- Pre-select current values in dropdowns
- **Append mode** for multi-value properties (add new baskets without deleting existing ones)
- **Replace mode** for single-value properties

### Smart Property Handling
- **WikibaseItem properties** → Multi-select dropdowns with all existing values
- **String/Text properties** → Text inputs (unique values)
- **Number properties** → Number inputs
- **Date properties** → Date pickers
- **Coordinate properties** → Lat/Lon inputs
- **URL properties** → URL inputs

## Project Structure

```
timna-db/
├── config/
│   └── exemplars.json          # Configuration for exemplar items
├── src/
│   ├── index.html              # Main menu page
│   ├── forms/
│   │   └── form.html           # Form generator page
│   ├── js/
│   │   ├── auth.js             # Authentication handling
│   │   ├── menu.js             # Main menu logic
│   │   ├── form-generator.js   # Form generation pipeline
│   │   ├── form-renderer.js    # Form rendering & submission
│   │   └── sparql-queries.js   # SPARQL query builders
│   └── css/
│       └── styles.css          # Shared styles
├── server.js                   # Express proxy server
├── package.json                # Dependencies
└── README.md                   # This file
```

## Installation

### Prerequisites
- Node.js v14+ (tested on v14.16.0)
- Bot credentials from your Wikibase instance

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/stavkl/timna-db.git
   cd timna-db
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your Wikibase URL:
   ```
   WIKIBASE_URL=https://your-instance.wikibase.cloud
   ```

4. **Configure exemplars**

   Edit `config/exemplars.json` and update the exemplar items for your entity types:
   ```json
   {
     "exemplars": {
       "Archaeological_Site": {
         "id": "Q507",
         "url": "https://timna-database.wikibase.cloud/wiki/Item:Q507",
         "label": "Archaeological Site",
         "description": "A location where archaeological materials are found"
       }
     }
   }
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open the application**

   Navigate to: `http://localhost:3000/src/index.html`

## Usage

### Creating a New Item

1. Open the main menu at `http://localhost:3000/src/index.html`
2. Login with your bot credentials (format: `BotName@BotName`)
3. Click on the appropriate "New [Entity Type]" button
4. Fill out the form:
   - **Name**: Enter a unique name (required)
   - **Description**: Brief description
   - **Properties**: For multi-select fields, hold Ctrl (Cmd on Mac) to select multiple values
5. Click "Create Item"
6. You'll receive a link to view the created item in Wikibase

### Editing an Existing Item

1. Open the main menu
2. Login with bot credentials
3. In the "Edit Existing Item" section:
   - Enter the item's Q number (e.g., `Q507`)
   - Or paste the full URL (e.g., `https://timna-database.wikibase.cloud/wiki/Item:Q507`)
4. Click "Load Item for Editing"
5. Review the item preview
6. Click "Edit This Item"
7. Modify the form:
   - Existing values in multi-select dropdowns will be pre-selected
   - Select/deselect values as needed
   - Add new custom Q numbers if necessary
8. Click "Update Item"

### Adding Custom Values

For properties with dropdown menus:
1. Select from existing values, OR
2. Click "Add New Value (Q number)"
3. Enter a Q number (e.g., `Q123`)
4. The value will be added to your selection

## The Exemplar Pipeline

### How It Works

```
1. User selects "Create Archaeological Site"
   ↓
2. System loads exemplar Q507 (configured in exemplars.json)
   ↓
3. SPARQL query extracts Instance Of value → Q17 (Archaeological Site)
   ↓
4. SPARQL query finds all properties used in Q507
   ↓
5. For each WikibaseItem property (e.g., P193 Artifact Type):
      - Query all Q17 items for their P193 values
      - Build dropdown with discovered values
   ↓
6. Render form with appropriate input types
   ↓
7. User fills form and submits
   ↓
8. System creates new item with Instance Of = Q17
```

### Benefits

- **Self-updating**: Form automatically reflects ontology changes
- **No hardcoding**: Properties discovered dynamically from exemplars
- **Consistent data**: Dropdowns ensure values match existing items
- **Flexible**: Supports any entity type with proper exemplar configuration

## Configuration

### Exemplar Requirements

An exemplar item must:
1. Have an `Instance Of` property (P110) defining its type
2. Include all properties that should appear in the form
3. Be permanently available (managed by code maintainer)

### Adding New Entity Types

1. Create an exemplar item in Wikibase (e.g., "Square Q500")
2. Add all relevant properties to this item
3. Update `config/exemplars.json`:
   ```json
   "Square": {
     "id": "Q500",
     "url": "https://your-wikibase.cloud/wiki/Item:Q500",
     "label": "Square",
     "description": "An excavation square"
   }
   ```
4. Restart the server
5. The "New Square" button will appear in the main menu

## API Endpoints

### Authentication
- `POST /api/login` - Login with bot credentials
  - Body: `{ username, password }`
  - Returns: `{ success, sessionId }`

### Entity Operations
- `POST /api/create-entity` - Create new item
  - Headers: `X-Session-ID`
  - Body: `{ entity }` (Wikibase entity structure)
  - Returns: Created entity with ID

- `POST /api/update-entity/:id` - Update existing item
  - Headers: `X-Session-ID`
  - Body: `{ entity }`
  - Returns: Updated entity

### Legacy (still available)
- `POST /api/create-site` - Old endpoint for site creation
- `POST /api/logout` - Logout

## Architecture

### Frontend Flow

```
index.html (Main Menu)
    ↓
menu.js (handles entity type selection)
    ↓
form.html (Form page)
    ↓
form-generator.js (builds form from exemplar)
    ↓
sparql-queries.js (fetches data from Wikibase)
    ↓
form-renderer.js (renders and handles submission)
```

### Backend Flow

```
Express Server (server.js)
    ↓
Session Management (in-memory)
    ↓
MediaWiki API Authentication
    ↓
Wikibase Entity Creation/Update
```

## Development

### Running in Development

```bash
npm start
```

The server will run on `http://localhost:3000` with auto-reload (if using nodemon).

### Debugging

1. Open browser DevTools (F12)
2. Check Console tab for:
   - SPARQL query results
   - Property discovery logs
   - Value matching logs
3. Check Network tab for API request/response details

### Common Issues

**"Properties found: 0"**
- Check that exemplar ID is correct in config
- Verify exemplar item exists in Wikibase
- Check SPARQL endpoint is accessible

**"No values found for property"**
- No items of this type have values for this property yet
- This is normal for new properties
- Users can still add custom Q numbers

**"Login failed"**
- Verify bot credentials are correct
- Check bot has appropriate permissions
- Ensure cookies are enabled

## Deployment

### Vercel (Serverless)

A `vercel.json` configuration is included:

```bash
npm install -g vercel
vercel
```

### Traditional Hosting

1. Install dependencies: `npm install`
2. Set environment variables (PORT, WIKIBASE_URL)
3. Start server: `npm start`
4. Use a process manager like PM2 for production:
   ```bash
   npm install -g pm2
   pm2 start server.js --name timna-db
   ```

## Contributing

This project follows an exemplar-driven architecture. When adding features:

1. Ensure backward compatibility with existing exemplars
2. Test with multiple entity types
3. Update documentation
4. Commit with descriptive messages

## License

[Add your license here]

## Support

For issues or questions:
- Check the documentation in `/docs`
- Review SPARQL queries in browser DevTools
- Check server logs for errors

---

**Last Updated**: 2024-12-24
**Version**: 2.0.0 (Exemplar-driven architecture)
