# IMPLEMENTATION TASK: INDIAN LOCATION RESOLUTION & ADMINISTRATIVE HIERARCHY

## Objective

Implement a production-structured but hackathon-sized Indian Location Resolution system for the RTI assistant.

The current RTI agent has a critical capability gap:

The LLM can understand that a user mentioned a location such as:

- "Nerul"
- "Nerul, Navi Mumbai"
- "Sanpada"
- "Khanderi"
- "my village near Satara"
- "Pune"
- "Mira Road"
- "Mere gaon mein..."
- Marathi/Hindi/English mixed location descriptions

but it currently has NO reliable mechanism to determine:

- exact location
- state
- district
- division
- city/locality
- sublocality
- taluka/sub-district
- village
- pincode
- LGD codes
- whether the location is urban or rural
- administrative hierarchy
- whether the location is ambiguous
- which government jurisdiction the location belongs to

DO NOT allow the LLM to guess these values from its own knowledge.

The LLM may extract the user's location phrase, but external location-resolution tools and government datasets must resolve the actual administrative hierarchy.

---

# 1. CORE DESIGN PRINCIPLE

Use a multi-source location resolution architecture:

USER INPUT
    ↓
LLM extracts location phrase
    ↓
Location Resolution Tool
    ↓
Google Geocoding / Places
    ↓
Government Administrative Data
    ↓
LGD hierarchy matching
    ↓
Optional OpenStreetMap/Nominatim fallback
    ↓
Confidence + ambiguity resolution
    ↓
Structured Indian Administrative Location
    ↓
Authority Resolution
    ↓
RTI Workflow

IMPORTANT:

Google Maps is NOT the final authority for Indian administrative hierarchy.

Google is used primarily for:
- geocoding
- place-name resolution
- coordinates
- address components
- candidate locations
- locality/sublocality identification

Government datasets, especially India's Local Government Directory (LGD), should be used to establish:
- State
- District
- Sub-District/Taluka
- Village
- Local Government
- LGD codes
- administrative relationships

The system must preserve source provenance for every resolved field.

---

# 2. GOVERNMENT DATA SOURCE

Use the Government of India's Local Government Directory (LGD) as the primary administrative hierarchy dataset.

LGD is maintained under the Ministry of Panchayati Raj and is specifically intended to maintain information about:
- States
- Districts
- Sub-Districts
- Villages
- Blocks
- Rural Local Governments
- Urban Local Governments
- Local Government Bodies
- LGD codes

Government OGD/Data.gov.in exposes LGD datasets including:
- LGD States
- LGD Districts
- LGD Sub-Districts
- LGD Villages
- LGD Local Bodies
- LGD Local Bodies with PIN codes

Use the official Government datasets wherever practical.

Relevant official sources:

- Local Government Directory:
  https://lgdirectory.gov.in/

- Government of India OGD LGD catalog:
  https://www.data.gov.in/catalog/local-government-directory-lgd

- LGD District dataset:
  https://www.data.gov.in/resource/local-government-directory-lgd-districts

- LGD Sub-District dataset:
  https://www.data.gov.in/resource/local-government-directory-lgd-sub-districts

- LGD Local Bodies dataset:
  https://www.data.gov.in/resource/local-government-directory-lgd-local-bodies

The OGD LGD catalog states that LGD contains revenue entities such as districts, sub-districts and villages and local government information.

Do NOT assume that a public REST API exists for every LGD dataset.

If a dataset exposes a downloadable CSV/JSON/resource API, use it.

If an official API is unavailable, create a local normalized database from the official downloadable LGD dataset.

For the hackathon MVP, this is acceptable and preferable to depending on an unreliable live government endpoint.

---

# 3. GOOGLE LOCATION RESOLUTION

Implement a server-side Google Geocoding integration.

Google Geocoding API should be used to resolve natural-language locations.

Examples:

"Nerul Navi Mumbai"
"Sanpada"
"Nerul, Maharashtra"
"Pune"
"near Nerul station"
"Village XYZ, Satara, Maharashtra"

Use Google's structured address components.

DO NOT parse Google's formatted address string manually.

Use address_components / structured fields returned by the API.

Extract, when available:

- country
- administrative area
- locality
- sublocality
- neighborhood
- postal code
- coordinates
- place ID
- formatted address
- administrative area levels

Google's API may not return every Indian administrative level.

Therefore:

DO NOT assume:

administrative_area_level_1 = state
administrative_area_level_2 = district
administrative_area_level_3 = taluka

