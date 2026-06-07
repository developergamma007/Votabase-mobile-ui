/** Google Maps helpers for React Native WebView. */

import { GOOGLE_MAPS_API_KEY } from './mapsApiKey';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export const FAMILY_AVAILABILITY_MAP_COLORS = {
  Available: '#2563eb',
  'Not Available': '#f97316',
  'Entry Denied': '#eab308',
  'Data not Given': '#9333ea',
  'Door Closed': '#ef4444',
};

export function getFamilyAvailabilityMapColor(availability) {
  return FAMILY_AVAILABILITY_MAP_COLORS[String(availability || '').trim()] || '#64748b';
}

export function getVolunteerMapColor(point = {}) {
  const gender = String(point.gender || point.sex || '').toUpperCase();
  if (gender.startsWith('M')) return '#DDA0DD';
  if (gender.startsWith('F')) return '#FFA6C9';
  return '#64748b';
}

/** Location preview iframe — no Maps Embed API required (interactive maps use Maps JavaScript API). */
export function getGoogleEmbedUrl(lat, lng, zoom = 15) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return '';
  return `https://maps.google.com/maps?q=${latNum},${lngNum}&z=${zoom}&output=embed`;
}

/** @deprecated */
export const getOsmEmbedUrl = getGoogleEmbedUrl;

export function getGoogleExternalUrl(lat, lng, zoom = 17) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return '';
  return `https://www.google.com/maps?q=${latNum},${lngNum}&z=${zoom}`;
}

