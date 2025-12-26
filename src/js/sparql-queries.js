/**
 * SPARQL Query Builders
 * Constructs SPARQL queries for the form generator pipeline
 */

/**
 * Build query to extract all properties from an exemplar item
 */
function buildExemplarPropertiesQuery(config, exemplarId) {
    return `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX wdt: <${config.wikibase.url}/prop/direct/>
        PREFIX p: <${config.wikibase.url}/prop/>
        PREFIX ps: <${config.wikibase.url}/prop/statement/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>

        SELECT DISTINCT ?property ?propertyLabel ?propertyDescription ?datatype
        WHERE {
            # Get all statements from the exemplar item
            wd:${exemplarId} ?propertyDirect ?value .

            # Get the property details
            ?property wikibase:directClaim ?propertyDirect .
            ?property wikibase:propertyType ?datatype .

            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "en" .
            }
        }
        ORDER BY ?propertyLabel
    `;
}

/**
 * Build query to get qualifiers mapped to property values from exemplar
 * This discovers which qualifiers appear with which values
 */
function buildPropertyQualifiersQuery(config, exemplarId, propertyId) {
    return `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX wdt: <${config.wikibase.url}/prop/direct/>
        PREFIX p: <${config.wikibase.url}/prop/>
        PREFIX ps: <${config.wikibase.url}/prop/statement/>
        PREFIX pq: <${config.wikibase.url}/prop/qualifier/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?mainValue ?mainValueLabel ?mainValueType ?qualifier ?qualifierLabel ?qualifierDatatype
        WHERE {
            # Get statements for this property
            wd:${exemplarId} p:${propertyId} ?statement .

            # Get the main value of the statement
            ?statement ps:${propertyId} ?mainValue .

            # Get the Instance Of type for the main value (if it's an item)
            OPTIONAL {
                ?mainValue wdt:${config.properties.instanceOf} ?mainValueType .
            }

            # Get qualifiers on those statements
            ?statement ?qualifierProp ?qualifierValue .

            # Get the qualifier property details
            ?qualifier wikibase:qualifier ?qualifierProp .
            ?qualifier wikibase:propertyType ?qualifierDatatype .

            # Get labels
            OPTIONAL { ?mainValue rdfs:label ?mainValueLabel . FILTER(LANG(?mainValueLabel) = "en") }

            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "en" .
            }
        }
        ORDER BY ?mainValueLabel ?qualifierLabel
    `;
}

/**
 * Build query to get all values for a WikibaseItem property
 * This discovers Instance Of types from the EXEMPLAR's property values,
 * then returns ALL items of those types (even if not yet used in the property)
 */
function buildPropertyValuesQuery(config, propertyId, instanceOfValue, exemplarId) {
    return `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX wdt: <${config.wikibase.url}/prop/direct/>
        PREFIX p: <${config.wikibase.url}/prop/>
        PREFIX ps: <${config.wikibase.url}/prop/statement/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>

        SELECT DISTINCT ?value ?valueLabel ?instanceOf
        WHERE {
            # ONLY look at the exemplar item to discover Instance Of types
            # This prevents pollution from other unrelated items in the database
            wd:${exemplarId} wdt:${propertyId} ?sampleValue .

            # Get the Instance Of type for each sample value from the exemplar
            ?sampleValue wdt:${config.properties.instanceOf} ?instanceOf .

            # Now get ALL items that have ANY of these Instance Of types
            # This includes items not yet used in the property
            ?value wdt:${config.properties.instanceOf} ?instanceOf .

            # Ensure value is an item (not a literal)
            FILTER(isIRI(?value))

            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "en" .
            }
        }
        ORDER BY ?valueLabel
    `;
}

/**
 * Build query to get all possible values for a WikibaseItem qualifier
 * This discovers the Instance Of type from existing qualifier values
 * and returns all items of that type
 */
