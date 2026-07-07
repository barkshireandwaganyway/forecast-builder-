# RBRTW / EWX Auto Weather Studio

Netlify-ready broadcast forecast builder for RBRTW / EWX.

## Use

Upload the contents of this zip to Netlify or GitHub. This build now includes a Netlify Function for weather/map proxy support, so keep the `netlify/functions/proxy.js` file with the site.

Files/folders included:

- `index.html`
- `style.css`
- `app.js`
- `netlify.toml`
- `README.md`
- `netlify/functions/proxy.js`

## Product modes

The left panel includes **Product Type**. Forecast Day Builder keeps the 1-10 day forecast cards. The other product modes generate separate landscape broadcast slides:

- Storm Hazards Index
- Temperatures Map
- Rain Chances Ahead
- Severe Storm Outlook
- Air Quality Index
- Future Dew Points
- Heat Index Map
- Clouds + Radar Snapshot

Selecting a product type now automatically tries to fetch the product data. Use **Auto Fill Product** or **Re-fetch Map + Product Data** to reload the map/data.

## V10 fixes

- Product maps now use a dedicated product layout instead of reusing the day-card grid.
- Storm Hazards Index is split map + hazard bars.
- Temperature, dew point, heat index, severe outlook, and radar products use full map layouts.
- Rain Chances and AQI use full panel layouts.
- Product switching now automatically triggers data loading.
- Regional map backgrounds are fetched through the Netlify proxy when available.
- NOAA/SPC/MRMS imagery is fetched through the proxy when available to avoid browser CORS/export issues.
- Open-Meteo and NWS API calls also use the proxy fallback when needed.

## Data notes

- Forecast cards use the NWS API, point forecast, hourly forecast, grid data, and active alerts.
- Hazard products are derived from NWS alerts, NWS forecast text, rain chances, QPF, wind gusts, and editable RBRTW logic.
- Regional temperature/dewpoint/heat-index map point fills use Open-Meteo forecast data when Auto Fill Product is clicked.
- Air Quality uses Open-Meteo U.S. AQI forecast data.
- Clouds + Radar Snapshot attempts to pull the NOAA/NWS MRMS radar map service.
- Severe Storm Outlook attempts to pull the NOAA/NWS SPC Weather Outlooks map service.
- If an external service is unavailable, the product still renders an export-safe fallback layer and tells you in the status badge.

## Export

Export PNG captures the slide only at 1920x1080. Editing panels are excluded.