as a universal rule.

Map Google's components based on actual returned types and then reconcile them with Indian government data.

Google documentation explicitly states that administrative levels are country-dependent.

---

# 4. OPTIONAL GOOGLE PLACES / AUTOCOMPLETE

If practical within the existing architecture, support Google Places Autocomplete for interactive manual input.

Example:

User types:

"Ner..."

Show:

- Nerul, Navi Mumbai, Maharashtra
- Nerul, ...

The user may select a candidate.

However:

Autocomplete is NOT required for the core implementation if time is limited.

The core tool must work from raw text.

---

# 5. OPEN SOURCE FALLBACK

Implement Nominatim/OpenStreetMap as a fallback resolver.

Resolution order:

1. Google Geocoding
2. Government/LGD matching
3. Nominatim/OpenStreetMap fallback
4. Local normalized government dataset
5. Return ambiguous/unresolved state

Nominatim should NOT be treated as the authoritative administrative source.

It is only another geospatial resolver.

Respect Nominatim usage policies and rate limits.

Cache successful responses.

Do not repeatedly call the public Nominatim service for the same query.

---

# 6. LOCAL GOVERNMENT DATA NORMALIZATION

Create a normalized administrative-location data model.

At minimum support:

State
District
Division
SubDistrict/Taluka
Block
Village
City/Town
Urban Local Body
Rural Local Body
Ward
Pincode
LGD codes

The schema must be flexible because urban and rural India have different administrative structures.

DO NOT force every location into:

State → District → City → Village

Instead support multiple hierarchy branches.

Example:

URBAN:

State
 ↓
District
 ↓
City
 ↓
Municipal Corporation
 ↓
Ward
 ↓
Locality/Sublocality

RURAL:

State
 ↓
District
 ↓
Sub-District/Taluka
 ↓
Block
 ↓
Village
 ↓
Gram Panchayat

---

# 7. DATA MODEL

Create a database model similar to:

AdministrativeLocation

Fields:

- id
- name
- normalizedName
- localName
- entityType
- stateCode
- districtCode
- subDistrictCode
- blockCode
- villageCode
- lgdCode
- pincode
- latitude
- longitude
- parentId
- source
- sourceId
- aliases
- isActive
- metadata
- createdAt
- updatedAt

entityType enum should support:

- STATE
- DISTRICT
- DIVISION
- SUB_DISTRICT
- TALUKA
- TEHSIL
- BLOCK
- VILLAGE
- CITY
- TOWN
- LOCALITY
- SUBLOCALITY
- MUNICIPAL_CORPORATION
- MUNICIPAL_COUNCIL
- NAGAR_PANCHAYAT
- GRAM_PANCHAYAT
- WARD
- PINCODE

Do not duplicate records unnecessarily.

Use canonical IDs and aliases.

---

# 8. LOCATION RESOLUTION TOOL

Create a LangGraph tool:

resolve_indian_location

Tool input:

{
  query: string,

  context?: {
    state?: string,
    district?: string,
    city?: string,
    pincode?: string
  },

  language?: string
}

The tool should:

1. Receive the raw location phrase.
2. Normalize spelling/transliteration where appropriate.
3. Query Google Geocoding.
4. Extract Google address components.
5. Resolve coordinates/place information.
6. Search the local LGD/government administrative dataset.
7. Match Google candidates to LGD entities.
8. Resolve parent-child relationships.
9. Use Nominatim if Google/LGD matching is insufficient.
10. Generate a confidence score.
11. Detect ambiguity.
12. Return structured administrative hierarchy.
13. Return source provenance.
14. Never hallucinate missing fields.

---

# 9. TOOL OUTPUT

Return a structure similar to:

{
  "status": "resolved | ambiguous | not_found",

  "confidence": 0.94,

  "source": {
    "geocoder": "google",
    "administrative": "lgd",
    "fallback": null
  },

  "originalQuery": "Nerul, Navi Mumbai",

  "resolved": {
    "formattedAddress": "...",

    "country": {
      "name": "India",
      "code": "IN"
    },

    "state": {
      "name": "...",
      "lgdCode": "..."
    },

    "division": {
      "name": "...",
      "lgdCode": "..."
    },

    "district": {
      "name": "...",
      "lgdCode": "..."
    },

    "subDistrict": {
      "name": "...",
      "lgdCode": "..."
    },

    "taluka": {
      "name": "...",
      "lgdCode": "..."
    },

    "block": {
      "name": "...",
      "lgdCode": "..."
    },

    "city": {
      "name": "..."
    },

    "locality": {
      "name": "..."
    },

    "sublocality": {
      "name": "..."
    },

    "village": {
      "name": "...",
      "lgdCode": "..."
    },

    "pincode": "...",

    "urbanLocalBody": {
      "name": "...",
      "lgdCode": "..."
    },

    "ruralLocalBody": {
      "name": "...",
      "lgdCode": "..."
    },

    "ward": {
      "name": "...",
      "lgdCode": "..."
    },

    "coordinates": {
      "latitude": 0,
      "longitude": 0
    }
  },

  "candidates": []
}

