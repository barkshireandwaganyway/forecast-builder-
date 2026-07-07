'use strict';

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const WEATHER_ICONS = [
  ['sunny', '☀️', 'Sunny'], ['mostly-sunny', '🌤️', 'Mostly Sunny'], ['partly-cloudy', '⛅', 'Partly Cloudy'],
  ['cloudy', '☁️', 'Cloudy'], ['fog', '🌫️', 'Fog / Haze'], ['rain', '🌧️', 'Rain'], ['showers', '🌦️', 'Showers'],
  ['storms', '⛈️', 'Storms'], ['severe', '🌩️', 'Severe Storms'], ['snow', '❄️', 'Snow'], ['mix', '🌨️', 'Wintry Mix'],
  ['ice', '🧊', 'Ice'], ['wind', '💨', 'Windy'], ['heat', '🔥', 'Heat'], ['dust', '🌫️', 'Dust / Smoke'],
  ['tropical', '🌀', 'Tropical'], ['moon', '🌙', 'Clear Night']
];

const HAZARD_OPTIONS = [
  '', 'SEASONABLE', 'ABOVE NORMAL', 'BELOW NORMAL', 'HUMID', 'VERY HUMID', 'OPPRESSIVE',
  'DANGEROUS HEAT', 'HEAT ADVISORY', 'EXCESSIVE HEAT WARNING', 'HEAT INDEX',
  'STORM CHANCE', 'STRONG STORMS', 'SEVERE STORM RISK', 'MARGINAL RISK', 'SLIGHT RISK', 'ENHANCED RISK', 'MODERATE RISK', 'HIGH RISK',
  'TORNADO WATCH', 'TORNADO WARNING', 'SEVERE THUNDERSTORM WATCH', 'SEVERE THUNDERSTORM WARNING',
  'HEAVY RAIN POSSIBLE', 'FLOOD WATCH', 'FLOOD WARNING', 'FLASH FLOOD WARNING', 'FLASH FLOOD EMERGENCY',
  'WIND ADVISORY', 'HIGH WIND WARNING', 'DUST ADVISORY', 'DUST STORM WARNING', 'BLOWING DUST',
  'DENSE FOG ADVISORY', 'LOW VISIBILITY', 'FROST ADVISORY', 'FREEZE WARNING', 'HARD FREEZE WARNING',
  'WINTER WEATHER', 'WINTER STORM WATCH', 'WINTER STORM WARNING', 'ICE STORM WARNING', 'BLIZZARD WARNING',
  'RED FLAG WARNING', 'FIRE WEATHER WATCH', 'ELEVATED FIRE DANGER', 'AIR QUALITY ALERT', 'SMOKE / HAZE',
  'TROPICAL STORM WATCH', 'TROPICAL STORM WARNING', 'HURRICANE WATCH', 'HURRICANE WARNING', 'RIP CURRENT RISK'
];

const TAG_OPTIONS = [
  'Comfortable', 'Pleasant', 'Seasonable', 'Warm', 'Hot', 'Very Hot', 'Dangerous Heat', 'Muggy', 'Oppressive',
  'Cool', 'Cold', 'Bitter Cold', 'Windy', 'Stormy', 'Wet', 'Flooding', 'Dry', 'Fire Weather', 'Low Visibility',
  'Winter Travel', 'Quieter Weather', 'Changing Forecast', 'Manual Edit'
];

const GRAPHIC_LIBRARY = [
  ['🎄','Christmas'], ['🦃','Thanksgiving'], ['🎃','Halloween'], ['🎆','July 4'], ['🎉','New Year'], ['❤️','Valentine'], ['🐰','Easter'], ['🇺🇸','Holiday'],
  ['🐶','Pets'], ['🌮','Tacos'], ['🏈','Football'], ['🎒','School'], ['🍔','BBQ'], ['🦟','Mosquito'], ['🌵','Texas'], ['🌻','Pollen'],
  ['💧','Sprinklers'], ['🚧','Construction'], ['✈️','Travel'], ['🏖️','Coast'], ['🌪️','Tornado'], ['🧊','Ice'], ['🔥','Heat'], ['🌀','Tropical']
];

const STORAGE_KEY = 'rbrtw-auto-weather-studio-state-v1';

let state = {
  days: [],
  autoDays: [],
  overlays: [],
  selectedDay: 0,
  selectedOverlayId: null,
  lastNwsPayload: null,
  modules: {},
  style: {
    backgroundStyle: 'bg-rbrtw',
    densityMode: 'auto',
    hazardStyle: 'bars',
    brand: 'RBRTW',
    footer: '',
    showGlobalMetrics: true,
    showBottomTag: true,
    bottomTagColor: '#030912'
  }
};

