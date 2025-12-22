/**
 * Wikibase API Client
 * Handles authentication and API requests to Wikibase Cloud instances
 */

class WikibaseAPI {
    constructor() {
        this.baseUrl = null;
        this.apiEndpoint = null;
        this.sparqlEndpoint = null;
        this.username = null;
        this.password = null;
        this.csrfToken = null;
        this.cookies = null;
        this.isAuthenticated = false;
    }

    /**
     * Initialize connection to Wikibase
     */
    async connect(baseUrl, username, password) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiEndpoint = `${this.baseUrl}/w/api.php`;
        this.sparqlEndpoint = `${this.baseUrl}/query/sparql`;
        this.username = username;
        this.password = password;

        try {
            // Use SPARQL endpoint only (MediaWiki API blocked by mixed content security)
            console.log('Testing SPARQL endpoint:', this.sparqlEndpoint);

            const testQuery = 'SELECT * WHERE { ?s ?p ?o } LIMIT 1';
            const testParams = new URLSearchParams({
                query: testQuery,
                format: 'json'
            });

            const testResponse = await fetch(`${this.sparqlEndpoint}?${testParams}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/sparql-results+json'
                }
            });

            console.log('SPARQL response status:', testResponse.status);

            if (!testResponse.ok) {
                throw new Error(`Cannot connect to SPARQL endpoint (Status: ${testResponse.status})`);
            }

            const data = await testResponse.json();
            console.log('SPARQL test successful:', data);

            this.isAuthenticated = true; // Mark as connected (read-only, SPARQL only)
            console.warn('Connected in READ-ONLY mode using SPARQL. MediaWiki API unavailable due to browser security restrictions.');
            return { success: true, readOnly: true };
        } catch (error) {
            console.error('Connection failed:', error);
            return { success: false, error: `${error.message}` };
        }
    }

    /**
     * Get login token
     */
    async getLoginToken() {
        const params = new URLSearchParams({
            action: 'query',
            meta: 'tokens',
            type: 'login',
            format: 'json',
            origin: '*',
            formatversion: '2'
        });

        try {
            const response = await fetch(`${this.apiEndpoint}?${params}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.info || 'API error');
            }

