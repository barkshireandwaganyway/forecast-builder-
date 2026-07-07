# RBRTW / EWX Auto Weather Studio

Desktop landscape broadcast-style forecast and product slide builder.

## Use on Netlify

Upload the full contents of this zip, preserving this folder path:

```text
netlify/functions/proxy.js
```

Required files:

```text
index.html
style.css
app.js
netlify.toml
README.md
netlify/functions/proxy.js
```

Use GitHub deploy or a Netlify deploy that preserves the `netlify/functions` folder. The proxy function is needed for external NOAA/NWS/SPC/MRMS/Open-Meteo map/data pulls and for PNG export safety.

## Current product modes

- Forecast Day Builder
- Storm Hazards Index
- Temperatures Map
- Rain Chances Ahead
- Severe Storm Outlook
- Current Air Quality
- Future Dew Points
- Heat Index Map
- Clouds + Radar Snapshot

## Product editor controls

The Product tab includes:

- Re-fetch Map + Product Data
- Product title/subtitle
- Summary and source note
- Optional custom map image URL
- Show/hide generated map color field
- Map image opacity
- Generated field opacity
- Show/hide city labels
- Show/hide map key
- Map key X/Y sliders
- Show/hide pressure/front overlay
- Front X/Y/angle/length sliders
- Show/hide source bar
- Source bar X/Y/width sliders
- Manual city value overrides

## Notes

If a NOAA/SPC/MRMS map image is blocked or unavailable, the app now keeps a stable editable fallback map layer instead of breaking the layout.