Do not include fields that are unknown as fake values.

Use null for unavailable values.

---

# 10. CONFIDENCE SYSTEM

Implement deterministic confidence logic.

Do NOT let the LLM arbitrarily choose the confidence score.

Example:

High confidence:
- Google result strongly matches
- state agrees with LGD
- district agrees with LGD
- locality/entity matches
- parent hierarchy is valid

Medium confidence:
- place found
- some administrative levels missing
- reasonable LGD match

Low confidence:
- multiple matching places
- inconsistent state/district
- weak geocoding match
- only generic place name

Suggested behavior:

confidence >= 0.90:
    resolve and show confirmation

0.70 <= confidence < 0.90:
    show resolved hierarchy and ask user to confirm

confidence < 0.70:
    ask user for additional information

status = ambiguous:
    ALWAYS ask the user to choose.

---

# 11. NEVER SILENTLY RESOLVE AMBIGUITY

Example:

User:

"Nerul"

If multiple candidates exist:

Show:

"Which location do you mean?"

Candidate cards:

1. Nerul, Navi Mumbai, Maharashtra
2. Nerul, another location

Do not silently choose.

Similarly:

User:

"Khanderi"

If the location is ambiguous, ask for:
- city
- district
- state
- nearby landmark
- pincode

The assistant should ask the minimum additional question necessary.

---

# 12. LOCATION CONFIRMATION UI

After resolution, show the user a simple confirmation card.

Example:

Location identified

Nerul
Navi Mumbai
Maharashtra
India

Administrative details:
District: ______
Sub-District/Taluka: ______
Pincode: ______

[Confirm location]
[Change location]

Do not expose technical source information by default.

The user should not see:

"Google confidence 0.93"

unless useful in debugging/admin mode.

The citizen should see plain language.

---

# 13. LOCATION → AUTHORITY PIPELINE

This is extremely important.

The resolved location must be passed into the RTI authority resolver.

The pipeline should become:

USER
 ↓
Intent Extraction
 ↓
Location Extraction
 ↓
resolve_indian_location
 ↓
Validated Administrative Location
 ↓
Authority Resolver
 ↓
Department
 ↓
Public Authority
 ↓
RTI Rules RAG
 ↓
Draft Generation
 ↓
Validation
 ↓
User Confirmation
 ↓
Mock Submission

The authority resolver must NOT independently guess the district.

It must consume the structured location returned by `resolve_indian_location`.

---

# 14. AUTHORITY SEARCH FILTERING

Use structured administrative fields as filters.

Example:

{
  state: "Maharashtra",
  district: "...",
  subDistrict: "...",
  city: "Navi Mumbai",
  category: "roads"
}

Then query the authority database.

The system should prioritize:

1. Exact district match
2. Exact sub-district/taluka match
3. City/local-body match
4. Service/category match
5. State match

Then use RAG to retrieve official supporting documents.

---

# 15. DO NOT USE RAG AS THE GEOGRAPHY DATABASE

Pinecone/RAG should NOT be the primary location hierarchy system.

Use:

DATABASE:
- structured government hierarchy
- LGD codes
- parent-child relationships
- pincode mappings
- authority mappings

Use RAG:
- RTI rules
- department instructions
- authority instructions
- official explanatory documents

Use Google:
- geocoding
- coordinates
- place resolution

Use Nominatim:
- fallback geocoding

Use Gemini:
- understand user language
- extract location phrase
- interpret intent
- generate explanations
- generate RTI draft

Use LangGraph:
- orchestrate the workflow

---

# 16. PINCODE HANDLING

Pincode is useful but must NOT be treated as a perfect substitute for administrative hierarchy.

If user gives:

"400706"

use it as an additional resolution signal.

Combine:

pincode
+
place name
+
city
+
state
+
coordinates

Do not blindly map every pincode to one district if the official data shows multiple localities.

If pincode data is available from official government datasets, use it.

---