function buildQualifierValuesQuery(config, qualifierId) {
    return `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX wdt: <${config.wikibase.url}/prop/direct/>
        PREFIX p: <${config.wikibase.url}/prop/>
        PREFIX pq: <${config.wikibase.url}/prop/qualifier/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>

        SELECT DISTINCT ?value ?valueLabel ?instanceOf
        WHERE {
            # Get any statement with this qualifier
            ?statement pq:${qualifierId} ?sampleValue .

            # Get the Instance Of for this sample value
            ?sampleValue wdt:${config.properties.instanceOf} ?instanceOf .

            # Now get ALL items of this same type
            ?value wdt:${config.properties.instanceOf} ?instanceOf .

            # Ensure value is an item (not a literal)
            FILTER(isIRI(?value))

            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "en" .
            }
        }
        ORDER BY ?valueLabel
    `;
}

/**
 * Build query to get item data with qualifiers for editing mode
 */
function buildItemDataQuery(config, itemId) {
    return `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX p: <${config.wikibase.url}/prop/>
        PREFIX ps: <${config.wikibase.url}/prop/statement/>
        PREFIX pq: <${config.wikibase.url}/prop/qualifier/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>

        SELECT ?property ?propertyLabel ?statement ?value ?valueLabel ?datatype
               ?qualifier ?qualifierLabel ?qualifierValue ?qualifierValueLabel ?qualifierDatatype
        WHERE {
            # Get all statements from this item
            wd:${itemId} ?p ?statement .

            # Get the property
            ?property wikibase:claim ?p .
            ?property wikibase:statementProperty ?ps .
            ?property wikibase:propertyType ?datatype .

            # Get the main value
            ?statement ?ps ?value .

            # Get property labels
            OPTIONAL {
                ?property rdfs:label ?propertyLabel .
                FILTER(LANG(?propertyLabel) = "en")
            }

            # Get value labels (for WikibaseItem values)
            OPTIONAL {
                ?value rdfs:label ?valueLabel .
                FILTER(LANG(?valueLabel) = "en")
            }

            # Get qualifiers (optional)
            OPTIONAL {
                ?statement ?pq ?qualifierValue .
                ?qualifier wikibase:qualifier ?pq .
                ?qualifier wikibase:propertyType ?qualifierDatatype .

                OPTIONAL {
                    ?qualifier rdfs:label ?qualifierLabel .
                    FILTER(LANG(?qualifierLabel) = "en")
                }

                OPTIONAL {
                    ?qualifierValue rdfs:label ?qualifierValueLabel .
                    FILTER(LANG(?qualifierValueLabel) = "en")
                }
            }
        }
        ORDER BY ?propertyLabel ?statement
    `;
}

/**
 * Build query to get item's Instance Of value
 */
function buildInstanceOfQuery(config, itemId) {
    return `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX wdt: <${config.wikibase.url}/prop/direct/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?instanceOf ?instanceOfLabel
        WHERE {
            wd:${itemId} wdt:${config.properties.instanceOf} ?instanceOf .

            OPTIONAL {
                ?instanceOf rdfs:label ?instanceOfLabel .
                FILTER(LANG(?instanceOfLabel) = "en")
            }
        }
        LIMIT 1
    `;
}

/**
 * Build query to get label and description
 */
function buildLabelDescriptionQuery(config, itemId) {
    return `
        PREFIX wd: <${config.wikibase.url}/entity/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX schema: <http://schema.org/>

        SELECT ?label ?description
        WHERE {
            OPTIONAL {
                wd:${itemId} rdfs:label ?label .
                FILTER(LANG(?label) = "en")
            }
            OPTIONAL {
                wd:${itemId} schema:description ?description .
                FILTER(LANG(?description) = "en")
            }
        }
        LIMIT 1
    `;
}

/**
 * Execute SPARQL query
 */
async function executeSparqlQuery(endpoint, query) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: 'query=' + encodeURIComponent(query)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('SPARQL query failed:', response.status, errorText);
        throw new Error(`SPARQL query failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results.bindings;
}