function todayISO(){ return new Date().toISOString().slice(0,10); }
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function pad(n){ return String(n).padStart(2,'0'); }
function dateAdd(iso, n){ const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function dateObj(iso){ return new Date(`${iso}T12:00:00`); }
function dayName(iso){ return dateObj(iso).toLocaleDateString('en-US',{weekday:'short'}).toUpperCase(); }
function longDayName(iso){ return dateObj(iso).toLocaleDateString('en-US',{weekday:'long'}); }
function dateShort(iso){ return dateObj(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase(); }
function dateKeyFromStartTime(startTime){ return String(startTime || '').slice(0,10); }
function numberOnly(value){ const m = String(value ?? '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; }
function fRound(v){ return Number.isFinite(v) ? Math.round(v) : '--'; }
function cToF(c){ return (Number(c)*9/5)+32; }
function mmToIn(mm){ return Number(mm)/25.4; }
function kmhToMph(v){ return Number(v)*0.621371; }
function safeText(v, fallback=''){ return (v === null || v === undefined || v === '') ? fallback : String(v); }

function defaultModules(){
  return {
    headline: '',
    impacts: '',
    confidence: '',
    risk: '',
    timing: '',
    outdoor: '',
    notes: '',
    issueTime: '',
    showHeadline: false,
    showImpacts: false,
    showConfidence: false,
    showRisk: false,
    showTiming: false,
    showOutdoor: false,
    showNotes: false
  };
}

function blankDay(date, index=0){
  return {
    id: cryptoSafeId(),
    date,
    source: 'Manual',
    high: '',
    low: '',
    iconKey: 'partly-cloudy',
    icon: '⛅',
    showIcon: true,
    short: '',
    night: '',
    rainChance: '',
    rainAmount: '',
    wind: '',
    gust: '',
    humidity: '',
    heatIndex: '',
    windChill: '',
    hazard1: '',
    hazard2: '',
    tag: '',
    tagColor: '',
    showTag: true,
    normalLine: '',
    recordLine: '',
    notes: '',
    showHazards: true,
    showMetrics: true
  };
}

function createDefaultDays(start=todayISO()){
  return Array.from({length:10}, (_,i) => blankDay(dateAdd(start, i), i));
}

function cryptoSafeId(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function iconKeyFromGlyph(glyph){
  const found = WEATHER_ICONS.find(x => x[1] === glyph);
  return found ? found[0] : 'partly-cloudy';
}

function chooseIcon(text=''){
  const t = String(text).toLowerCase();
  if (/(tornado|severe|supercell|hail|damaging)/.test(t)) return '🌩️';
  if (/(thunder|storm|lightning)/.test(t)) return '⛈️';
  if (/(hurricane|tropical|cyclone)/.test(t)) return '🌀';
  if (/(freezing rain|ice|icy)/.test(t)) return '🧊';
  if (/(snow|flurries)/.test(t)) return '❄️';
  if (/(sleet|wintry|mix)/.test(t)) return '🌨️';
  if (/(rain|drizzle)/.test(t)) return '🌧️';
  if (/(showers)/.test(t)) return '🌦️';
  if (/(fog|haze|smoke|dust)/.test(t)) return '🌫️';
  if (/(wind|breezy|gust)/.test(t)) return '💨';
  if (/(hot|heat)/.test(t)) return '🔥';
  if (/(clear night|mostly clear night)/.test(t)) return '🌙';
  if (/(mostly sunny|mostly clear)/.test(t)) return '🌤️';
  if (/(partly|mostly cloudy|clouds)/.test(t)) return '⛅';
  if (/(cloudy|overcast)/.test(t)) return '☁️';
  if (/(sunny|clear)/.test(t)) return '☀️';
  return '⛅';
}

function hazardFromText(text='', high=null){
  const t = String(text).toLowerCase();
  const rawHigh = high === null || high === undefined || high === '' ? null : Number(high);
  const hasHigh = Number.isFinite(rawHigh);
  if (/(tornado)/.test(t)) return 'TORNADO RISK';
  if (/(severe|damaging wind|large hail)/.test(t)) return 'SEVERE STORM RISK';
  if (/(thunder|storm)/.test(t)) return 'STORM CHANCE';
  if (/(heavy rain|flood)/.test(t)) return 'HEAVY RAIN POSSIBLE';
  if (/(snow|winter|sleet|ice|freezing)/.test(t)) return 'WINTER WEATHER';
  if (/(fog|visibility)/.test(t)) return 'LOW VISIBILITY';
  if (/(windy|gust)/.test(t)) return 'WINDY';
  if (hasHigh && rawHigh >= 105) return 'DANGEROUS HEAT';
  if (hasHigh && rawHigh >= 100) return 'HEAT INDEX';
  if (hasHigh && rawHigh <= 32) return 'FREEZE POSSIBLE';
  return 'SEASONABLE';
}

function comfortTag(high, humidity=''){
  const hi = Number(high);
  const hum = String(humidity).toLowerCase();
  if (hi >= 105) return 'Dangerous Heat';
  if (hi >= 98 && /humid|muggy|oppressive/.test(hum)) return 'Oppressive';
  if (hi >= 97) return 'Very Hot';
  if (hi >= 90) return 'Hot';
  if (hi >= 80) return /humid|muggy/.test(hum) ? 'Muggy' : 'Warm';
  if (hi >= 65) return 'Pleasant';
  if (hi >= 50) return 'Cool';
  if (hi <= 32) return 'Bitter Cold';
  return 'Cold';
}

function tempClass(high){
  const hi = Number(high);
  if (!Number.isFinite(hi)) return 'mild';
  if (hi >= 103) return 'extreme';
  if (hi >= 90) return 'hot';
  if (hi >= 70) return 'mild';
  if (hi >= 50) return 'cool';
  return 'cold';
}

function init(){
  state.modules = defaultModules();
  $('startDate').value = todayISO();
  for(let i=1;i<=10;i++) $('dayCount').insertAdjacentHTML('beforeend', `<option value="${i}" ${i===10?'selected':''}>${i} Day${i>1?'s':''}</option>`);
  state.days = createDefaultDays($('startDate').value);
  state.autoDays = clone(state.days);
  state.product = defaultProductState();
  seedModuleInputs();
  seedProductInputs();
  renderGraphicLibrary();
  bindEvents();
  renderAll();
  fitStage();
  setStatus('Ready. Choose dates, auto-fill NWS, edit any field, then export PNG.');
}

function bindEvents(){
  window.addEventListener('resize', fitStage);
  ['locationLabel','slideTitle','slideSubtitle','dayCount'].forEach(id => $(id).addEventListener('input', renderAll));
  $('startDate').addEventListener('input', () => {
    const start = $('startDate').value || todayISO();
    const existing = new Map(state.days.map(d => [d.date, d]));
    state.days = Array.from({length:10}, (_,i) => existing.get(dateAdd(start,i)) || blankDay(dateAdd(start,i), i));
    renderAll();
  });
  ['moduleHeadline','moduleImpacts','moduleConfidence','moduleRisk','moduleTiming','moduleOutdoor','moduleNotes','showHeadline','showImpacts','showConfidence','showRisk','showTiming','showOutdoor','showNotes'].forEach(id => $(id)?.addEventListener('input', syncModulesFromInputs));
  $('loadNws').addEventListener('click', loadNws);
  $('productType')?.addEventListener('change', handleProductTypeChange);
  $('productDayOffset')?.addEventListener('change', handleProductDayChange);
  $('autoProduct')?.addEventListener('click', autoFillProduct);
  $('exportPng').addEventListener('click', exportPng);
  $('saveProject').addEventListener('click', saveProject);
  $('loadProject').addEventListener('change', loadProject);
  $('resetAutoLayout').addEventListener('click', () => { renderAll(); fitStage(); setStatus('Forecast layout reflowed without changing your edits.'); });
  $('selectedDay').addEventListener('change', (e) => { state.selectedDay = Number(e.target.value); renderAll(); });
  $('resetSelectedDay').addEventListener('click', resetSelectedDay);
  $('clearSelectedDay').addEventListener('click', clearSelectedDay);
  $('graphicUpload').addEventListener('change', uploadGraphic);
  $('backgroundStyle').addEventListener('change', applyStyle);
  $('brandInput').addEventListener('input', applyStyle);
  $('footerInput')?.addEventListener('input', applyStyle);
  $('densityMode').addEventListener('change', applyStyle);
  $('hazardStyle').addEventListener('change', applyStyle);
  $('showGlobalMetrics')?.addEventListener('change', applyStyle);
  $('showBottomTag')?.addEventListener('change', applyStyle);
  $('bottomTagColor')?.addEventListener('input', applyStyle);
  $('applyStyle').addEventListener('click', applyStyle);
  $$('.tabBtn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  document.addEventListener('keydown', handleShortcuts);
}

function handleShortcuts(e){
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedOverlayId && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    deleteSelectedOverlay();
  }
}

function switchTab(tabId){
  $$('.tabBtn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  $$('.tabPanel').forEach(p => p.classList.toggle('active', p.id === tabId));
}

function seedModuleInputs(){
  const m = state.modules = Object.assign(defaultModules(), state.modules || {});
  state.style = Object.assign({backgroundStyle:'bg-rbrtw', densityMode:'auto', hazardStyle:'bars', brand:'RBRTW', footer:'', showGlobalMetrics:true, showBottomTag:true, bottomTagColor:'#030912'}, state.style || {});
  $('moduleHeadline').value = m.headline || '';
  $('moduleImpacts').value = m.impacts || '';
  $('moduleConfidence').value = m.confidence || '';
  $('moduleRisk').value = m.risk || '';
  $('moduleTiming').value = m.timing || '';
  $('moduleOutdoor').value = m.outdoor || '';
  $('moduleNotes').value = m.notes || '';
  ['Headline','Impacts','Confidence','Risk','Timing','Outdoor','Notes'].forEach(name => {
    const el = $(`show${name}`);
    if (el) el.checked = !!m[`show${name}`];
  });
  $('backgroundStyle').value = state.style.backgroundStyle || 'bg-rbrtw';
  $('brandInput').value = state.style.brand || 'RBRTW';
  if ($('footerInput')) $('footerInput').value = state.style.footer || '';
  $('densityMode').value = state.style.densityMode || 'auto';
  $('hazardStyle').value = state.style.hazardStyle || 'bars';
  if ($('showGlobalMetrics')) $('showGlobalMetrics').checked = state.style.showGlobalMetrics !== false;
  if ($('showBottomTag')) $('showBottomTag').checked = state.style.showBottomTag !== false;
  if ($('bottomTagColor')) $('bottomTagColor').value = state.style.bottomTagColor || '#030912';
}

function syncModulesFromInputs(){
  state.modules.headline = $('moduleHeadline').value;
  state.modules.impacts = $('moduleImpacts').value;
  state.modules.confidence = $('moduleConfidence').value;
  state.modules.risk = $('moduleRisk').value;
  state.modules.timing = $('moduleTiming').value;
  state.modules.outdoor = $('moduleOutdoor').value;
  state.modules.notes = $('moduleNotes').value;
  ['Headline','Impacts','Confidence','Risk','Timing','Outdoor','Notes'].forEach(name => {
    const el = $(`show${name}`);
    state.modules[`show${name}`] = !!el?.checked;
  });
  renderModules();
}

function applyStyle(){
  state.style.backgroundStyle = $('backgroundStyle').value;
  state.style.brand = $('brandInput').value;
  state.style.footer = $('footerInput')?.value || '';
  state.style.densityMode = $('densityMode').value;
  state.style.hazardStyle = $('hazardStyle').value;
  state.style.showGlobalMetrics = $('showGlobalMetrics') ? $('showGlobalMetrics').checked : true;
  state.style.showBottomTag = $('showBottomTag') ? $('showBottomTag').checked : true;
  state.style.bottomTagColor = $('bottomTagColor')?.value || '#030912';
  renderAll();
}

function renderAll(){
  renderHeader();
  renderModules();
  renderDays();
  renderDaySelect();
  renderDayEditor();
  renderOverlays();
  renderOverlayEditor();
  renderProductSelector();
  renderProduct();
  renderProductEditor();
  fitStage();
}

function renderHeader(){
  $('slideTitleOut').textContent = $('slideTitle').value || `${$('dayCount').value} DAY FORECAST`;
  $('slideSubtitleOut').textContent = $('slideSubtitle').value || 'RBRTW AREA • NWS EWX DATA';
  $('issueLocation').textContent = ($('locationLabel').value || 'RBRTW AREA').toUpperCase();
  $('issueTime').textContent = state.modules.issueTime || '';
  $('brandText').textContent = state.style.brand || 'RBRTW';
  $('footerMeta').textContent = state.style.footer || '';
  const canvas = $('slideCanvas');
  canvas.classList.remove('bg-rbrtw','bg-severe','bg-heat','bg-rain','bg-winter','bg-clean','density-big','density-compact','hazard-badges');
  canvas.classList.add(state.style.backgroundStyle || 'bg-rbrtw');
  if (state.style.densityMode === 'big') canvas.classList.add('density-big');
  if (state.style.densityMode === 'compact') canvas.classList.add('density-compact');
  if (state.style.hazardStyle === 'badges') canvas.classList.add('hazard-badges');
  canvas.classList.toggle('hide-bottom-metrics', state.style.showGlobalMetrics === false);
  canvas.classList.toggle('hide-bottom-tag', state.style.showBottomTag === false);
  canvas.style.setProperty('--bottom-tag-bg', state.style.bottomTagColor || '#030912');
}

function renderModules(){
  const m = state.modules = Object.assign(defaultModules(), state.modules || {});
  $('headlineOut').textContent = m.headline || '';
  $('impactsOut').textContent = m.impacts || '';
  $('confidenceOut').textContent = m.confidence || '';
  $('riskOut').textContent = m.risk || '';
  $('timingOut').textContent = m.timing || '';
  $('outdoorOut').textContent = m.outdoor || '';
  $('notesOut').textContent = m.notes || '';

  setModuleVisible('headlineCard', m.showHeadline);
  setModuleVisible('impactsCard', m.showImpacts);
  setModuleVisible('confidenceCard', m.showConfidence);
  setModuleVisible('riskCard', m.showRisk);
  setModuleVisible('timingModule', m.showTiming);
  setModuleVisible('outdoorModule', m.showOutdoor);
  setModuleVisible('notesModule', m.showNotes);

  const leftVisible = !!(m.showHeadline || m.showImpacts || m.showConfidence || m.showRisk);
  const lowerVisible = !!(m.showTiming || m.showOutdoor || m.showNotes);
  setModuleVisible('intelPanel', leftVisible);
  setModuleVisible('lowerDeck', lowerVisible);
  $('slideBody').classList.toggle('noLeftPanel', !leftVisible);
  $('forecastZone').classList.toggle('noLowerDeck', !lowerVisible);

  const count = Number($('dayCount').value || 10);
  $('slideBody').classList.toggle('wideForecastMode', count >= 8);
  $('slideBody').classList.toggle('midForecastMode', count >= 6 && count < 8);
}

function setModuleVisible(id, visible){
  const el = $(id);
  if (el) el.classList.toggle('hiddenModule', !visible);
}

function shownDays(){
  const start = $('startDate').value || todayISO();
  const count = Number($('dayCount').value || 10);
  const byDate = new Map(state.days.map(d => [d.date, d]));
  return Array.from({length:count}, (_,i) => byDate.get(dateAdd(start,i)) || blankDay(dateAdd(start,i), i));
}

function renderDays(){
  const grid = $('daysGrid');
  const days = shownDays();
  const count = days.length;
  grid.className = `daysGrid count-${count}`;
  grid.dataset.count = String(count);
  grid.innerHTML = days.map((day, i) => dayCardHtml(day, i, count)).join('');
  $$('.dayCard', grid).forEach(card => card.addEventListener('click', () => {
    state.selectedDay = Number(card.dataset.index);
    renderAll();
  }));
}

function dayCardHtml(day, index, count=10){
  const hazard1 = cleanDisplay(day.hazard1);
  const hazard2 = cleanDisplay(day.hazard2);
  const hasHazards = day.showHazards !== false && (hazard1 || hazard2);
  const hazards = !hasHazards ? '' : `
    <div class="hazardStack">
      ${hazard1 ? `<div class="hazardBar">${escapeHtml(hazard1)}</div>` : ''}
      ${hazard2 ? `<div class="hazardBar secondary">${escapeHtml(hazard2)}</div>` : ''}
    </div>`;
  const metricItems = [
    ['RAIN', day.rainChance],
    ['AMT', day.rainAmount],
    ['WIND', day.wind],
    ['GUST', day.gust],
    ['HUMID', day.humidity],
    ['INDEX', day.heatIndex],
    ['CHILL', day.windChill]
  ].filter(([,value]) => cleanDisplay(value));
  const showMetrics = state.style.showGlobalMetrics !== false && day.showMetrics !== false && metricItems.length > 0;
  const metricsCountClass = `metrics-${metricItems.length}`;
  const metrics = !showMetrics ? '' : `
    <div class="metricBlock ${metricsCountClass}">
      ${metricItems.map(([label,value]) => `<div class="metricPair"><span>${label}</span><b>${escapeHtml(cleanDisplay(value))}</b></div>`).join('')}
    </div>`;
  const hasForecastData = !!(cleanDisplay(day.high) || cleanDisplay(day.low) || cleanDisplay(day.short) || cleanDisplay(day.rainChance));
  const iconClass = day.showIcon === false || !hasForecastData ? 'weatherIcon hiddenIcon' : 'weatherIcon';
  const high = cleanDisplay(day.high);
  const low = cleanDisplay(day.low);
  const short = cleanDisplay(day.short);
  const tag = cleanDisplay(day.tag);
  const showTag = state.style.showBottomTag !== false && day.showTag !== false && !!tag;
  const tagStyle = day.tagColor ? ` style="background:${escapeAttr(day.tagColor)}"` : '';
  const forecastLen = cleanDisplay(day.short).length;
  const cardClasses = [
    'dayCard',
    forecastLen > 46 ? 'longForecast' : '',
    forecastLen > 72 ? 'veryLongForecast' : '',
    index === state.selectedDay ? 'selectedDay' : '',
    showMetrics ? '' : 'noMetrics',
    showTag ? '' : 'noTag'
  ].filter(Boolean).join(' ');
  return `
    <article class="${cardClasses}" data-index="${index}">
      <div class="dayTop"><div class="dayName">${dayName(day.date)}</div><div class="dateText">${dateShort(day.date)}</div></div>
      <div class="tempStrip ${tempClass(day.high)}"><div class="hiTemp">${escapeHtml(high)}${high ? '°' : ''}</div><div class="loTemp">${low ? '/' + escapeHtml(low) + '°' : ''}</div></div>
      ${hazards}
      <div class="iconBlock"><div class="${iconClass}">${escapeHtml(day.icon || chooseIcon(day.short))}</div><div class="forecastText">${escapeHtml(short)}</div></div>
      ${metrics}
      ${showTag ? `<div class="tagStrip"${tagStyle}>${escapeHtml(tag)}</div>` : ''}
    </article>`;
}

function cleanDisplay(value){
  const text = String(value ?? '').trim();
  return text === '--' ? '' : text;
}

function compactForecastText(text){
  const t = String(text || '').trim();
  if (!t) return '';
  return t
    .replace(/Thunderstorms?/gi, 'Storms')
    .replace(/Showers?/gi, 'Shwrs')
    .replace(/Chance of /gi, 'Chc ')
    .replace(/Slight Chance/gi, 'Slight Chc')
    .replace(/Scattered/gi, 'Sct')
    .replace(/Isolated/gi, 'Iso')
    .replace(/Mostly Sunny/gi, 'M. Sunny')
    .replace(/Partly Cloudy/gi, 'P. Cloudy')
    .replace(/Mostly Cloudy/gi, 'M. Cloudy')
    .replace(/Rain Showers/gi, 'Rain Shwrs')
    .replace(/ and /gi, ' & ')
    .replace(/ then /gi, ' → ')
    .replace(/ possible/gi, '')
    .replace(/ likely/gi, '')
    .slice(0, 58);
}

function renderDaySelect(){
  const sel = $('selectedDay');
  const days = shownDays();
  const old = Math.min(state.selectedDay, days.length - 1);
  state.selectedDay = old < 0 ? 0 : old;
  sel.innerHTML = days.map((d,i) => `<option value="${i}" ${i===state.selectedDay?'selected':''}>${i+1}. ${dayName(d.date)} ${dateShort(d.date)}</option>`).join('');
}

function renderDayEditor(){
  const day = shownDays()[state.selectedDay] || blankDay(todayISO());
  const iconOptions = WEATHER_ICONS.map(([key,glyph,label]) => `<option value="${key}" ${day.iconKey===key || day.icon===glyph ? 'selected':''}>${glyph} ${label}</option>`).join('');
  const hazardOptions1 = HAZARD_OPTIONS.map(o => `<option value="${escapeAttr(o)}" ${day.hazard1===o?'selected':''}>${o || 'None'}</option>`).join('');
  const hazardOptions2 = HAZARD_OPTIONS.map(o => `<option value="${escapeAttr(o)}" ${day.hazard2===o?'selected':''}>${o || 'None'}</option>`).join('');
  const tagOptions = TAG_OPTIONS.map(o => `<option value="${escapeAttr(o)}"></option>`).join('');
  $('dayEditor').innerHTML = `
    <div class="grid2">
      ${inputField('date','Date','date',day.date)}
      ${inputField('source','Source','text',day.source)}
    </div>
    <div class="grid2">
      ${inputField('high','High','text',day.high)}
      ${inputField('low','Low','text',day.low)}
    </div>
    <label>Weather icon
      <select data-day-field="iconKey">${iconOptions}</select>
    </label>
    ${textField('short','Forecast wording',day.short,3)}
    <div class="grid2">
      ${inputField('rainChance','Rain chance','text',day.rainChance)}
      ${inputField('rainAmount','Rain amount','text',day.rainAmount)}
    </div>
    <div class="grid2">
      ${inputField('wind','Wind','text',day.wind)}
      ${inputField('gust','Gust','text',day.gust)}
    </div>
    <div class="grid2">
      ${inputField('humidity','Humidity','text',day.humidity)}
      ${inputField('heatIndex','Heat index','text',day.heatIndex)}
    </div>
    <div class="grid2">
      ${inputField('windChill','Wind chill','text',day.windChill)}
      ${inputField('normalLine','Normal / Record','text',day.normalLine)}
    </div>
    <div class="sectionTitle smallTitle">Bottom Impact Strip</div>
    <label class="checkRow"><input type="checkbox" data-day-bool="showTag" ${day.showTag !== false ? 'checked':''}> Show bottom impact strip for this day</label>
    <label>Bottom impact custom text
      <input data-day-field="tag" type="text" list="bottomTagOptions" value="${escapeAttr(day.tag)}" placeholder="Type custom text: Hot, Muggy, Bitter Cold, Game Day, etc.">
      <datalist id="bottomTagOptions">${tagOptions}</datalist>
    </label>
    <label>Bottom impact color
      <input data-day-field="tagColor" type="color" value="${escapeAttr(day.tagColor || state.style.bottomTagColor || '#030912')}">
    </label>
    <div class="sectionTitle smallTitle">Hazards</div>
    <label>Primary hazard
      <select data-day-field="hazard1">${hazardOptions1}</select>
    </label>
    <label>Secondary hazard
      <select data-day-field="hazard2">${hazardOptions2}</select>
    </label>
    ${textField('notes','Internal notes / detailed forecast',day.notes,4)}
    <div class="sectionTitle smallTitle">Day Display</div>
    <label class="checkRow"><input type="checkbox" data-day-bool="showIcon" ${day.showIcon !== false ? 'checked':''}> Show weather icon</label>
    <label class="checkRow"><input type="checkbox" data-day-bool="showHazards" ${day.showHazards !== false ? 'checked':''}> Show hazard banners</label>
    <label class="checkRow"><input type="checkbox" data-day-bool="showMetrics" ${day.showMetrics !== false ? 'checked':''}> Show bottom data for this day</label>
  `;
  $$('[data-day-field]').forEach(el => el.addEventListener('input', handleDayField));
  $$('[data-day-bool]').forEach(el => el.addEventListener('change', handleDayBool));
}

function inputField(key,label,type,value){ return `<label>${label}<input data-day-field="${key}" type="${type}" value="${escapeAttr(value)}"></label>`; }
function textField(key,label,value,rows){ return `<label>${label}<textarea data-day-field="${key}" rows="${rows}">${escapeHtml(value)}</textarea></label>`; }

function getDayByShownIndex(i){
  const d = shownDays()[i];
  let idx = state.days.findIndex(x => x.date === d.date);
  if (idx === -1) { state.days.push(d); idx = state.days.length - 1; }
  return state.days[idx];
}

function handleDayField(e){
  const key = e.target.dataset.dayField;
  const day = getDayByShownIndex(state.selectedDay);
  day[key] = e.target.value;
  if (key === 'iconKey') {
    const found = WEATHER_ICONS.find(x => x[0] === e.target.value);
    day.icon = found ? found[1] : '⛅';
  }
  renderHeader();
  renderDays();
}

function handleDayBool(e){
  const day = getDayByShownIndex(state.selectedDay);
  day[e.target.dataset.dayBool] = e.target.checked;
  renderDays();
}

function resetSelectedDay(){
  const current = shownDays()[state.selectedDay];
  const auto = state.autoDays.find(d => d.date === current.date);
  if (!auto) { setStatus('No saved NWS version exists for this day yet.'); return; }
  const idx = state.days.findIndex(d => d.date === current.date);
  if (idx >= 0) state.days[idx] = clone(auto);
  renderAll();
  setStatus('Selected day reset from the last NWS auto-fill.');
}

function clearSelectedDay(){
  const current = shownDays()[state.selectedDay];
  const idx = state.days.findIndex(d => d.date === current.date);
  if (idx >= 0) state.days[idx] = blankDay(current.date, state.selectedDay);
  renderAll();
  setStatus('Selected day cleared and left editable.');
}

async function loadNws(){
  const lat = Number($('lat').value);
  const lon = Number($('lon').value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { setStatus('Enter a valid latitude and longitude first.'); return; }
  const btn = $('loadNws');
  btn.disabled = true;
  btn.textContent = 'Loading...';
  setStatus('Loading NWS point, forecast, hourly, grid, and active alerts...');
  try {
    const point = await fetchJson(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
    const props = point.properties || {};
    const [forecast, hourly, grid, alerts] = await Promise.allSettled([
      props.forecast ? fetchJson(props.forecast) : Promise.resolve(null),
      props.forecastHourly ? fetchJson(props.forecastHourly) : Promise.resolve(null),
      props.forecastGridData ? fetchJson(props.forecastGridData) : Promise.resolve(null),
      fetchJson(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`)
    ]);
    const payload = {
      point,
      forecast: resultValue(forecast),
      hourly: resultValue(hourly),
      grid: resultValue(grid),
      alerts: resultValue(alerts)
    };
    state.lastNwsPayload = payload;
    const start = $('startDate').value || todayISO();
    const builtDays = buildDaysFromNws(payload, start);
    state.days = builtDays;
    state.autoDays = clone(builtDays);
    state.modules = buildModulesFromNws(payload, builtDays, props);
    seedModuleInputs();
    const office = props.cwa ? `NWS ${props.cwa}` : 'NWS';
    $('slideSubtitle').value = `${$('locationLabel').value || 'RBRTW AREA'} • ${office} DATA`;
    $('slideTitle').value = `${$('dayCount').value} DAY FORECAST`;
    renderAll();
    const loadedCount = builtDays.filter(d => d.source && d.source.includes('NWS')).length;
    setStatus(`NWS loaded. ${loadedCount} days received from official NWS feeds. Any later blank days stay editable.`);
  } catch (err) {
    console.error(err);
    setStatus(`NWS auto-fill failed: ${err.message}. Existing editable data was not destroyed.`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Auto Fill NWS';
  }
}

async function fetchJson(url){
  const res = await fetch(url, { headers: { Accept: 'application/geo+json, application/json' }});
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return res.json();
}
function resultValue(settled){ return settled.status === 'fulfilled' ? settled.value : null; }

function buildDaysFromNws(payload, start){
  const days = Array.from({length:10}, (_,i) => blankDay(dateAdd(start,i), i));
  const dayMap = new Map(days.map(d => [d.date, d]));
  const forecastPeriods = payload.forecast?.properties?.periods || [];
  const hourlyPeriods = payload.hourly?.properties?.periods || [];

  applyForecastPeriods(dayMap, forecastPeriods);
  applyHourlyPeriods(dayMap, hourlyPeriods);
  applyGridData(dayMap, payload.grid?.properties || {});
  applyAlertsToDays(dayMap, payload.alerts?.features || []);

  for (const day of days) {
    const hi = numberOnly(day.high);
    const hasData = !!(cleanDisplay(day.high) || cleanDisplay(day.low) || cleanDisplay(day.short) || cleanDisplay(day.rainChance));
    day.icon = day.icon || chooseIcon(day.short);
    day.iconKey = iconKeyFromGlyph(day.icon);
    if (hasData && (!day.hazard1 || day.hazard1 === 'SEASONABLE')) day.hazard1 = hazardFromText(`${day.short} ${day.notes}`, hi);
    if (hasData && !day.tag) day.tag = comfortTag(hi, day.humidity);
    day.showTag = !!day.tag;
    day.tagColor = day.tagColor || '';
    if (day.source === 'Manual' && hasData) day.source = 'NWS derived';
  }
  return days;
}

function applyForecastPeriods(dayMap, periods){
  periods.forEach((period, idx) => {
    const date = dateKeyFromStartTime(period.startTime);
    const day = dayMap.get(date);
    if (!day) return;
    const isDay = period.isDaytime !== false;
    const pop = period.probabilityOfPrecipitation?.value;
    if (isDay) {
      day.high = period.temperature ?? day.high;
      day.short = period.shortForecast || day.short;
      day.notes = period.detailedForecast || day.notes;
      day.icon = chooseIcon(`${period.shortForecast} ${period.detailedForecast}`);
      day.rainChance = pop === null || pop === undefined ? day.rainChance : `${pop}%`;
      day.wind = `${period.windDirection || ''} ${period.windSpeed || ''}`.trim() || day.wind;
      day.hazard1 = hazardFromText(`${period.shortForecast} ${period.detailedForecast}`, period.temperature);
      day.source = 'NWS point forecast';
      const next = periods[idx+1];
      if (next && next.isDaytime === false) {
        day.low = next.temperature ?? day.low;
        day.night = next.shortForecast || '';
        const nightPop = next.probabilityOfPrecipitation?.value;
        if ((numberOnly(day.rainChance) ?? 0) < (nightPop ?? 0)) day.rainChance = `${nightPop}%`;
      }
    } else if (!cleanDisplay(day.low)) {
      day.low = period.temperature ?? day.low;
      day.night = period.shortForecast || day.night;
    }
  });
}

function applyHourlyPeriods(dayMap, periods){
  const groups = new Map();
  for (const p of periods) {
    const key = dateKeyFromStartTime(p.startTime);
    if (!dayMap.has(key)) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  groups.forEach((arr, key) => {
    const day = dayMap.get(key);
    const temps = arr.map(p => p.temperature).filter(Number.isFinite);
    if (temps.length) {
      if (!cleanDisplay(day.high)) day.high = Math.max(...temps);
      if (!cleanDisplay(day.low)) day.low = Math.min(...temps);
    }
    const pops = arr.map(p => p.probabilityOfPrecipitation?.value).filter(v => v !== null && v !== undefined);
    if (pops.length && (!cleanDisplay(day.rainChance) || Math.max(...pops) > (numberOnly(day.rainChance) ?? -1))) day.rainChance = `${Math.max(...pops)}%`;
    const mid = arr.find(p => {
      const h = new Date(p.startTime).getHours();
      return h >= 11 && h <= 17;
    }) || arr[0];
    if (mid) {
      if (!cleanDisplay(day.short)) day.short = mid.shortForecast || day.short;
      if (!day.icon || day.icon === '⛅') day.icon = chooseIcon(mid.shortForecast);
      if (!cleanDisplay(day.wind)) day.wind = `${mid.windDirection || ''} ${mid.windSpeed || ''}`.trim();
    }
    const windMax = Math.max(...arr.map(p => numberOnly(p.windSpeed)).filter(Number.isFinite));
    if (Number.isFinite(windMax) && !cleanDisplay(day.wind)) day.wind = `${windMax} mph`;
    const mostImportant = arr.map(p => p.shortForecast || '').sort((a,b) => severityScore(b)-severityScore(a))[0];
    if (severityScore(mostImportant) > severityScore(day.short)) {
      day.short = mostImportant;
      day.icon = chooseIcon(mostImportant);
    }
    day.source = day.source === 'Manual' ? 'NWS hourly forecast' : day.source;
  });
}

function severityScore(text=''){
  const t = String(text).toLowerCase();
  if (/tornado/.test(t)) return 100;
  if (/severe|hail|damaging/.test(t)) return 90;
  if (/thunder|storm/.test(t)) return 80;
  if (/freezing|ice|snow|sleet/.test(t)) return 70;
  if (/heavy rain|flood/.test(t)) return 65;
  if (/fog|smoke|dust/.test(t)) return 45;
  if (/rain|showers/.test(t)) return 40;
  if (/wind/.test(t)) return 35;
  if (/cloud/.test(t)) return 20;
  if (/sunny|clear/.test(t)) return 10;
  return 0;
}

function applyGridData(dayMap, gridProps){
  if (!gridProps || !Object.keys(gridProps).length) return;
  applyDailyExtrema(dayMap, gridProps.maxTemperature, 'high', cToF);
  applyDailyExtrema(dayMap, gridProps.minTemperature, 'low', cToF);
  applyDailyMax(dayMap, gridProps.probabilityOfPrecipitation, 'rainChance', v => `${Math.round(v)}%`);
  applyDailyMax(dayMap, gridProps.relativeHumidity, 'humidity', v => humidityDescriptor(v));
  applyDailyMax(dayMap, gridProps.apparentTemperature, 'heatIndex', v => `${Math.round(cToF(v))}°`);
  applyDailyMax(dayMap, gridProps.windGust, 'gust', v => `${Math.round(kmhToMph(v))} mph`);
  applyQpf(dayMap, gridProps.quantitativePrecipitation);
  applyWeatherGrid(dayMap, gridProps.weather);
}

function valuesOfGrid(prop){ return prop?.values || []; }
function startDateFromValidTime(validTime){ return String(validTime || '').split('/')[0].slice(0,10); }

function applyDailyExtrema(dayMap, prop, field, convert){
  for (const v of valuesOfGrid(prop)) {
    const key = startDateFromValidTime(v.validTime);
    const day = dayMap.get(key);
    if (!day || v.value === null || v.value === undefined) continue;
    const val = Math.round(convert ? convert(v.value) : v.value);
    if (field === 'high') day.high = !cleanDisplay(day.high) ? val : Math.max(numberOnly(day.high) ?? -999, val);
    if (field === 'low') day.low = !cleanDisplay(day.low) ? val : Math.min(numberOnly(day.low) ?? 999, val);
    day.source = day.source === 'Manual' ? 'NWS grid data' : day.source;
  }
}

function applyDailyMax(dayMap, prop, field, format){
  const maxByDay = new Map();
  for (const v of valuesOfGrid(prop)) {
    const key = startDateFromValidTime(v.validTime);
    if (!dayMap.has(key) || v.value === null || v.value === undefined) continue;
    maxByDay.set(key, Math.max(maxByDay.get(key) ?? -999, Number(v.value)));
  }
  maxByDay.forEach((val,key) => {
    const day = dayMap.get(key);
    if (!day) return;
    if (field === 'rainChance') {
      if (val > (numberOnly(day.rainChance) ?? -1)) day.rainChance = format(val);
    } else if (field === 'heatIndex') {
      if ((numberOnly(format(val)) ?? -999) > (numberOnly(day.heatIndex) ?? -999)) day.heatIndex = format(val);
    } else {
      day[field] = format(val);
    }
    day.source = day.source === 'Manual' ? 'NWS grid data' : day.source;
  });
}

function applyQpf(dayMap, qpfProp){
  const totals = new Map();
  for (const v of valuesOfGrid(qpfProp)) {
    const key = startDateFromValidTime(v.validTime);
    if (!dayMap.has(key) || v.value === null || v.value === undefined) continue;
    totals.set(key, (totals.get(key) || 0) + mmToIn(v.value));
  }
  totals.forEach((inches,key) => {
    const day = dayMap.get(key);
    if (!day) return;
    day.rainAmount = inches >= .01 ? `${inches.toFixed(2)}”` : 'Trace';
    day.source = day.source === 'Manual' ? 'NWS grid QPF' : day.source;
  });
}

function applyWeatherGrid(dayMap, weatherProp){
  for (const v of valuesOfGrid(weatherProp)) {
    const key = startDateFromValidTime(v.validTime);
    const day = dayMap.get(key);
    if (!day || !Array.isArray(v.value) || !v.value.length) continue;
    const weatherWords = v.value.map(x => x.weather || x.coverage || '').filter(Boolean).join(' ');
    if (weatherWords && !cleanDisplay(day.short)) {
      day.short = titleCase(weatherWords.replace(/_/g,' '));
      day.icon = chooseIcon(day.short);
      day.hazard1 = hazardFromText(day.short, day.high);
    }
  }
}

function humidityDescriptor(rh){
  const v = Number(rh);
  if (!Number.isFinite(v)) return '';
  if (v >= 90) return 'Very Humid';
  if (v >= 75) return 'Humid';
  if (v >= 60) return 'Muggy';
  if (v <= 25) return 'Very Dry';
  if (v <= 40) return 'Dry';
  return 'Comfortable';
}

function applyAlertsToDays(dayMap, alertFeatures){
  const important = alertFeatures.map(f => f.properties).filter(Boolean);
  for (const alert of important) {
    const event = alert.event || 'Weather Alert';
    const start = (alert.effective || alert.sent || '').slice(0,10);
    const end = (alert.ends || alert.expires || start || '').slice(0,10);
    dayMap.forEach((day,key) => {
      if (!start || (key >= start && key <= end)) {
        if (!day.hazard1 || day.hazard1 === 'SEASONABLE') day.hazard1 = event.toUpperCase();
        else if (!day.hazard2 && event.toUpperCase() !== day.hazard1) day.hazard2 = event.toUpperCase();
      }
    });
  }
}

function buildModulesFromNws(payload, days, pointProps){
  const periods = payload.forecast?.properties?.periods || [];
  const alerts = payload.alerts?.features?.map(f => f.properties).filter(Boolean) || [];
  const first = periods[0];
  const topHazards = [...new Set(days.flatMap(d => [d.hazard1,d.hazard2]).filter(Boolean).filter(h => h !== 'SEASONABLE'))].slice(0,4);
  const highs = days.map(d => numberOnly(d.high)).filter(Number.isFinite);
  const pops = days.map(d => numberOnly(d.rainChance)).filter(Number.isFinite);
  const qpf = days.map(d => numberOnly(d.rainAmount)).filter(Number.isFinite);
  const maxHigh = highs.length ? Math.max(...highs) : -999;
  const maxPop = pops.length ? Math.max(...pops) : 0;
  const maxQpf = qpf.length ? Math.max(...qpf) : 0;
  const office = pointProps.cwa || 'EWX';
  const issue = new Date().toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}).toUpperCase();

  const alertLine = alerts.length ? alerts.slice(0,4).map(a => a.event).join('\n') : (topHazards.length ? topHazards.join('\n') : '');
  const impacts = [];
  if (maxHigh >= 103) impacts.push('Dangerous heat is possible during the selected forecast window.');
  else if (maxHigh >= 95) impacts.push('Heat and humidity will remain a daily outdoor factor.');
  if (maxPop >= 60 || maxQpf >= .75) impacts.push('Rain or storms may affect outdoor plans and road conditions.');
  else if (maxPop >= 30) impacts.push('Spotty to scattered rain chances show up in the forecast window.');
  if (topHazards.length) impacts.push(`Watch items: ${topHazards.join(', ')}.`);
  const timing = timingText(days);
  const outdoor = outdoorImpactText(days);
  return {
    headline: first?.shortForecast || '',
    impacts: impacts.join('\n'),
    confidence: '',
    risk: alertLine,
    timing,
    outdoor,
    notes: '',
    issueTime: `${office} LOADED ${issue}`,
    showHeadline: false,
    showImpacts: impacts.length > 0,
    showConfidence: false,
    showRisk: !!alertLine,
    showTiming: !!timing,
    showOutdoor: !!outdoor,
    showNotes: false
  };
}

function timingText(days){
  const rainy = days.filter(d => (numberOnly(d.rainChance) ?? 0) >= 30).slice(0,4);
  if (!rainy.length) return '';
  return `Best rain/storm chances: ${rainy.map(d => `${dayName(d.date)} ${d.rainChance}`).join(' • ')}.`;
}

function outdoorImpactText(days){
  const hot = days.filter(d => (numberOnly(d.high) ?? 0) >= 95).length;
  const storm = days.filter(d => /STORM|SEVERE|RAIN|FLOOD/i.test(`${d.hazard1} ${d.hazard2} ${d.short}`)).length;
  if (hot && storm) return 'Plan around heat first, then watch storm timing for outdoor work, pets, spraying, and travel.';
  if (hot) return 'Hydration, shade, pet safety, and work breaks are the main outdoor concerns.';
  if (storm) return 'Watch lightning, downpours, and gusty outflow before outdoor plans.';
  return '';
}

function renderGraphicLibrary(){
  $('graphicsLibrary').innerHTML = GRAPHIC_LIBRARY.map(([glyph,label]) => `
    <button class="graphicPick" data-glyph="${escapeAttr(glyph)}" data-label="${escapeAttr(label)}"><div class="glyph">${glyph}</div><span>${escapeHtml(label)}</span></button>
  `).join('') + `<button class="graphicPick" data-text="RBRTW\nNOTE"><div class="glyph">TXT</div><span>Text</span></button>`;
  $$('.graphicPick').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.glyph) addOverlay({type:'emoji', text:btn.dataset.glyph, label:btn.dataset.label});
    else addOverlay({type:'text', text:btn.dataset.text || 'RBRTW\nNOTE'});
  }));
}

function addOverlay(partial){
  const overlay = Object.assign({
    id: cryptoSafeId(),
    type: 'text', text: 'RBRTW\nNOTE', label:'', imageSrc:'',
    x: 1080, y: 150, w: 170, h: 130, opacity: 1, rotation: 0, z: 20, locked: false
  }, partial || {});
  if (overlay.type === 'emoji') { overlay.w = 130; overlay.h = 130; }
  if (overlay.type === 'image') { overlay.w = 220; overlay.h = 150; }
  state.overlays.push(overlay);
  state.selectedOverlayId = overlay.id;
  switchTab('graphicsTab');
  renderAll();
  setStatus('Graphic added to slide. Drag it or use the graphic editor for exact placement.');
}

function uploadGraphic(e){
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => addOverlay({type:'image', imageSrc:reader.result, text:file.name, label:file.name});
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderOverlays(){
  const layer = $('overlayLayer');
  layer.innerHTML = state.overlays.map(o => overlayHtml(o)).join('');
  $$('.overlayItem', layer).forEach(el => {
    const overlay = state.overlays.find(o => o.id === el.dataset.id);
    el.addEventListener('mousedown', (e) => startOverlayDrag(e, overlay));
    el.addEventListener('click', (e) => { e.stopPropagation(); state.selectedOverlayId = overlay.id; switchTab('graphicsTab'); renderAll(); });
  });
}

function overlayHtml(o){
  const selected = o.id === state.selectedOverlayId ? 'selectedOverlay' : '';
  const locked = o.locked ? 'locked' : '';
  const style = `left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;opacity:${o.opacity};z-index:${o.z};transform:rotate(${o.rotation}deg);`;
  let inner = '';
  if (o.type === 'image') inner = `<img src="${escapeAttr(o.imageSrc)}" alt="${escapeAttr(o.label || 'custom graphic')}">`;
  else if (o.type === 'emoji') inner = `<div class="overlayEmoji">${escapeHtml(o.text)}</div>`;
  else inner = `<div class="overlayText">${escapeHtml(o.text)}</div>`;
  return `<div class="overlayItem ${selected} ${locked}" data-id="${escapeAttr(o.id)}" style="${style}">${inner}</div>`;
}

function startOverlayDrag(e, overlay){
  if (!overlay || overlay.locked) return;
  e.preventDefault();
  state.selectedOverlayId = overlay.id;
  const scale = currentStageScale();
  const startX = e.clientX, startY = e.clientY;
  const origX = overlay.x, origY = overlay.y;
  function move(ev){
    overlay.x = Math.round(origX + (ev.clientX - startX) / scale);
    overlay.y = Math.round(origY + (ev.clientY - startY) / scale);
    const el = document.querySelector(`.overlayItem[data-id="${CSS.escape(overlay.id)}"]`);
    if (el) { el.style.left = `${overlay.x}px`; el.style.top = `${overlay.y}px`; }
    renderOverlayEditor();
  }
  function up(){ document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); renderAll(); }
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function renderOverlayEditor(){
  const o = state.overlays.find(x => x.id === state.selectedOverlayId);
  if (!o) { $('overlayEditor').innerHTML = 'Click a slide graphic to edit position, size, layer, opacity, or delete.'; return; }
  $('overlayEditor').innerHTML = `
    <label>Text / label<textarea data-overlay-field="text" rows="2">${escapeHtml(o.text || '')}</textarea></label>
    <div class="grid2">${overlayInput('x','X',o.x)}${overlayInput('y','Y',o.y)}</div>
    <div class="grid2">${overlayInput('w','Width',o.w)}${overlayInput('h','Height',o.h)}</div>
    <div class="grid2">${overlayInput('opacity','Opacity',o.opacity,'number','0.05','1','0.05')}${overlayInput('rotation','Rotate',o.rotation)}</div>
    <div class="grid2">${overlayInput('z','Layer',o.z)}<label>Locked<select data-overlay-field="locked"><option value="false" ${!o.locked?'selected':''}>No</option><option value="true" ${o.locked?'selected':''}>Yes</option></select></label></div>
    ${o.type === 'image' ? '<label>Replace image<input id="replaceGraphicUpload" type="file" accept="image/*"></label>' : ''}
    <div class="inlineActions"><button id="duplicateOverlay" class="secondaryBtn">Duplicate</button><button id="deleteOverlay" class="secondaryBtn danger">Delete</button></div>
  `;
  $$('[data-overlay-field]').forEach(el => el.addEventListener('input', handleOverlayEdit));
  $('deleteOverlay')?.addEventListener('click', deleteSelectedOverlay);
  $('duplicateOverlay')?.addEventListener('click', duplicateSelectedOverlay);
  $('replaceGraphicUpload')?.addEventListener('change', replaceSelectedOverlayImage);
}

function overlayInput(key,label,value,type='number',min='',max='',step='1'){
  return `<label>${label}<input data-overlay-field="${key}" type="${type}" min="${min}" max="${max}" step="${step}" value="${escapeAttr(value)}"></label>`;
}

function handleOverlayEdit(e){
  const o = state.overlays.find(x => x.id === state.selectedOverlayId);
  if (!o) return;
  const key = e.target.dataset.overlayField;
  let value = e.target.value;
  if (['x','y','w','h','z','rotation'].includes(key)) value = Math.round(Number(value) || 0);
  if (key === 'opacity') value = Math.max(.05, Math.min(1, Number(value) || 1));
  if (key === 'locked') value = value === 'true';
  o[key] = value;
  renderOverlays();
}

function deleteSelectedOverlay(){
  state.overlays = state.overlays.filter(o => o.id !== state.selectedOverlayId);
  state.selectedOverlayId = null;
  renderAll();
  setStatus('Selected graphic deleted.');
}

function duplicateSelectedOverlay(){
  const o = state.overlays.find(x => x.id === state.selectedOverlayId);
  if (!o) return;
  const copy = clone(o);
  copy.id = cryptoSafeId(); copy.x += 35; copy.y += 35; copy.z += 1;
  state.overlays.push(copy);
  state.selectedOverlayId = copy.id;
  renderAll();
}

function replaceSelectedOverlayImage(e){
  const file = e.target.files?.[0];
  const o = state.overlays.find(x => x.id === state.selectedOverlayId);
  if (!file || !o) return;
  const reader = new FileReader();
  reader.onload = () => { o.type = 'image'; o.imageSrc = reader.result; o.text = file.name; o.label = file.name; renderAll(); };
  reader.readAsDataURL(file);
}

function saveProject(){
  const project = {
    version: 1,
    savedAt: new Date().toISOString(),
    controls: {
      locationLabel: $('locationLabel').value,
      lat: $('lat').value,
      lon: $('lon').value,
      startDate: $('startDate').value,
      dayCount: $('dayCount').value,
      slideTitle: $('slideTitle').value,
      slideSubtitle: $('slideSubtitle').value,
      productType: $('productType')?.value || 'forecast',
      productDayOffset: $('productDayOffset')?.value || '0'
    },
    state
  };
  const blob = new Blob([JSON.stringify(project,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rbrtw-weather-studio-${$('dayCount').value}day-${$('startDate').value || todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  setStatus('Project JSON saved.');
}

function loadProject(e){
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const project = JSON.parse(reader.result);
      restoreProject(project);
      setStatus('Project JSON loaded.');
    } catch (err) {
      setStatus(`Could not load project: ${err.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}


function normalizeLoadedState(){
  (state.days || []).forEach(day => {
    if (day.showTag === undefined) day.showTag = true;
    if (day.tagColor === undefined) day.tagColor = '';
    if (day.showMetrics === undefined) day.showMetrics = true;
    if (day.showHazards === undefined) day.showHazards = true;
    if (day.showIcon === undefined) day.showIcon = true;
  });
  (state.autoDays || []).forEach(day => {
    if (day.showTag === undefined) day.showTag = true;
    if (day.tagColor === undefined) day.tagColor = '';
  });
}

function restoreProject(project){
  const controls = project.controls || {};
  Object.entries(controls).forEach(([key,value]) => { if ($(key)) $(key).value = value; });
  state = project.state || state;
  state.modules = state.modules || defaultModules();
  state.style = Object.assign({backgroundStyle:'bg-rbrtw', densityMode:'auto', hazardStyle:'bars', brand:'RBRTW', footer:'', showGlobalMetrics:true, showBottomTag:true, bottomTagColor:'#030912'}, state.style || {});
  normalizeLoadedState();
  seedModuleInputs();
  renderAll();
}

async function exportPng(){
  const cover = $('exportCover');
  document.body.classList.add('exporting');
  if (cover) cover.style.display = 'flex';
  state.selectedOverlayId = null;
  const selectedDay = state.selectedDay;
  state.selectedDay = -1;
  renderHeader(); renderModules(); renderDays(); renderProduct(); renderOverlays();
  let exportNode = null;
  let exportMount = null;
  try {
    await waitForPaint();
    if (document.fonts?.ready) await document.fonts.ready;
    await waitForImages($('slideCanvas'));

    exportMount = document.createElement('div');
    exportMount.id = 'exportMount';
    exportMount.className = 'exportMount';

    exportNode = $('slideCanvas').cloneNode(true);
    exportNode.id = 'slideCanvasExportClone';
    exportNode.classList.add('exportClone');
    exportNode.querySelectorAll('.selectedDay,.selectedOverlay').forEach(el => el.classList.remove('selectedDay','selectedOverlay'));
    exportMount.appendChild(exportNode);
    document.body.appendChild(exportMount);

    await waitForPaint();
    if (document.fonts?.ready) await document.fonts.ready;
    await waitForImages(exportNode);

    const rect = exportNode.getBoundingClientRect();
    if (Math.round(rect.width) !== 1920 || Math.round(rect.height) !== 1080) {
      throw new Error(`Export canvas is ${Math.round(rect.width)}×${Math.round(rect.height)} instead of 1920×1080`);
    }

    let canvas;
    if (window.html2canvas) {
      const renderScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1.5));
      canvas = await window.html2canvas(exportNode, {
        backgroundColor: null,
        width: 1920,
        height: 1080,
        scale: renderScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 1920,
        windowHeight: 1080,
        scrollX: 0,
        scrollY: 0,
        removeContainer: true
      });
      canvas = normalizeExportCanvas(canvas, 1920, 1080);
    } else {
      canvas = await exportBySvgForeignObject(exportNode);
      canvas = normalizeExportCanvas(canvas, 1920, 1080);
    }
    await downloadCanvas(canvas, `RBRTW-${$('dayCount').value}day-forecast-${$('startDate').value || todayISO()}.png`);
    setStatus('PNG exported from a dedicated 1920×1080 export canvas with high-quality smoothing.');
  } catch (err) {
    console.error(err);
    setStatus(`PNG export failed: ${err.message}. Try Chrome/Edge and avoid external image URLs.`);
  } finally {
    if (exportMount) exportMount.remove();
    else if (exportNode) exportNode.remove();
    state.selectedDay = selectedDay < 0 ? 0 : selectedDay;
    document.body.classList.remove('exporting');
    if (cover) cover.style.display = '';
    renderAll();
  }
}

function normalizeExportCanvas(canvas, width, height){
  if (canvas.width === width && canvas.height === height) return canvas;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, width, height);
  return out;
}

function downloadCanvas(canvas, filename){
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Browser could not create PNG blob.')); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = filename;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { URL.revokeObjectURL(url); resolve(); }, 250);
    }, 'image/png');
  });
}

function waitForPaint(){ return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }
function waitForImages(root){
  const imgs = $$('img', root);
  return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })));
}

async function exportBySvgForeignObject(node){
  const cloneNode = node.cloneNode(true);
  inlineComputedStyles(node, cloneNode);
  const html = new XMLSerializer().serializeToString(cloneNode);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml;charset=utf-8'}));
  const img = new Image();
  img.src = url;
  await new Promise((resolve,reject) => { img.onload = resolve; img.onerror = reject; });
  const canvas = document.createElement('canvas');
  canvas.width = 1920; canvas.height = 1080;
  canvas.getContext('2d').drawImage(img,0,0);
  URL.revokeObjectURL(url);
  return canvas;
}

function inlineComputedStyles(src, dst){
  const style = getComputedStyle(src);
  let css = '';
  for (const prop of style) css += `${prop}:${style.getPropertyValue(prop)};`;
  dst.setAttribute('style', `${dst.getAttribute('style') || ''};${css}`);
  [...src.children].forEach((child,i) => inlineComputedStyles(child, dst.children[i]));
}

function fitStage(){
  const viewport = $('stageViewport');
  const frame = $('slideFrame');
  if (!viewport || !frame) return;
  const vw = viewport.clientWidth - 36;
  const vh = viewport.clientHeight - 36;
  const scale = Math.min(vw / 1920, vh / 1080, 1);
  frame.style.transform = `translate(-50%, -50%) scale(${scale})`;
  frame.dataset.scale = String(scale);
}
function currentStageScale(){ return Number($('slideFrame').dataset.scale || 1); }

function setStatus(message){ $('dataStatus').textContent = message; }

function titleCase(str){ return String(str).toLowerCase().replace(/\b\w/g, s => s.toUpperCase()); }
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function escapeAttr(value){ return escapeHtml(value).replace(/'/g,'&#39;'); }


/* ----------------------- Product / map slide mode ----------------------- */
const PRODUCT_TYPES = {
  forecast: { title:'FORECAST DAY BUILDER', subtitle:'RBRTW AREA • NWS EWX DATA' },
  'storm-hazards': { title:'STORM HAZARDS INDEX', subtitle:'TIMING: SELECTED FORECAST DAY' },
  temperatures: { title:'TEMPERATURES', subtitle:'SELECTED DAY • SOUTH CENTRAL TEXAS' },
  'rain-chances': { title:'RAIN CHANCE AHEAD', subtitle:'RBRTW AREA' },
  'severe-outlook': { title:'SEVERE STORM OUTLOOK', subtitle:'NWS / SPC CATEGORY VIEW' },
  'air-quality': { title:'CURRENT AIR QUALITY', subtitle:'RBRTW AREA' },
  dewpoints: { title:'FUTURE DEW POINTS', subtitle:'SELECTED DAY • HUMIDITY SETUP' },
  'heat-index': { title:'HEAT INDEX', subtitle:'SELECTED DAY • FEELS LIKE TEMPERATURE' },
  'clouds-radar': { title:'CLOUDS + RADAR SNAPSHOT', subtitle:'LATEST RADAR / CLOUD VIEW' }
};

const PRODUCT_CITIES = [
  {name:'San Antonio', lat:29.4241, lon:-98.4936, x:48, y:56},
  {name:'Austin', lat:30.2672, lon:-97.7431, x:58, y:41},
  {name:'Del Rio', lat:29.3709, lon:-100.8959, x:24, y:57},
  {name:'Laredo', lat:27.5306, lon:-99.4803, x:40, y:80},
  {name:'Corpus Christi', lat:27.8006, lon:-97.3964, x:64, y:77},
  {name:'Houston', lat:29.7604, lon:-95.3698, x:82, y:57},
  {name:'Dallas', lat:32.7767, lon:-96.7970, x:67, y:16},
  {name:'Abilene', lat:32.4487, lon:-99.7331, x:42, y:22},
  {name:'Brownsville', lat:25.9017, lon:-97.4975, x:69, y:94}
];

function defaultProductState(){
  return {
    type:'forecast',
    dayOffset:0,
    title:'',
    subtitle:'',
    kicker:'',
    summary:'',
    sourceNote:'',
    showFront:true,
    frontType:'cold',
    frontX:340,
    frontY:205,
    frontAngle:12,
    frontLength:760,
    manualMapValues:'',
    data:null,
    updated:''
  };
}

function ensureProduct(){
  state.product = Object.assign(defaultProductState(), state.product || {});
  return state.product;
}

function seedProductInputs(){
  const p = ensureProduct();
  if ($('productType')) $('productType').value = p.type || 'forecast';
  renderProductSelector();
}

function renderProductSelector(){
  const p = ensureProduct();
  const sel = $('productDayOffset');
  if (!sel) return;
  const count = Number($('dayCount')?.value || 10);
  const start = $('startDate')?.value || todayISO();
  const old = String(Math.min(Number(p.dayOffset || 0), count - 1));
  sel.innerHTML = Array.from({length:count}, (_,i) => {
    const d = dateAdd(start, i);
    return `<option value="${i}" ${String(i)===old?'selected':''}>${i+1}. ${dayName(d)} ${dateShort(d)}</option>`;
  }).join('');
  sel.value = old;
}

function handleProductTypeChange(e){
  const p = ensureProduct();
  p.type = e.target.value;
  const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
  if (p.type !== 'forecast') {
    $('slideTitle').value = p.title || spec.title;
    $('slideSubtitle').value = p.subtitle || spec.subtitle;
    switchTab('productTab');
  } else {
    $('slideTitle').value = `${$('dayCount').value} DAY FORECAST`;
    $('slideSubtitle').value = `${$('locationLabel').value || 'RBRTW AREA'} • NWS EWX DATA`;
  }
  renderAll();
}

function handleProductDayChange(e){
  const p = ensureProduct();
  p.dayOffset = Number(e.target.value || 0);
  renderProduct();
  renderProductEditor();
}

function selectedProductDate(){
  const p = ensureProduct();
  return dateAdd($('startDate')?.value || todayISO(), Number(p.dayOffset || 0));
}

function renderProduct(){
  const p = ensureProduct();
  const isProduct = p.type && p.type !== 'forecast';
  const canvas = $('slideCanvas');
  const productCanvas = $('productCanvas');
  if (!canvas || !productCanvas) return;
  canvas.classList.toggle('product-mode', isProduct);
  productCanvas.classList.toggle('hiddenProduct', !isProduct);
  $('slideBody')?.classList.toggle('hiddenModule', isProduct);
  if (!isProduct) return;
  const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
  $('slideTitleOut').textContent = (p.title || spec.title).toUpperCase();
  $('slideSubtitleOut').textContent = (p.subtitle || spec.subtitle).toUpperCase();
  $('issueLocation').textContent = ($('locationLabel').value || 'RBRTW AREA').toUpperCase();
  $('issueTime').textContent = p.updated ? `UPDATED ${p.updated}` : (state.modules.issueTime || 'READY');
  productCanvas.className = `productCanvas ${productCanvasNeedsFullMap(p.type) ? 'fullMap' : ''}`;
  productCanvas.innerHTML = productHtml(p);
}

function productCanvasNeedsFullMap(type){ return ['temperatures','dewpoints','heat-index','clouds-radar','severe-outlook'].includes(type); }

function productHtml(p){
  const data = applyManualProductOverrides(p.data || buildProductDataFromCurrent(p.type), p);
  if (p.type === 'storm-hazards') return stormHazardsHtml(data, p);
  if (p.type === 'temperatures') return pointMapHtml(data, p, 'tempMap', 'temp', '°');
  if (p.type === 'dewpoints') return pointMapHtml(data, p, 'dewMap', 'dewpoint', '°');
  if (p.type === 'heat-index') return pointMapHtml(data, p, 'heatMap', 'heatIndex', '°');
  if (p.type === 'rain-chances') return rainChancesHtml(data, p);
  if (p.type === 'severe-outlook') return severeOutlookHtml(data, p);
  if (p.type === 'air-quality') return airQualityHtml(data, p);
  if (p.type === 'clouds-radar') return cloudsRadarHtml(data, p);
  return `<div class="productNoData">Choose a product type.</div>`;
}


function applyManualProductOverrides(data, p){
  data = clone(data || {});
  const text = String(p.manualMapValues || '').trim();
  if (!text) return data;
  const overrides = new Map();
  text.split(/\n+/).forEach(line => {
    const m = line.match(/^\s*([^:=]+)\s*[:=]\s*([^\s]+)\s*$/);
    if (m) overrides.set(m[1].trim().toLowerCase(), m[2].trim());
  });
  if (overrides.size && Array.isArray(data.points)) {
    data.points = data.points.map(pt => {
      const val = overrides.get(String(pt.name).toLowerCase());
      if (!val) return pt;
      const productType = p.type;
      if (productType === 'dewpoints') return {...pt, dewpoint: val};
      if (productType === 'heat-index') return {...pt, heatIndex: val};
      return {...pt, temp: val};
    });
  }
  return data;
}

function stormHazardsHtml(data, p){
  const hazards = data.hazards || defaultHazardsFromDays();
  return `
    <div class="productMap severeMap">
      <div class="mapRoads"></div>
      ${cityLabelsForMap(data.points || []).join('')}
      <div class="riskLegend"><div style="background:#121466;color:white">OVERALL<br>RISK</div><div class="non">NON SEVERE</div><div class="marg">MARGINAL</div><div class="slgt">SLIGHT</div><div class="enh">ENHANCED</div><div class="mod">MODERATE</div><div class="high">HIGH</div></div>
      <div class="mapBadge" style="left:40px;top:44px">${escapeHtml(data.overallRisk || 'LOCAL HAZARDS')}</div>
    </div>
    <div class="productPanel">
      <div class="riskScale"><span>LOW</span><span>MODERATE</span><span>HIGH</span></div>
      <div class="hazardBars">
        ${hazards.map(h => hazardBarHtml(h)).join('')}
      </div>
      <div class="productSummary">${escapeHtml(p.summary || data.summary || 'Auto-index based on NWS EWX alerts, point forecast wording, rain chances, wind gusts, and severe wording.')}</div>
      <div class="sourceNote">${escapeHtml(p.sourceNote || data.sourceNote || 'Source: NWS API / EWX point forecast and active alerts.')}</div>
    </div>`;
}

function hazardBarHtml(h){
  const score = Math.max(0, Math.min(100, Number(h.score || 0)));
  return `<div class="hazardBarRow"><div class="hazardLabel">${escapeHtml(h.name)}<small>${escapeHtml(h.detail || '')}</small></div><div class="riskTrack"><div class="riskFill" style="width:${score}%"></div></div></div>`;
}

function pointMapHtml(data, p, mapClass, valueKey, suffix){
  const points = data.points || pointsFromSelectedDay(valueKey);
  const front = p.showFront ? `<div class="frontLine" style="left:${p.frontX}px;top:${p.frontY}px;width:${p.frontLength}px;transform:rotate(${p.frontAngle}deg)"></div>` : '';
  const note = p.sourceNote || data.sourceNote || (valueKey === 'temp' ? 'Source: Open-Meteo regional forecast + NWS local forecast.' : 'Source: Open-Meteo regional forecast data.');
  return `<div class="productMap ${mapClass}"><div class="mapRoads"></div>${front}${cityLabelsForMap(points, valueKey, suffix).join('')}<div class="mapProductFooter">${escapeHtml(p.summary || data.summary || '')}<br>${escapeHtml(note)}</div></div>`;
}

function cityLabelsForMap(points, key='temp', suffix='°'){
  const pts = points.length ? points : PRODUCT_CITIES.map(c => ({...c, [key]:''}));
  return pts.map(pt => {
    const val = cleanDisplay(pt[key]);
    const small = ['Dallas','Abilene','Brownsville','Corpus Christi','Houston','Del Rio','Laredo'].includes(pt.name) ? ' small' : '';
    return `<div class="cityPoint${small}" style="left:${pt.x}%;top:${pt.y}%"><span class="tempValue">${escapeHtml(val)}${val?escapeHtml(suffix):''}</span><span class="cityName">${escapeHtml(pt.name)}</span></div>`;
  });
}

function rainChancesHtml(data, p){
  const days = (data.rainDays || shownDays()).slice(0, Math.max(3, Number($('dayCount')?.value || 10))).map(d => ({date:d.date, pop:numberOnly(d.rainChance) ?? 0}));
  return `<div class="productPanel" style="grid-column:1/-1;padding:30px;background:linear-gradient(135deg,rgba(0,0,0,.32),rgba(0,0,0,.46)),radial-gradient(circle at 58% 80%,rgba(255,60,20,.35),transparent 28%)">
    <div class="rainChart">
      <div class="rainBands"><div>LIKELY</div><div>WIDESPREAD</div><div>SCATTERED</div><div>SCATTERED - ISOLATED</div><div>SLIGHT - NONE</div></div>
      <div class="rainBars">${days.map(d => `<div class="rainColumn" style="height:${Math.max(8,Math.min(96,d.pop))}%"><b>${d.pop}%</b><span>${dayName(d.date)}<br>${dateShort(d.date)}</span></div>`).join('')}</div>
      <div class="rainScale"><div>80-100%</div><div>60-80%</div><div>40-60%</div><div>20-40%</div><div>0-20%</div></div>
    </div>
    <div class="mapProductFooter">${escapeHtml(p.sourceNote || data.sourceNote || 'Source: NWS probability of precipitation from the selected forecast window.')}</div>
  </div>`;
}

function severeOutlookHtml(data, p){
  const risk = data.overallRisk || 'MARGINAL';
  const num = riskNumber(risk);
  const points = data.points || PRODUCT_CITIES;
  return `<div class="productMap severeMap">${data.outlookImage ? `<img class="noaaMapImage" src="${escapeAttr(data.outlookImage)}" alt="NOAA SPC outlook layer">` : '<div class="mapRoads"></div>'}${cityLabelsForMap(points.map(x=>({...x,temp:''}))).join('')}<div class="mapBadge" style="left:120px;top:120px;font-size:92px;padding:16px 42px">${num}</div><div class="riskLegend" style="left:260px;top:40px;bottom:auto;width:760px;display:grid;grid-template-columns:repeat(5,1fr)"><div class="marg">Marginal<br>1</div><div class="slgt">Slight<br>2</div><div class="enh">Enhanced<br>3</div><div class="mod">Moderate<br>4</div><div class="high">High<br>5</div></div><div class="mapProductFooter">${escapeHtml(p.summary || data.summary || 'Severe outlook category is derived from available SPC/NWS hazard wording and can be manually edited.')}</div></div>`;
}

function airQualityHtml(data, p){
  const aqi = Number(data.aqi ?? 55);
  const cat = data.category || aqiCategory(aqi);
  return `<div class="productPanel" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(60,120,170,.34),rgba(4,12,28,.62)),radial-gradient(circle at 55% 55%,rgba(210,230,255,.34),transparent 36%)">
    <div class="aqiScale"><div class="aqiGood">Good</div><div class="aqiModerate">Moderate</div><div class="aqiUsG">Unhealthy for<br>Sensitive Groups</div><div class="aqiUnhealthy">Unhealthy</div><div class="aqiVery">Very Unhealthy</div><div class="aqiHaz">Hazardous</div></div>
    <div class="aqiBox"><div class="productKicker">AIR QUALITY INDEX</div><div class="productBigNumber">${escapeHtml(aqi)}</div><div class="productCategory">${escapeHtml(cat)}</div><div class="productSummary">${escapeHtml(p.summary || data.summary || 'Selected-day air quality forecast graphic.')}</div></div>
    <div class="mapProductFooter">${escapeHtml(p.sourceNote || data.sourceNote || 'Source: Open-Meteo Air Quality API using U.S. AQI forecast variables.')}</div>
  </div>`;
}

function cloudsRadarHtml(data, p){
  const points = data.points || pointsFromSelectedDay('temp');
  const blobs = `<div class="cloudPatch" style="left:12%;top:12%;width:360px;height:160px"></div><div class="cloudPatch" style="left:58%;top:18%;width:450px;height:190px"></div><div class="radarBlob radarGreen" style="left:52%;top:55%;width:200px;height:130px"></div><div class="radarBlob radarYellow" style="left:58%;top:58%;width:105px;height:76px"></div><div class="radarBlob radarRed" style="left:62%;top:61%;width:55px;height:45px"></div>`;
  return `<div class="productMap radarMap">${data.radarImage ? `<img class="noaaMapImage" src="${escapeAttr(data.radarImage)}" alt="NOAA MRMS radar layer">` : '<div class="mapRoads"></div>'}${blobs}${cityLabelsForMap(points, 'temp', '°').join('')}<div class="mapProductFooter">${escapeHtml(p.summary || data.summary || 'Clouds and radar snapshot for the selected area. MRMS/NOAA radar layer support is staged for external service fetches; editable broadcast layer remains export-safe.')}<br>${escapeHtml(p.sourceNote || data.sourceNote || 'Source: NOAA MRMS radar service reference + forecast-derived cloud/rain fields.')}</div></div>`;
}

function riskNumber(risk){
  const r = String(risk || '').toUpperCase();
  if (r.includes('HIGH')) return 5;
  if (r.includes('MODERATE')) return 4;
  if (r.includes('ENHANCED')) return 3;
  if (r.includes('SLIGHT')) return 2;
  if (r.includes('MARGINAL')) return 1;
  return 0;
}

function aqiCategory(v){
  if (v <= 50) return 'Good';
  if (v <= 100) return 'Moderate';
  if (v <= 150) return 'Unhealthy for Sensitive Groups';
  if (v <= 200) return 'Unhealthy';
  if (v <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function buildProductDataFromCurrent(type){
  const day = shownDays().find(d => d.date === selectedProductDate()) || shownDays()[0] || blankDay(todayISO());
  const text = `${day.short} ${day.notes} ${day.hazard1} ${day.hazard2} ${state.modules.risk || ''}`;
  const hazards = defaultHazardsFromDays(day, text);
  const overallRisk = riskFromText(text, hazards);
  return {
    day: day.date,
    hazards,
    overallRisk,
    summary: defaultProductSummary(type, day, overallRisk),
    sourceNote: 'Source: NWS point forecast, NWS grid data, active alerts, and editable RBRTW product logic.',
    points: pointsFromSelectedDay(type === 'dewpoints' ? 'dewpoint' : type === 'heat-index' ? 'heatIndex' : 'temp'),
    rainDays: shownDays()
  };
}

function defaultProductSummary(type, day, risk){
  if (type === 'storm-hazards') return `Selected day: ${dayName(day.date)}. Overall local hazard signal: ${risk}.`;
  if (type === 'temperatures') return `Selected day: ${dayName(day.date)}. RBRTW forecast high near ${cleanDisplay(day.high) || '--'}°.`;
  if (type === 'dewpoints') return `Selected day: ${dayName(day.date)}. Humidity signal: ${cleanDisplay(day.humidity) || 'editable'}.`;
  if (type === 'heat-index') return `Selected day: ${dayName(day.date)}. Peak heat index near ${cleanDisplay(day.heatIndex) || cleanDisplay(day.high) || '--'}°.`;
  return '';
}

function defaultHazardsFromDays(day=null, text=''){
  const d = day || (shownDays().find(x => x.date === selectedProductDate()) || shownDays()[0] || {});
  const t = String(text || `${d.short} ${d.notes} ${d.hazard1} ${d.hazard2} ${state.modules.risk || ''}`).toLowerCase();
  const pop = numberOnly(d.rainChance) || 0;
  const gust = numberOnly(d.gust) || 0;
  const qpf = numberOnly(d.rainAmount) || 0;
  return [
    {name:'TORNADOES', detail:/tornado/.test(t)?'Mentioned in hazards':'Low If Any', score:/tornado warning/.test(t)?85:/tornado/.test(t)?45:/severe|storm/.test(t)?18:5},
    {name:'HAIL', detail:/hail/.test(t)?'Large hail possible':/severe|storm/.test(t)?'Small hail cannot be ruled out':'Low If Any', score:/hail/.test(t)?60:/severe/.test(t)?38:/storm/.test(t)?25:6},
    {name:'HIGH WINDS', detail:gust>=50?'Gusts 50+ mph':gust>=30?`Gusts ${gust} mph`:/wind/.test(t)?'Windy setup':'Low If Any', score:gust>=60?78:gust>=45?58:gust>=30?42:/wind|severe/.test(t)?35:10},
    {name:'FLOODING', detail:/flood/.test(t)?'Flooding mentioned':qpf>=0.75?'Heavy rain signal':pop>=50?'Scattered downpours':'Low If Any', score:/flash flood/.test(t)?82:/flood/.test(t)?65:qpf>=1?62:qpf>=0.5?48:pop>=60?44:pop>=30?25:8}
  ];
}

function riskFromText(text, hazards){
  const t = String(text || '').toUpperCase();
  if (/HIGH RISK/.test(t)) return 'HIGH';
  if (/MODERATE RISK/.test(t)) return 'MODERATE';
  if (/ENHANCED RISK/.test(t)) return 'ENHANCED';
  if (/SLIGHT RISK/.test(t)) return 'SLIGHT';
  if (/MARGINAL RISK|STORM|WIND|FLOOD|HAIL|SEVERE/.test(t)) return 'MARGINAL';
  const maxScore = Math.max(...(hazards || []).map(h => h.score || 0), 0);
  if (maxScore >= 75) return 'ENHANCED';
  if (maxScore >= 55) return 'SLIGHT';
  if (maxScore >= 25) return 'MARGINAL';
  return 'NON SEVERE';
}

function pointsFromSelectedDay(key='temp'){
  const day = shownDays().find(d => d.date === selectedProductDate()) || shownDays()[0] || {};
  const base = numberOnly(key === 'heatIndex' ? day.heatIndex : day.high) || 90;
  const dew = humidityToDewpoint(day.humidity, base);
  return PRODUCT_CITIES.map((c, i) => {
    const offset = [0, -1, -4, 4, -2, -5, -8, -6, 2][i] || 0;
    return {...c, temp: Math.round(base + offset), dewpoint: Math.round(dew + offset/2), heatIndex: Math.round((numberOnly(day.heatIndex) || base + 5) + offset)};
  });
}

function humidityToDewpoint(label, temp){
  const t = String(label || '').toLowerCase();
  if (t.includes('oppressive') || t.includes('very')) return 76;
  if (t.includes('muggy')) return 72;
  if (t.includes('humid')) return 69;
  if (t.includes('dry')) return 50;
  return Math.max(45, Math.min(75, Number(temp || 90) - 22));
}

async function autoFillProduct(){
  const p = ensureProduct();
  if (p.type === 'forecast') { setStatus('Forecast mode uses Auto Fill NWS for the day cards.'); return; }
  const btn = $('autoProduct');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
  try {
    let data = buildProductDataFromCurrent(p.type);
    if (['temperatures','dewpoints','heat-index','air-quality'].includes(p.type)) {
      const ext = await fetchOpenMeteoProduct(p.type, selectedProductDate());
      data = Object.assign(data, ext || {});
    }
    if (p.type === 'clouds-radar') {
      const ext = await fetchNoaaRadarImage();
      data = Object.assign(data, ext || {});
    }
    if (p.type === 'severe-outlook') {
      const ext = await fetchNoaaSpcImage();
      data = Object.assign(data, ext || {});
    }
    p.data = data;
    p.updated = new Date().toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}).toUpperCase();
    const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
    p.title = p.title || spec.title;
    p.subtitle = p.subtitle || spec.subtitle;
    $('slideTitle').value = p.title;
    $('slideSubtitle').value = p.subtitle;
    renderAll();
    setStatus(`${spec.title} product auto-filled for ${selectedProductDate()}. All product text remains editable.`);
  } catch (err) {
    console.error(err);
    setStatus(`Product auto-fill failed: ${err.message}. Showing forecast-derived editable product instead.`);
    p.data = buildProductDataFromCurrent(p.type);
    renderAll();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Auto Fill Product'; }
  }
}

async function fetchOpenMeteoProduct(type, date){
  const lat = Number($('lat')?.value || 29.481);
  const lon = Number($('lon')?.value || -98.748);
  if (type === 'air-quality') {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=America%2FChicago&forecast_days=7`;
    const json = await fetchJsonOpen(url);
    const times = json.hourly?.time || [];
    const vals = json.hourly?.us_aqi || [];
    const selected = vals.filter((_,i) => String(times[i]).slice(0,10) === date).filter(v => v !== null && v !== undefined);
    const aqi = Math.round(selected.length ? Math.max(...selected) : (vals.find(v => v !== null && v !== undefined) || 55));
    return {aqi, category:aqiCategory(aqi), sourceNote:'Source: Open-Meteo Air Quality API, U.S. AQI forecast variable.'};
  }
  const vars = 'temperature_2m_max,apparent_temperature_max,dew_point_2m_max,precipitation_probability_max,cloud_cover_mean';
  const requests = PRODUCT_CITIES.map(c => fetchJsonOpen(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=${vars}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=10`).then(j => ({city:c,json:j})).catch(() => ({city:c,json:null})));
  const results = await Promise.all(requests);
  const points = results.map(({city,json}) => {
    const idx = json?.daily?.time?.indexOf(date) ?? -1;
    return {
      ...city,
      temp: Math.round(valueAt(json?.daily?.temperature_2m_max, idx) ?? 0) || '',
      heatIndex: Math.round(valueAt(json?.daily?.apparent_temperature_max, idx) ?? valueAt(json?.daily?.temperature_2m_max, idx) ?? 0) || '',
      dewpoint: Math.round(valueAt(json?.daily?.dew_point_2m_max, idx) ?? 0) || '',
      rain: Math.round(valueAt(json?.daily?.precipitation_probability_max, idx) ?? 0) || 0,
      clouds: Math.round(valueAt(json?.daily?.cloud_cover_mean, idx) ?? 0) || 0
    };
  });
  return {points, sourceNote:'Source: Open-Meteo regional forecast API; NWS local point forecast remains the main RBRTW forecast source.'};
}

function valueAt(arr, idx){ return Array.isArray(arr) && idx >= 0 ? arr[idx] : null; }
async function fetchJsonOpen(url){
  const res = await fetch(url, {headers:{Accept:'application/json'}});
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}


async function fetchNoaaRadarImage(){
  const bbox = '-101,26,-94,32';
  const url = `https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity/MapServer/export?bbox=${bbox}&bboxSR=4326&layers=show:0&size=1280,720&imageSR=4326&format=png32&transparent=true&f=image`;
  const img = await imageUrlToDataUrl(url).catch(() => null);
  return img ? {radarImage:img, sourceNote:'Source: NOAA/NWS MRMS Radar Base Reflectivity Map Service where available; forecast layer remains editable/export-safe.'} : {sourceNote:'NOAA MRMS image fetch was blocked/unavailable. Export-safe radar-style layer shown.'};
}

async function fetchNoaaSpcImage(){
  const bbox = '-101,26,-94,32';
  const url = `https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer/export?bbox=${bbox}&bboxSR=4326&layers=show:0&size=1280,720&imageSR=4326&format=png32&transparent=true&f=image`;
  const img = await imageUrlToDataUrl(url).catch(() => null);
  return img ? {outlookImage:img, sourceNote:'Source: NOAA/NWS SPC Weather Outlooks map service where available; category remains editable.'} : {sourceNote:'NOAA SPC outlook image fetch was blocked/unavailable. Export-safe severe outlook layer shown.'};
}

async function imageUrlToDataUrl(url){
  const res = await fetch(url, {mode:'cors'});
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function renderProductEditor(){
  const box = $('productEditor');
  if (!box) return;
  const p = ensureProduct();
  const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
  if (p.type === 'forecast') { box.innerHTML = 'Forecast Day Builder mode is active. Use the Day tab to edit each forecast card.'; return; }
  box.innerHTML = `
    <div class="productEditorGrid">
      <label>Product title<input data-product-field="title" value="${escapeAttr(p.title || spec.title)}"></label>
      <label>Product subtitle<input data-product-field="subtitle" value="${escapeAttr(p.subtitle || spec.subtitle)}"></label>
      <label>Summary / lower note<textarea data-product-field="summary">${escapeHtml(p.summary || p.data?.summary || '')}</textarea></label>
      <label>Source note<textarea data-product-field="sourceNote">${escapeHtml(p.sourceNote || p.data?.sourceNote || '')}</textarea></label>
      <div class="sectionTitle smallTitle">Map / Front Controls</div>
      <label class="checkRow"><input type="checkbox" data-product-bool="showFront" ${p.showFront !== false ? 'checked':''}> Show pressure/front overlay on map products</label>
      <div class="grid2"><label>Front X<input data-product-field="frontX" type="number" value="${escapeAttr(p.frontX)}"></label><label>Front Y<input data-product-field="frontY" type="number" value="${escapeAttr(p.frontY)}"></label></div>
      <div class="grid2"><label>Front angle<input data-product-field="frontAngle" type="number" value="${escapeAttr(p.frontAngle)}"></label><label>Front length<input data-product-field="frontLength" type="number" value="${escapeAttr(p.frontLength)}"></label></div>
      <div class="sectionTitle smallTitle">Manual Data Override</div>
      <label>Manual map values / notes<textarea data-product-field="manualMapValues" placeholder="Optional. Example: San Antonio=97\nAustin=95">${escapeHtml(p.manualMapValues || '')}</textarea></label>
      <button id="refreshProductRender" class="secondaryBtn">Refresh Product Layout</button>
    </div>`;
  $$('[data-product-field]').forEach(el => el.addEventListener('input', handleProductField));
  $$('[data-product-bool]').forEach(el => el.addEventListener('change', handleProductBool));
  $('refreshProductRender')?.addEventListener('click', () => { renderProduct(); setStatus('Product layout refreshed.'); });
}

function handleProductField(e){
  const p = ensureProduct();
  const key = e.target.dataset.productField;
  let val = e.target.value;
  if (['frontX','frontY','frontAngle','frontLength'].includes(key)) val = Number(val) || 0;
  p[key] = val;
  if (key === 'title') $('slideTitle').value = val;
  if (key === 'subtitle') $('slideSubtitle').value = val;
  renderHeader(); renderProduct();
}
function handleProductBool(e){
  const p = ensureProduct();
  p[e.target.dataset.productBool] = e.target.checked;
  renderProduct();
}


/* ----------------------- V10 product maps + data repair ----------------------- */
const PRODUCT_MAP_BBOX = { west:-101.75, south:26.05, east:-94.35, north:32.25 };
const PRODUCT_MAP_SIZE = '1600,900';

function productLayoutClass(type){
  if (type === 'storm-hazards') return 'splitProduct';
  if (['rain-chances','air-quality'].includes(type)) return 'panelOnly';
  if (['temperatures','dewpoints','heat-index','clouds-radar','severe-outlook'].includes(type)) return 'fullMap';
  return '';
}

function productTypeToMapClass(type){
  if (type === 'temperatures') return 'tempMap';
  if (type === 'dewpoints') return 'dewMap';
  if (type === 'heat-index') return 'heatMap';
  if (type === 'clouds-radar') return 'radarMap';
  if (type === 'severe-outlook') return 'severeMap';
  return 'generalMap';
}

function handleProductTypeChange(e){
  const p = ensureProduct();
  p.type = e.target.value;
  const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
  p.data = null;
  p.updated = '';
  p.title = p.type === 'forecast' ? '' : spec.title;
  p.subtitle = p.type === 'forecast' ? '' : spec.subtitle;
  if (p.type !== 'forecast') {
    $('slideTitle').value = spec.title;
    $('slideSubtitle').value = spec.subtitle;
    switchTab('productTab');
  } else {
    $('slideTitle').value = `${$('dayCount').value} DAY FORECAST`;
    $('slideSubtitle').value = `${$('locationLabel').value || 'RBRTW AREA'} • NWS EWX DATA`;
  }
  renderAll();
  if (p.type !== 'forecast') window.setTimeout(() => autoFillProduct(), 20);
}

function handleProductDayChange(e){
  const p = ensureProduct();
  p.dayOffset = Number(e.target.value || 0);
  p.data = null;
  p.updated = '';
  renderProduct();
  renderProductEditor();
  if (p.type && p.type !== 'forecast') window.setTimeout(() => autoFillProduct(), 20);
}

function renderProduct(){
  const p = ensureProduct();
  const isProduct = p.type && p.type !== 'forecast';
  const canvas = $('slideCanvas');
  const productCanvas = $('productCanvas');
  if (!canvas || !productCanvas) return;
  canvas.classList.toggle('product-mode', isProduct);
  productCanvas.classList.toggle('hiddenProduct', !isProduct);
  $('slideBody')?.classList.toggle('hiddenModule', isProduct);
  if (!isProduct) return;
  const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
  $('slideTitleOut').textContent = (p.title || spec.title).toUpperCase();
  $('slideSubtitleOut').textContent = (p.subtitle || spec.subtitle).toUpperCase();
  $('issueLocation').textContent = ($('locationLabel').value || 'RBRTW AREA').toUpperCase();
  $('issueTime').textContent = p.updated ? `UPDATED ${p.updated}` : (state.modules.issueTime || 'READY');
  const layout = productLayoutClass(p.type);
  const typeClass = `product-${String(p.type).replace(/[^a-z0-9-]/gi,'')}`;
  productCanvas.className = `productCanvas ${layout} ${typeClass}`.trim();
  productCanvas.innerHTML = productHtml(p);
}

function productHtml(p){
  const baseData = p.data || buildProductDataFromCurrent(p.type);
  const data = applyManualProductOverrides(baseData, p);
  if (p.type === 'storm-hazards') return stormHazardsHtml(data, p);
  if (p.type === 'temperatures') return pointMapHtml(data, p, 'tempMap', 'temp', '°');
  if (p.type === 'dewpoints') return pointMapHtml(data, p, 'dewMap', 'dewpoint', '°');
  if (p.type === 'heat-index') return pointMapHtml(data, p, 'heatMap', 'heatIndex', '°');
  if (p.type === 'rain-chances') return rainChancesHtml(data, p);
  if (p.type === 'severe-outlook') return severeOutlookHtml(data, p);
  if (p.type === 'air-quality') return airQualityHtml(data, p);
  if (p.type === 'clouds-radar') return cloudsRadarHtml(data, p);
  return `<div class="productNoData">Choose a product type.</div>`;
}

function mapShellHtml(data, p, mapClass, innerHtml, options={}){
  const base = data.basemapImage ? `<img class="mapBaseImage" src="${escapeAttr(data.basemapImage)}" alt="regional map base">` : `<div class="mapBaseFallback"></div>`;
  const overlay = data.overlayImage ? `<img class="noaaOverlayImage" src="${escapeAttr(data.overlayImage)}" alt="NOAA weather map overlay">` : '';
  const field = options.fieldClass ? `<div class="dataField ${options.fieldClass}"></div>` : '';
  const legend = options.legend || '';
  const statusText = data.basemapImage || data.overlayImage ? (data.imageStatus || 'Map loaded') : (data.imageStatus || 'Map image unavailable. Using export-safe fallback.');
  const statusClass = data.basemapImage || data.overlayImage ? 'ok' : 'fallback';
  const note = p.sourceNote || data.sourceNote || '';
  const summary = p.summary || data.summary || '';
  return `<div class="productMap ${mapClass}">${base}${field}${overlay}<div class="mapTexture"></div><div class="countyGrid"></div><div class="roadGrid"></div>${legend}${innerHtml}<div class="imageStatus ${statusClass}">${escapeHtml(statusText)}</div><div class="mapProductFooter">${escapeHtml(summary)}${summary && note ? '<br>' : ''}${escapeHtml(note)}</div></div>`;
}

function pointMapHtml(data, p, mapClass, valueKey, suffix){
  const points = data.points || pointsFromSelectedDay(valueKey);
  const front = p.showFront ? `<div class="frontLine" style="left:${p.frontX}px;top:${p.frontY}px;width:${p.frontLength}px;transform:rotate(${p.frontAngle}deg)"></div>` : '';
  const legend = mapLegendForProduct(valueKey);
  const fieldClass = valueKey === 'temp' ? 'tempField' : valueKey === 'dewpoint' ? 'dewField' : 'heatField';
  const labels = cityLabelsForMap(points, valueKey, suffix).join('');
  return mapShellHtml(data, p, mapClass, `${front}${labels}`, {legend, fieldClass});
}

function mapLegendForProduct(valueKey){
  if (valueKey === 'dewpoint') return `<div class="mapLegendBox dewLegend"><div class="legendRow legendHigh">70 - 80+<br>Oppressive</div><div class="legendRow legendMid">60 - 69<br>Humid</div><div class="legendRow legendDry">50 - 59<br>Dry</div><div class="legendRow legendVeryDry">40 - 49<br>Very Dry</div><div class="legendRow legendLow">20 - 39<br>Bone Dry</div></div>`;
  if (valueKey === 'heatIndex') return `<div class="mapLegendBox heatLegend"><div class="legendRow legendExtreme">115°+<br>Extreme</div><div class="legendRow legendHot">105 - 114°<br>Dangerous</div><div class="legendRow legendMid">95 - 104°<br>Hot</div><div class="legendRow legendDry">Below 95°<br>Lower Risk</div></div>`;
  return `<div class="mapLegendBox tempLegend"><div class="legendRow legendExtreme">100°+<br>Very Hot</div><div class="legendRow legendHot">90 - 99°<br>Hot</div><div class="legendRow legendMid">80 - 89°<br>Warm</div><div class="legendRow legendLow">Below 80°<br>Cooler</div></div>`;
}

function stormHazardsHtml(data, p){
  const hazards = data.hazards || defaultHazardsFromDays();
  const labels = cityLabelsForMap(data.points || PRODUCT_CITIES.map(c => ({...c,temp:''})), 'temp', '').join('');
  const map = mapShellHtml(data, p, 'severeMap', `${labels}<div class="riskLegend"><div style="background:#121466;color:white">OVERALL<br>RISK</div><div class="non">NON SEVERE</div><div class="marg">MARGINAL</div><div class="slgt">SLIGHT</div><div class="enh">ENHANCED</div><div class="mod">MODERATE</div><div class="high">HIGH</div></div><div class="mapBadge" style="left:48px;top:58px">${escapeHtml(data.overallRisk || 'LOCAL HAZARDS')}</div>`, {fieldClass:'severeField'});
  const panel = `<div class="productPanel hazardIndexPanel"><div class="riskScale"><span>LOW</span><span>MODERATE</span><span>HIGH</span></div><div class="hazardBars">${hazards.map(h => hazardBarHtml(h)).join('')}</div><div class="productSummary">${escapeHtml(p.summary || data.summary || 'Auto-index based on NWS EWX alerts, point forecast wording, rain chances, wind gusts, and severe wording.')}</div><div class="sourceNote">${escapeHtml(p.sourceNote || data.sourceNote || 'Source: NWS API / EWX point forecast and active alerts.')}</div></div>`;
  return `${map}${panel}`;
}

function severeOutlookHtml(data, p){
  const risk = data.overallRisk || 'MARGINAL';
  const num = riskNumber(risk);
  const points = data.points || PRODUCT_CITIES.map(c => ({...c,temp:''}));
  const overlay = data.outlookImage ? data.outlookImage : data.overlayImage;
  const shellData = Object.assign({}, data, {overlayImage: overlay, imageStatus: overlay ? 'NOAA SPC outlook layer loaded' : 'SPC image unavailable. Using generated outlook field.'});
  const legend = `<div class="riskLegend spcTopLegend"><div class="marg">Marginal<br>1</div><div class="slgt">Slight<br>2</div><div class="enh">Enhanced<br>3</div><div class="mod">Moderate<br>4</div><div class="high">High<br>5</div></div>`;
  const labels = cityLabelsForMap(points.map(x=>({...x,temp:''})), 'temp', '').join('');
  return mapShellHtml(shellData, p, 'severeMap', `${labels}<div class="mapBadge bigRiskBadge" style="left:300px;top:330px">${num || ''}</div>${legend}`, {fieldClass:'severeField'});
}

function cloudsRadarHtml(data, p){
  const points = data.points || pointsFromSelectedDay('temp');
  const overlay = data.radarImage || data.overlayImage;
  const shellData = Object.assign({}, data, {overlayImage: overlay, imageStatus: overlay ? 'NOAA MRMS radar layer loaded' : 'MRMS image unavailable. Using generated radar/cloud layer.'});
  const blobs = overlay ? '' : `<div class="cloudPatch" style="left:9%;top:13%;width:420px;height:190px"></div><div class="cloudPatch" style="left:55%;top:16%;width:510px;height:210px"></div><div class="radarBlob radarGreen" style="left:16%;top:36%;width:360px;height:170px"></div><div class="radarBlob radarYellow" style="left:24%;top:42%;width:170px;height:90px"></div><div class="radarBlob radarRed" style="left:30%;top:45%;width:80px;height:54px"></div>`;
  const legend = `<div class="radarLegend"><span>LIGHT</span><div></div><span>HEAVY</span></div>`;
  return mapShellHtml(shellData, p, 'radarMap', `${legend}${blobs}${cityLabelsForMap(points, 'temp', '°').join('')}`, {fieldClass:'radarField'});
}

function rainChancesHtml(data, p){
  let days = (data.rainDays || shownDays()).slice(0, Math.max(3, Number($('dayCount')?.value || 10))).map(d => ({date:d.date, pop:numberOnly(d.rainChance) ?? 0}));
  if (!days.some(d => d.pop > 0) && Array.isArray(data.rainSeries) && data.rainSeries.length) days = data.rainSeries;
  return `<div class="productPanel rainPanel"><div class="rainChart"><div class="rainBands"><div>LIKELY</div><div>WIDESPREAD</div><div>SCATTERED</div><div>SCATTERED - ISOLATED</div><div>SLIGHT - NONE</div></div><div class="rainBars">${days.map(d => `<div class="rainColumn" style="height:${Math.max(8,Math.min(96,d.pop || 0))}%"><b>${d.pop || 0}%</b><span>${dayName(d.date)}<br>${dateShort(d.date)}</span></div>`).join('')}</div><div class="rainScale"><div>80-100%</div><div>60-80%</div><div>40-60%</div><div>20-40%</div><div>0-20%</div></div></div><div class="mapProductFooter">${escapeHtml(p.sourceNote || data.sourceNote || 'Source: NWS/Open-Meteo probability of precipitation from the selected forecast window.')}</div></div>`;
}

function airQualityHtml(data, p){
  const aqi = Number(data.aqi ?? 55);
  const cat = data.category || aqiCategory(aqi);
  const point = Math.min(5, Math.max(0, Math.floor(aqi / 50)));
  return `<div class="productPanel aqiPanel"><div class="aqiScale"><div class="aqiGood">Good</div><div class="aqiModerate">Moderate</div><div class="aqiUsG">Unhealthy for<br>Sensitive Groups</div><div class="aqiUnhealthy">Unhealthy</div><div class="aqiVery">Very Unhealthy</div><div class="aqiHaz">Hazardous</div></div><div class="aqiBox"><div class="productKicker">AIR QUALITY INDEX</div><div class="aqiTicker"><span style="grid-column:${Math.max(1,Math.min(6,point+1))}"></span></div><div class="productBigNumber">${escapeHtml(aqi)}</div><div class="productCategory">${escapeHtml(cat)}</div><div class="productSummary">${escapeHtml(p.summary || data.summary || 'Selected-day air quality forecast graphic.')}</div></div><div class="mapProductFooter">${escapeHtml(p.sourceNote || data.sourceNote || 'Source: Open-Meteo Air Quality API, U.S. AQI forecast variable.')}</div></div>`;
}

function cityLabelsForMap(points, key='temp', suffix='°'){
  const pts = points.length ? points : PRODUCT_CITIES.map(c => ({...c, [key]:''}));
  return pts.map(pt => {
    const val = cleanDisplay(pt[key]);
    const small = ['Dallas','Abilene','Brownsville','Corpus Christi','Houston','Del Rio','Laredo'].includes(pt.name) ? ' small' : '';
    const valueHtml = val ? `<span class="tempValue">${escapeHtml(val)}${escapeHtml(suffix)}</span>` : '';
    return `<div class="cityPoint${small}" style="left:${pt.x}%;top:${pt.y}%">${valueHtml}<span class="cityName">${escapeHtml(pt.name)}</span></div>`;
  }).join('') ? pts.map(pt => {
    const val = cleanDisplay(pt[key]);
    const small = ['Dallas','Abilene','Brownsville','Corpus Christi','Houston','Del Rio','Laredo'].includes(pt.name) ? ' small' : '';
    const valueHtml = val ? `<span class="tempValue">${escapeHtml(val)}${escapeHtml(suffix)}</span>` : '';
    return `<div class="cityPoint${small}" style="left:${pt.x}%;top:${pt.y}%">${valueHtml}<span class="cityName">${escapeHtml(pt.name)}</span></div>`;
  }) : [];
}

async function autoFillProduct(){
  const p = ensureProduct();
  if (p.type === 'forecast') { setStatus('Forecast mode uses Auto Fill NWS for the day cards.'); return; }
  const btn = $('autoProduct');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
  try {
    let data = buildProductDataFromCurrent(p.type);
    const mapNeeded = ['storm-hazards','temperatures','dewpoints','heat-index','clouds-radar','severe-outlook'].includes(p.type);
    if (mapNeeded) data = Object.assign(data, await fetchBasemapImage());
    if (['temperatures','dewpoints','heat-index','rain-chances','air-quality'].includes(p.type)) {
      const ext = await fetchOpenMeteoProduct(p.type, selectedProductDate()).catch(err => ({sourceNote:`Open-Meteo fetch failed: ${err.message}. Showing forecast-derived editable values.`}));
      data = Object.assign(data, ext || {});
      if (mapNeeded && !data.basemapImage) data = Object.assign(data, await fetchBasemapImage().catch(() => ({})));
    }
    if (p.type === 'storm-hazards') {
      const ext = await fetchNwsHazardSignals().catch(err => ({sourceNote:`NWS hazard fetch failed: ${err.message}. Showing forecast-derived hazard index.`}));
      data = Object.assign(data, ext || {});
    }
    if (p.type === 'clouds-radar') {
      const ext = await fetchNoaaRadarImage().catch(err => ({sourceNote:`NOAA MRMS fetch failed: ${err.message}. Showing generated radar/cloud layer.`}));
      data = Object.assign(data, ext || {});
    }
    if (p.type === 'severe-outlook') {
      const ext = await fetchNoaaSpcImage(Number(p.dayOffset || 0)).catch(err => ({sourceNote:`NOAA SPC fetch failed: ${err.message}. Showing generated severe outlook layer.`}));
      data = Object.assign(data, ext || {});
    }
    p.data = data;
    p.updated = new Date().toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}).toUpperCase();
    const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
    p.title = p.title || spec.title;
    p.subtitle = p.subtitle || spec.subtitle;
    $('slideTitle').value = p.title;
    $('slideSubtitle').value = p.subtitle;
    renderAll();
    setStatus(`${spec.title} product auto-filled for ${selectedProductDate()}. Map/data fetch used proxy fallback when available.`);
  } catch (err) {
    console.error(err);
    setStatus(`Product auto-fill failed: ${err.message}. Showing editable fallback product.`);
    p.data = Object.assign(buildProductDataFromCurrent(p.type), await fetchBasemapImage().catch(() => ({})));
    renderAll();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Auto Fill Product'; }
  }
}

async function fetchOpenMeteoProduct(type, date){
  const lat = Number($('lat')?.value || 29.481);
  const lon = Number($('lon')?.value || -98.748);
  if (type === 'air-quality') {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=America%2FChicago&forecast_days=7`;
    const json = await fetchJsonOpen(url);
    const times = json.hourly?.time || [];
    const vals = json.hourly?.us_aqi || [];
    const selected = vals.filter((_,i) => String(times[i]).slice(0,10) === date).filter(v => v !== null && v !== undefined);
    const aqi = Math.round(selected.length ? Math.max(...selected) : (vals.find(v => v !== null && v !== undefined) || 55));
    return {aqi, category:aqiCategory(aqi), sourceNote:'Source: Open-Meteo Air Quality API, U.S. AQI forecast variable.'};
  }
  const vars = 'temperature_2m_max,apparent_temperature_max,dew_point_2m_max,precipitation_probability_max,cloud_cover_mean';
  const requests = PRODUCT_CITIES.map(c => fetchJsonOpen(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=${vars}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=10`).then(j => ({city:c,json:j})).catch(() => ({city:c,json:null})));
  const results = await Promise.all(requests);
  const points = results.map(({city,json}) => {
    const idx = json?.daily?.time?.indexOf(date) ?? -1;
    const temp = valueAt(json?.daily?.temperature_2m_max, idx);
    const heat = valueAt(json?.daily?.apparent_temperature_max, idx);
    const dew = valueAt(json?.daily?.dew_point_2m_max, idx);
    return {
      ...city,
      temp: Number.isFinite(Number(temp)) ? Math.round(Number(temp)) : '',
      heatIndex: Number.isFinite(Number(heat)) ? Math.round(Number(heat)) : (Number.isFinite(Number(temp)) ? Math.round(Number(temp)) : ''),
      dewpoint: Number.isFinite(Number(dew)) ? Math.round(Number(dew)) : '',
      rain: Math.round(valueAt(json?.daily?.precipitation_probability_max, idx) ?? 0) || 0,
      clouds: Math.round(valueAt(json?.daily?.cloud_cover_mean, idx) ?? 0) || 0
    };
  });
  const rainSeries = results[0]?.json?.daily?.time?.map((d,i)=>({date:d, pop:Math.round(valueAt(results[0].json.daily.precipitation_probability_max,i) ?? 0)})).slice(0,10) || [];
  return {points, rainSeries, sourceNote:'Source: Open-Meteo regional forecast API for regional values; NWS remains the main local forecast source.'};
}

async function fetchNwsHazardSignals(){
  const lat = Number($('lat')?.value || 29.481);
  const lon = Number($('lon')?.value || -98.748);
  const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
  const json = await fetchJsonOpen(url);
  const features = Array.isArray(json.features) ? json.features : [];
  const names = features.map(f => f.properties?.event).filter(Boolean);
  const desc = features.map(f => `${f.properties?.event || ''} ${f.properties?.headline || ''} ${f.properties?.description || ''}`).join(' ');
  const day = shownDays().find(d => d.date === selectedProductDate()) || shownDays()[0] || blankDay(todayISO());
  const hazards = defaultHazardsFromDays(day, `${desc} ${day.short} ${day.hazard1} ${day.hazard2}`);
  const overallRisk = riskFromText(desc || `${day.short} ${day.hazard1} ${day.hazard2}`, hazards);
  const alertSummary = names.length ? `Active NWS alerts: ${names.join(', ')}.` : 'No active NWS point alerts at the selected RBRTW point.';
  return {hazards, overallRisk, summary: alertSummary, sourceNote:'Source: NWS active alerts plus selected-day forecast wording.'};
}

function mapBbox(){ const b = PRODUCT_MAP_BBOX; return `${b.west},${b.south},${b.east},${b.north}`; }
function arcgisExportUrl(serviceUrl, opts={}){
  const params = new URLSearchParams({
    bbox: opts.bbox || mapBbox(), bboxSR: '4326', imageSR: opts.imageSR || '4326',
    size: opts.size || PRODUCT_MAP_SIZE, format: opts.format || 'png32', transparent: String(opts.transparent ?? false), f: 'image'
  });
  if (opts.layers) params.set('layers', opts.layers);
  return `${serviceUrl}/export?${params.toString()}`;
}

async function fetchBasemapImage(){
  const url = arcgisExportUrl('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer', {format:'jpg', transparent:false});
  const img = await imageUrlToDataUrl(url).catch(() => null);
  return img ? {basemapImage: img, imageStatus:'Regional map base loaded'} : {imageStatus:'Regional map base unavailable; fallback terrain shown'};
}

function spcLayerForDayOffset(offset){
  const n = Number(offset || 0);
  if (n <= 0) return 1;
  if (n === 1) return 9;
  if (n === 2) return 17;
  if (n === 3) return 21;
  if (n === 4) return 22;
  if (n === 5) return 23;
  if (n === 6) return 24;
  return 25;
}

async function fetchNoaaSpcImage(dayOffset=0){
  const layer = spcLayerForDayOffset(dayOffset);
  const url = arcgisExportUrl('https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer', {layers:`show:${layer}`, transparent:true});
  const img = await imageUrlToDataUrl(url).catch(() => null);
  return img ? {outlookImage:img, overlayImage:img, imageStatus:'NOAA SPC outlook map loaded', sourceNote:`Source: NOAA/NWS SPC Weather Outlooks Map Service, layer ${layer}.`} : {sourceNote:'NOAA SPC image fetch unavailable. Generated editable outlook shown.'};
}

async function fetchNoaaRadarImage(){
  const url = arcgisExportUrl('https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity/MapServer', {layers:'show:3', transparent:true, imageSR:'3857'});
  const img = await imageUrlToDataUrl(url).catch(() => null);
  return img ? {radarImage:img, overlayImage:img, imageStatus:'NOAA MRMS radar map loaded', sourceNote:'Source: NOAA/NWS MRMS Radar Base Reflectivity Map Service.'} : {sourceNote:'NOAA MRMS image fetch unavailable. Generated radar/cloud layer shown.'};
}

function proxyUrl(url){ return `/.netlify/functions/proxy?url=${encodeURIComponent(url)}`; }
async function fetchWithProxyFallback(url, options={}){
  const tries = [];
  if (location.protocol.startsWith('http')) tries.push(proxyUrl(url));
  tries.push(url);
  let lastErr = null;
  for (const u of tries) {
    try {
      const res = await fetch(u, options);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res;
    } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error('Fetch failed');
}

async function fetchJsonOpen(url){
  const res = await fetchWithProxyFallback(url, {headers:{Accept:'application/json'}});
  return res.json();
}

async function imageUrlToDataUrl(url){
  const res = await fetchWithProxyFallback(url, {headers:{Accept:'image/png,image/jpeg,image/*,*/*'}});
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function renderProductEditor(){
  const box = $('productEditor');
  if (!box) return;
  const p = ensureProduct();
  const spec = PRODUCT_TYPES[p.type] || PRODUCT_TYPES.forecast;
  if (p.type === 'forecast') { box.innerHTML = 'Forecast Day Builder mode is active. Use the Day tab to edit each forecast card.'; return; }
  box.innerHTML = `<div class="productEditorGrid"><button id="refetchProductData" class="primaryBtn fullBtn">Re-fetch Map + Product Data</button><label>Product title<input data-product-field="title" value="${escapeAttr(p.title || spec.title)}"></label><label>Product subtitle<input data-product-field="subtitle" value="${escapeAttr(p.subtitle || spec.subtitle)}"></label><label>Summary / lower note<textarea data-product-field="summary">${escapeHtml(p.summary || p.data?.summary || '')}</textarea></label><label>Source note<textarea data-product-field="sourceNote">${escapeHtml(p.sourceNote || p.data?.sourceNote || '')}</textarea></label><div class="sectionTitle smallTitle">Map / Front Controls</div><label class="checkRow"><input type="checkbox" data-product-bool="showFront" ${p.showFront !== false ? 'checked':''}> Show pressure/front overlay on map products</label><div class="grid2"><label>Front X<input data-product-field="frontX" type="number" value="${escapeAttr(p.frontX)}"></label><label>Front Y<input data-product-field="frontY" type="number" value="${escapeAttr(p.frontY)}"></label></div><div class="grid2"><label>Front angle<input data-product-field="frontAngle" type="number" value="${escapeAttr(p.frontAngle)}"></label><label>Front length<input data-product-field="frontLength" type="number" value="${escapeAttr(p.frontLength)}"></label></div><div class="sectionTitle smallTitle">Manual Data Override</div><label>Manual map values / notes<textarea data-product-field="manualMapValues" placeholder="Optional. Example: San Antonio=97\nAustin=95\nCorpus Christi=88">${escapeHtml(p.manualMapValues || '')}</textarea></label><button id="refreshProductRender" class="secondaryBtn">Refresh Product Layout</button></div>`;
  $$('[data-product-field]').forEach(el => el.addEventListener('input', handleProductField));
  $$('[data-product-bool]').forEach(el => el.addEventListener('change', handleProductBool));
  $('refreshProductRender')?.addEventListener('click', () => { renderProduct(); setStatus('Product layout refreshed.'); });
  $('refetchProductData')?.addEventListener('click', () => autoFillProduct());
}

init();