/** @deprecated */
export const getOsmExternalUrl = getGoogleExternalUrl;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function googleMapsShell(initScript) {
  const key = GOOGLE_MAPS_API_KEY;
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    function post(obj) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
    function initMap() {
      ${initScript}
    }
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initMap"></script>
</body>
</html>`;
}

/** Single pin — optional draggable; posts { type: 'position', lat, lng } on drag or map click. */
export function buildGoogleWebViewHtml(lat, lng, options = {}) {
  const latN = Number(lat) || DEFAULT_CENTER.lat;
  const lngN = Number(lng) || DEFAULT_CENTER.lng;
  const zoom = options.zoom ?? 15;
  const draggable = Boolean(options.draggable);
  const clickable = Boolean(options.clickable);

  const script = `
      var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${latN}, lng: ${lngN} },
        zoom: ${zoom},
        streetViewControl: false
      });
      var marker = new google.maps.Marker({
        map: map,
        position: { lat: ${latN}, lng: ${lngN} },
        draggable: ${draggable}
      });
      function emit() {
        var p = marker.getPosition();
        post({ type: 'position', lat: p.lat(), lng: p.lng() });
      }
      if (${draggable}) marker.addListener('dragend', emit);
      if (${clickable}) {
        map.addListener('click', function(e) {
          marker.setPosition(e.latLng);
          post({ type: 'position', lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      }
  `;
  return googleMapsShell(script);
}

/** @deprecated */
export const buildOsmWebViewHtml = buildGoogleWebViewHtml;

function buildFamilyPopupHtml(point, fullDetails) {
  if (!fullDetails) {
    const status = escapeHtml(point.familyAvailability || 'Available');
    return (
      '<div style="padding:10px;font-family:sans-serif;min-width:220px;">'
      + `<div style="font-weight:700;margin-bottom:6px;">${status}</div>`
      + `<div><strong>Road:</strong> ${escapeHtml(point.roadName || '-')}</div>`
      + `<div><strong>Family #:</strong> ${escapeHtml(point.familyNumber || '-')}</div>`
      + `<div><strong>Name:</strong> ${escapeHtml(point.familyName || '-')}</div>`
      + `<div><strong>Flat:</strong> ${escapeHtml(point.flatNumber || '-')}</div>`
      + '</div>'
    );
  }
  const members = Array.isArray(point.members) ? point.members : [];
  const memberLines = members.length
    ? members.map((m, i) => {
      const name = escapeHtml(m.voterName || m.name || '-');
      const epic = escapeHtml(m.epicNo || m.epic || '-');
      const rel = escapeHtml(m.relationName || m.relation || '-');
      return `${i + 1}. ${name} | ${epic} | ${rel}`;
    }).join('<br/>')
    : 'No members listed';
  return (
    '<div style="padding:10px;font-family:sans-serif;min-width:240px;max-width:320px;">'
    + `<div><strong>Road:</strong> ${escapeHtml(point.roadName || '-')}</div>`
    + `<div><strong>Family #:</strong> ${escapeHtml(point.familyNumber || '-')}</div>`
    + `<div><strong>Name:</strong> ${escapeHtml(point.familyName || '-')}</div>`
    + `<div><strong>Flat:</strong> ${escapeHtml(point.flatNumber || '-')}</div>`
    + `<div style="margin-top:8px;"><strong>Members:</strong><br/>${memberLines}</div>`
    + '</div>'
  );
}

function buildVolunteerPopupHtml(point) {
  return (
    '<div style="padding:10px;font-family:sans-serif;min-width:200px;">'
    + `<div style="font-weight:700;margin-bottom:6px;">${escapeHtml(point.name || 'Voter')}</div>`
    + `<div><strong>Relation:</strong> ${escapeHtml(point.relationName || '-')}</div>`
    + `<div><strong>EPIC:</strong> ${escapeHtml(point.epic || '-')}</div>`
    + `<div><strong>Mobile:</strong> ${escapeHtml(point.mobile || '-')}</div>`
    + `<div><strong>Gender:</strong> ${escapeHtml(point.gender || '-')}</div>`
    + '</div>'
  );
}

function normalizeMapPoints(points = []) {
  return (Array.isArray(points) ? points : [])
    .map((p, index) => ({
      index,
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      raw: p,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0));
}

/** Family map — coloured markers; posts { type: 'select', index } on marker click. */
export function buildFamilyPointsGoogleWebViewHtml(points = [], options = {}) {
  const { fullDetails = false } = options;
  const valid = normalizeMapPoints(points).map((p) => ({
    index: p.index,
    lat: p.lat,
    lng: p.lng,
    color: getFamilyAvailabilityMapColor(p.raw.familyAvailability),
    popup: buildFamilyPopupHtml(p.raw, fullDetails),
  }));

  if (!valid.length) return '';

  const payload = JSON.stringify(valid);
  const center = valid[0];

  const script = `
      var items = ${payload};
      var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${center.lat}, lng: ${center.lng} },
        zoom: 14,
        streetViewControl: false
      });
      var bounds = new google.maps.LatLngBounds();
      var infoWindow = new google.maps.InfoWindow();
      items.forEach(function(item) {
        var marker = new google.maps.Marker({
          map: map,
          position: { lat: item.lat, lng: item.lng },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: item.color, fillOpacity: 0.95, strokeColor: '#fff', strokeWeight: 2 }
        });
        bounds.extend(marker.getPosition());
        marker.addListener('click', function() {
          infoWindow.setContent(item.popup);
          infoWindow.open({ map: map, anchor: marker });
          post({ type: 'select', index: item.index });
        });
      });
      if (items.length >= 2) map.fitBounds(bounds, 48);
      else if (items.length === 1) map.setCenter(bounds.getCenter());
  `;

  return googleMapsShell(script);
}

/** @deprecated */
export const buildFamilyPointsOsmWebViewHtml = buildFamilyPointsGoogleWebViewHtml;

/** Volunteer enrichment map — gender-coloured markers. */
export function buildVolunteerPointsGoogleWebViewHtml(points = []) {
  const valid = normalizeMapPoints(points).map((p) => ({
    index: p.index,
    lat: p.lat,
    lng: p.lng,
    color: getVolunteerMapColor(p.raw),
    popup: buildVolunteerPopupHtml(p.raw),
  }));

  if (!valid.length) return '';

  const payload = JSON.stringify(valid);
  const center = valid[0];

  const script = `
      var items = ${payload};
      var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${center.lat}, lng: ${center.lng} },
        zoom: 13,
        streetViewControl: false
      });
      var bounds = new google.maps.LatLngBounds();
      var infoWindow = new google.maps.InfoWindow();
      items.forEach(function(item) {
        var marker = new google.maps.Marker({
          map: map,
          position: { lat: item.lat, lng: item.lng },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: item.color, fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 }
        });
        bounds.extend(marker.getPosition());
        marker.addListener('click', function() {
          infoWindow.setContent(item.popup);
          infoWindow.open({ map: map, anchor: marker });
          post({ type: 'select', index: item.index });
        });
      });
      if (items.length >= 2) map.fitBounds(bounds, 48);
      else if (items.length === 1) map.setCenter(bounds.getCenter());
  `;

  return googleMapsShell(script);
}

/** @deprecated */
export const buildVolunteerPointsOsmWebViewHtml = buildVolunteerPointsGoogleWebViewHtml;