# 17. GOVERNMENT DATA INGESTION

Create a reusable ingestion process.

Example:

scripts/
  location/
    ingest-lgd-states
    ingest-lgd-districts
    ingest-lgd-subdistricts
    ingest-lgd-villages
    ingest-lgd-local-bodies
    normalize-location-data
    build-location-index

The ingestion process should:

1. Download/read official LGD dataset.
2. Validate schema.
3. Normalize names.
4. Normalize local-language names where available.
5. Create canonical IDs.
6. Preserve LGD codes.
7. Create parent-child relationships.
8. Build aliases.
9. Insert/update database.
10. Record dataset source and update date.

Do not hardcode the entire Indian administrative hierarchy into TypeScript.

---

# 18. HACKATHON SCOPE

This is a hackathon implementation.

Do NOT spend the remaining project time attempting to create perfect nationwide geospatial coverage.

The architecture must be nationwide-ready, but the working demo can prioritize:

Maharashtra

especially:

- Navi Mumbai
- Nerul
- Sanpada
- Mumbai
- Pune
- Satara
- selected rural locations

The data model must remain capable of handling all India.

If official LGD datasets can be imported quickly, import them.

If importing the entire dataset risks breaking the project or consuming too much time:

prioritize Maharashtra for the demo while keeping the ingestion pipeline extensible.

---

# 19. MULTILINGUAL LOCATION INPUT

The system must support location phrases in:

- English
- Hindi
- Marathi
- Hinglish
- Marathi-English mixed input
- Hindi-English mixed input

Examples:

"Mera gaon Satara ke paas hai"

"मेरा गाँव सातारा में है"

"मला Nerul मध्ये RTI करायची आहे"

"Sanpada Navi Mumbai"

"नवी मुंबई नेरुळ"

The LLM should extract the original location phrase.

Do not rely on exact English spelling.

Use aliases/transliteration during matching.

Preserve original user wording for audit/debugging.

---

# 20. LOCATION EXTRACTION OUTPUT

Before calling the resolver, the LLM should produce structured extraction:

{
  "locationMentioned": true,
  "locationText": "Nerul, Navi Mumbai",
  "possibleContext": {
    "state": null,
    "district": null,
    "city": "Navi Mumbai"
  }
}

The LLM must NOT fill:

district
taluka
village
LGD code

unless those are explicitly stated by the user.

Those fields must come from the resolution tools/data.

---

# 21. LOCATION PROVENANCE

Every resolved field should be traceable.

Example:

{
  "district": {
    "value": "...",
    "source": "LGD",
    "sourceId": "...",
    "confidence": 0.98
  }
}

Possible source values:

- GOOGLE_GEOCODING
- GOOGLE_PLACES
- LGD
- DATA_GOV_IN
- NOMINATIM
- USER_CONFIRMED

If Google says one district and LGD says another:

DO NOT silently choose.

Mark:

"source_conflict"

and ask the user or apply a deterministic resolution rule only when the government hierarchy clearly resolves the conflict.

---

# 22. CACHING

Location resolution can be expensive.

Implement caching.

Cache key should be normalized query + relevant context.

Example:

"nerul|navi mumbai|maharashtra"

Cache:

- Google result
- normalized hierarchy
- LGD match
- final resolution

Use an appropriate TTL for external geocoding results consistent with provider terms.

Do not create uncontrolled API calls.

---

# 23. API SECURITY

All Google API calls must happen server-side.

Never expose the unrestricted Google server API key to the browser.

Environment variables:

GOOGLE_MAPS_API_KEY=

Optional:

NOMINATIM_BASE_URL=

Do not hardcode keys.

Add `.env.example`.

---

# 24. ERROR HANDLING

Handle:

Google API unavailable
Google quota exceeded
Nominatim unavailable
LGD dataset unavailable
No location found
Multiple locations found
Conflicting sources
Missing district
Missing pincode
Missing taluka
Rural location
Urban location
Mixed-language input

The application must degrade gracefully.

Example:

If Google fails but local LGD matching succeeds:

continue.

If Google and LGD both fail:

ask the user for more information.

Never fabricate a location.

---

# 25. DEMO SCENARIOS

The implementation must support these demo cases.

## Scenario A

Input:

"I have a road problem in Nerul, Navi Mumbai."

Expected:

Location:
Nerul
Navi Mumbai
Maharashtra
India

Then determine the relevant administrative hierarchy.

Then pass the resolved location to authority resolution.

---

## Scenario B

Input:

"Sanpada mein road ka problem hai."

