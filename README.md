# RBRTW / EWX Auto Weather Studio

Desktop landscape broadcast forecast builder for RBRTW/EWX.

## Deploy on Netlify

Upload the full contents of this zip to the root of the GitHub repo connected to Netlify.

Required structure:

```text
index.html
style.css
app.js
netlify.toml
README.md
netlify/functions/proxy.js
```

Do not delete the `netlify/functions/proxy.js` file. It is used for weather image/data fetches that browsers often block directly.

## This update

- Rebuilt forecast-card alignment rules for 1 to 10 day graphics.
- Header, body, day-card rows, lower modules, and footer now use a locked 1920x1080 layout.
- 8 to 10 day layouts now prioritize readable bottom data and less random blank space.
- Empty future days no longer show fake data blocks.
- Forecast title auto-updates when the day count changes if the title is still the default format.
- Export now renders from the same locked slide layout used by the preview.
- Product slides have stable map/chart panels.
- Product map modes include map key on/off, X/Y placement, city label on/off, source bar controls, and custom map image URL/upload.
- Air Quality and Rain Chance Ahead remain as chart-style product slides with fixed placement.
