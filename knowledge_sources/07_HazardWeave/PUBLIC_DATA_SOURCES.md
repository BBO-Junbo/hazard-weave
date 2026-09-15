# HazardWeave public and partner data sources

HazardWeave organizes map content using the six evidence categories defined in the project proposal. Public/open feeds are connected where a stable machine-readable source is available. Partner-restricted data is represented only as an integration slot; no synthetic operational records are fabricated.

## 1. Remote sensing and aerial imagery

### TDOT aerial imagery
- Role: Tennessee-focused high-resolution aerial basemap
- Access: Tennessee imagery service

### USDA NAIP
- Role: national aerial imagery mosaic and fallback imagery source
- Access: USDA NAIP cached imagery service

### Dark reference map
- Role: global streets/labels reference and visual fallback outside imagery coverage

## 2. Climate and hydrologic signals

Connected layers include FEMA NFHL flood hazard/floodway, USGS stream gauges, NOAA/NWS observed flood status and river forecasts, and NOAA National Water Model 12-hour high-water guidance.

## 3. Volunteered geographic information (VGI)

### OpenStreetMap community resources
- Geography: volunteer-mapped point locations
- Categories: hospitals, clinics, shelters, fire stations, police, social facilities and community centres
- Access: Overpass API with retry across public instances
- Important: this is a community-resource baseline, not a live help-request feed

## 4. Help requests

### Tennessee 211 / local 311
- Status: integration slot only
- Requirement: partner agreement or a documented machine-readable feed
- Privacy: use de-identified, aggregated records whenever possible
- Important: HazardWeave does not fabricate request-level records while no feed is connected

## 5. Relevant insurance and assistance information

### OpenFEMA NFIP Claims v3
- Geography: FEMA-provided approximate coordinates
- Display: grouped clusters, never exact property locations
- Metrics: record count and net claim payments represented by returned records

### FEMA Registration Intake and Individuals Household Program (RI-IHP) v2
- Geography: joined to Census ZIP Code Tabulation Areas for map display
- Metrics: registrations and available assistance amounts

NFIP Policy Records are intentionally not included in the current dashboard.

## 6. Socioeconomic and vulnerability indicators

### CDC Social Vulnerability Index 2022
- Geography: census tract
- Display: overall SVI percentile (`RPL_THEMES`)
- Source: CDC/ATSDR/GRASP ArcGIS Feature Service

### ACS-derived socioeconomic indicators
- Geography: census tract
- Source path: CDC/ATSDR SVI 2022 tract Feature Service
- Underlying socioeconomic estimates: 2018–2022 ACS 5-year
- Indicators used by HazardWeave: poverty, unemployment, housing-cost burden, uninsured population, households with no vehicle, total population, and socioeconomic-theme percentile
- Important: this layer is not labeled as 2024 ACS and should not be interpreted as 2020–2024 ACS estimates

## Intentionally not included

- NOAA Partner FIM
- SBA Disaster Loans
- NFIP Policy Records
- Waze for Cities until an eligible partner connection is available