            return data.query.tokens.logintoken;
        } catch (error) {
            console.error('getLoginToken error:', error);
            throw new Error(`Failed to get login token: ${error.message}. Check if ${this.baseUrl} is accessible and CORS is enabled.`);
        }
    }

    /**
     * Login to Wikibase
     */
    async login(loginToken) {
        const params = new URLSearchParams({
            action: 'login',
            lgname: this.username,
            lgpassword: this.password,
            lgtoken: loginToken,
            format: 'json',
            origin: '*'
        });

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: params,
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = await response.json();

        if (data.login.result !== 'Success') {
            throw new Error(`Login failed: ${data.login.result}`);
        }

        return data;
    }

    /**
     * Get CSRF token for editing
     */
    async getCsrfToken() {
        const params = new URLSearchParams({
            action: 'query',
            meta: 'tokens',
            format: 'json',
            origin: '*'
        });

        const response = await fetch(`${this.apiEndpoint}?${params}`, {
            method: 'GET',
            mode: 'cors'
        });

        const data = await response.json();
        return data.query.tokens.csrftoken;
    }

    /**
     * Execute SPARQL query
     */
    async sparqlQuery(query) {
        const params = new URLSearchParams({
            query: query,
            format: 'json'
        });

        const response = await fetch(`${this.sparqlEndpoint}?${params}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/sparql-results+json'
            }
        });

        if (!response.ok) {
            throw new Error(`SPARQL query failed: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Get entity by ID using SPARQL
     */
    async getEntity(entityId) {
        // Use SPARQL to get entity information
        const query = `
            SELECT ?label ?description ?alias WHERE {
                BIND(wd:${entityId} AS ?item)
                OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label) = "en") }
                OPTIONAL { ?item schema:description ?description . FILTER(LANG(?description) = "en") }
                OPTIONAL { ?item skos:altLabel ?alias . FILTER(LANG(?alias) = "en") }
            }
        `;

        const results = await this.sparqlQuery(query);
        const bindings = results.results.bindings;

        // Format as entity object similar to MediaWiki API
        const entity = {
            id: entityId,
            labels: {},
            descriptions: {},
            aliases: {},
            claims: {} // TODO: Fetch claims via SPARQL if needed
        };

        if (bindings.length > 0) {
            const first = bindings[0];
            if (first.label) {
                entity.labels.en = { language: 'en', value: first.label.value };
            }
            if (first.description) {
                entity.descriptions.en = { language: 'en', value: first.description.value };
            }
            // Collect all aliases
            const aliases = bindings
                .filter(b => b.alias)
                .map(b => ({ language: 'en', value: b.alias.value }));
            if (aliases.length > 0) {
                entity.aliases.en = aliases;
            }
        }

        return entity;
    }

    /**
     * Get multiple entities by IDs
     */
    async getEntities(entityIds) {
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: entityIds.join('|'),
            format: 'json',
            origin: '*'
        });

        const response = await fetch(`${this.apiEndpoint}?${params}`, {
            method: 'GET',
            mode: 'cors'
        });

        const data = await response.json();
        return data.entities;
    }

    /**
     * Search for entities
     */
    async searchEntities(searchTerm, type = 'item', language = 'en', limit = 50) {
        const params = new URLSearchParams({
            action: 'wbsearchentities',
            search: searchTerm,
            type: type,
            language: language,
            limit: limit,
            format: 'json',
            origin: '*'
        });

        const response = await fetch(`${this.apiEndpoint}?${params}`, {
            method: 'GET',
            mode: 'cors'
        });

        const data = await response.json();
        return data.search;
    }

    /**
     * Edit entity (set label, description, aliases)
     */
    async editEntity(entityId, data, summary = 'Edited via Ontology Editor') {
        if (!this.csrfToken) {
            throw new Error('Not authenticated. CSRF token missing.');
        }

        const params = new URLSearchParams({
            action: 'wbeditentity',
            id: entityId,
            data: JSON.stringify(data),
            summary: summary,
            token: this.csrfToken,
            format: 'json',
            origin: '*'
        });

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: params,
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(`Edit failed: ${result.error.info}`);
        }

        return result;
    }

    /**
     * Create new entity
     */
    async createEntity(type, data, summary = 'Created via Ontology Editor') {
        if (!this.csrfToken) {
            throw new Error('Not authenticated. CSRF token missing.');
        }

        const params = new URLSearchParams({
            action: 'wbeditentity',
            new: type, // 'item' or 'property'
            data: JSON.stringify(data),
            summary: summary,
            token: this.csrfToken,
            format: 'json',
            origin: '*'
        });

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: params,
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(`Creation failed: ${result.error.info}`);
        }

        return result;
    }

    /**
     * Set claim (add statement)
     */
    async setClaim(entityId, property, value, summary = 'Added statement via Ontology Editor') {
        if (!this.csrfToken) {
            throw new Error('Not authenticated. CSRF token missing.');
        }

        const claim = {
            mainsnak: {
                snaktype: 'value',
                property: property,
                datavalue: value
            },
            type: 'statement'
        };

        const params = new URLSearchParams({
            action: 'wbsetclaim',
            claim: JSON.stringify(claim),
            summary: summary,
            token: this.csrfToken,
            format: 'json',
            origin: '*'
        });

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: params,
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(`Set claim failed: ${result.error.info}`);
        }

        return result;
    }

    /**
     * Get all classes (all items in the Wikibase)
     */
    async getOntologyClasses() {
        // Get all items (entities starting with Q)
        // Also try to get their "subclass of" relationship if it exists
        const query = `
            SELECT DISTINCT ?class ?classLabel ?parent ?parentLabel WHERE {
                ?class ?p ?o .
                FILTER(STRSTARTS(STR(?class), CONCAT(STR(wd:), "Q")))
                OPTIONAL {
                    ?class wdt:P279 ?parent .
                }
                SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
            }
            ORDER BY ?classLabel
        `;

        try {
            const results = await this.sparqlQuery(query);
            return this.processSparqlResults(results);
        } catch (error) {
            console.error('Failed to fetch ontology classes:', error);
            // Fallback: return empty array
            return [];
        }
    }

    /**
     * Get all properties
     */
    async getAllProperties() {
        const query = `
            SELECT ?property ?propertyLabel ?propertyDescription WHERE {
                ?property a wikibase:Property .
                SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
            }
            ORDER BY ?propertyLabel
        `;

        try {
            const results = await this.sparqlQuery(query);
            return this.processSparqlResults(results);
        } catch (error) {
            console.error('Failed to fetch properties:', error);
            return [];
        }
    }

    /**
     * Process SPARQL results into a more usable format
     */
    processSparqlResults(results) {
        if (!results.results || !results.results.bindings) {
            return [];
        }

        return results.results.bindings.map(binding => {
            const processed = {};
            for (let key in binding) {
                processed[key] = binding[key].value;
            }
            return processed;
        });
    }

    /**
     * Extract entity ID from URI
     */
    extractEntityId(uri) {
        const match = uri.match(/\/(Q|P)\d+$/);
        return match ? match[1] + match[0].split('/').pop().substring(1) : null;
    }
}