Expected:
Resolve Sanpada using context and external data.

Do not ask for district if the system can reliably resolve it.

---

## Scenario C

Input:

"मुझे मेरे गाँव में सड़क के काम की जानकारी चाहिए। गाँव सातारा में है।"

Expected:
Extract:
village context + Satara

Ask only for missing information if necessary.

---

## Scenario D

Input:

"Khanderi"

If ambiguous:

DO NOT guess.

Ask:

"Which Khanderi do you mean?"

---

# 26. UI REQUIREMENT

Do not make this feature look like a developer tool.

The citizen experience should be:

User says location
 ↓
"Finding your location..."
 ↓
Location card
 ↓
"Is this your location?"
 ↓
Confirm / Change

Keep technical details hidden.

---

# 27. LANGGRAPH INTEGRATION

Add a dedicated location-resolution node/tool.

Suggested graph:

START
 ↓
extract_intent
 ↓
extract_location
 ↓
resolve_indian_location
 ↓
location_confidence_check
 ├── ambiguous → ask_location_clarification
 ├── low_confidence → ask_location_details
 └── resolved
       ↓
resolve_authority
       ↓
retrieve_rti_rules
       ↓
generate_rti_draft
       ↓
validate_rti_draft
       ↓
user_confirmation
       ↓
mock_submit
       ↓
END

The location resolver should be a deterministic tool.

Do not create an autonomous "location agent."

---

# 28. TESTING

Create tests for:

- exact city
- locality + city
- locality without city
- village + district
- pincode
- Hindi
- Marathi
- Hinglish
- ambiguous location
- unknown location
- Google failure
- LGD mismatch
- missing district
- missing pincode
- urban location
- rural location

At minimum create test fixtures for:

Nerul
Sanpada
Navi Mumbai
Pune
Satara
one Maharashtra rural village

Test that the final authority resolver receives structured location data.

---

# 29. SUCCESS CRITERIA

The implementation is complete when:

1. The agent can extract a location phrase from natural language.
2. `resolve_indian_location` can resolve Indian locations.
3. Google Geocoding is integrated server-side.
4. Government LGD data can be queried locally.
5. Google results can be matched against LGD hierarchy.
6. The system can return district when Google alone does not reliably provide it.
7. The system can return sub-district/taluka when available.
8. The system can return village when applicable.
9. Pincode can be resolved when available.
10. LGD codes are preserved when available.
11. Urban/rural hierarchy is supported.
12. Ambiguous locations are never silently selected.
13. The user can confirm or correct the resolved location.
14. The resolved location is passed into authority resolution.
15. Location resolution does not depend on LLM factual knowledge.
16. No API keys are exposed client-side.
17. Location results are cached.
18. The existing RTI workflow continues to work.
19. The implementation does not unnecessarily expand the rest of the project.

---

# 30. PRIORITY ORDER

Because this is a time-constrained hackathon, implement in this order:

P0:
- Location tool interface
- Google geocoding
- LGD/local administrative dataset
- structured location output
- district resolution
- ambiguity handling
- LangGraph integration

P1:
- sub-district/taluka
- village
- pincode
- LGD codes
- caching
- location confirmation UI

P2:
- Nominatim fallback
- multilingual aliases
- richer urban/rural mapping
- Places Autocomplete

Do NOT work on unrelated project features until P0 is functional.

---

# 31. IMPORTANT ARCHITECTURAL RULE

Do not modify the entire RTI architecture unnecessarily.

Add the location capability as a clean module:

Location Resolver
    ↓
Administrative Hierarchy
    ↓
Authority Resolver

The existing:
- RAG
- RTI rules
- draft generation
- mock submission
- frontend flow

should continue working.

---

# 32. FINAL PRODUCT PRINCIPLE

The citizen should be able to say:

"I have a problem in Nerul."

without knowing:

- district
- taluka
- department
- public authority
- government hierarchy
- RTI jurisdiction

The system should do the hard work.

The citizen should only confirm:

"This is my location."

Then:

"This is what I want to ask."

That is the intended experience.

Do not turn this into a generic maps feature.

This is a core part of the RTI assistant's differentiator:

THE CITIZEN KNOWS WHAT HAPPENED.
THE SYSTEM FIGURES OUT WHERE IT BELONGS.
THE SYSTEM THEN FIGURES OUT WHO TO ASK.

Implement this feature completely, integrate it with the existing LangGraph workflow, update the relevant architecture/context documentation after implementation, and do not expand scope beyond what is required above.