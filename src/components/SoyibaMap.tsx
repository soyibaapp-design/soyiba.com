import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type SoyibaMapMarker = {
  id: string;
  title: string;
  subtitle?: string;
  distanceLabel?: string;
  locationLabel?: string;
  position: [number, number];
  mapsUrl?: string;
  onClick?: () => void;
};

type SoyibaMapProps = {
  center?: [number, number];
  zoom?: number;
  className?: string;
  markers?: SoyibaMapMarker[];
  userLocation?: [number, number] | null;
  focusUserLocation?: boolean;
  userZoom?: number;
};

export function SoyibaMap({
  center = [4.4389, -75.2322],
  zoom = 12,
  className,
  markers = [],
  userLocation,
  focusUserLocation = false,
  userZoom = 15,
}: SoyibaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerKey = useMemo(
    () => markers.map((marker) => `${marker.id}:${marker.position[0]},${marker.position[1]}:${marker.distanceLabel || ''}`).join('|'),
    [markers],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    const ecoIcon = L.divIcon({
      className: '',
      html: buildEcoHouseIconHtml(),
      iconSize: [42, 42],
      iconAnchor: [21, 38],
      popupAnchor: [0, -36],
    });
    const userIcon = L.divIcon({
      className: '',
      html: '<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:#145CFF;border:4px solid white;box-shadow:0 12px 28px rgba(20,92,255,.32)"><span style="display:block;width:10px;height:10px;border-radius:9999px;background:white"></span></span>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });

    markers.forEach((marker) => {
      const leafletMarker = L.marker(marker.position, { icon: ecoIcon }).addTo(map);
      leafletMarker.bindPopup(buildMarkerPopup(marker), { maxWidth: 240 });

      if (marker.onClick) {
        leafletMarker.on('click', marker.onClick);
      }
    });

    if (userLocation) {
      L.marker(userLocation, { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong>Tu ubicacion actual</strong>', { maxWidth: 220 });
    }

    const boundsPoints = [
      ...markers.map((marker) => marker.position),
      ...(userLocation ? [userLocation] : []),
    ];

    if (focusUserLocation && userLocation) {
      map.setView(userLocation, userZoom, { animate: false });
    } else if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [28, 28], maxZoom: 15 });
    } else if (userLocation) {
      map.setView(userLocation, userZoom, { animate: false });
    }

    window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
    };
  }, [center, focusUserLocation, markerKey, markers, userLocation, userZoom, zoom]);

  return <div ref={containerRef} className={`min-h-72 w-full overflow-hidden rounded-lg ${className ?? ''}`} />;
}

function buildMarkerPopup(marker: SoyibaMapMarker) {
  return [
    '<div style="min-width:190px">',
    '<span style="display:inline-block;margin-bottom:6px;border-radius:9999px;background:#E6FAF1;padding:4px 9px;color:#087A57;font-size:11px;font-weight:900">Grupo ECO</span>',
    `<strong style="display:block;color:#0B1F5B;font-size:14px;line-height:18px">${escapeHtml(marker.title)}</strong>`,
    marker.locationLabel ? `<span style="display:block;margin-top:4px;color:#52637C;font-size:12px;font-weight:700">${escapeHtml(marker.locationLabel)}</span>` : '',
    marker.distanceLabel ? `<span style="display:block;margin-top:8px;color:#087A57;font-size:12px;font-weight:900">Distancia: ${escapeHtml(marker.distanceLabel)}</span>` : '',
    marker.subtitle && !marker.locationLabel && !marker.distanceLabel ? `<span style="display:block;margin-top:6px;color:#52637C;font-size:12px;font-weight:700">${escapeHtml(marker.subtitle)}</span>` : '',
    marker.mapsUrl
      ? `<a href="${escapeAttribute(marker.mapsUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:10px;font-weight:900;color:#145CFF">Abrir en Google Maps</a>`
      : '',
    '</div>',
  ].join('');
}

function buildEcoHouseIconHtml() {
  return [
    '<span style="display:grid;place-items:center;width:42px;height:42px;border-radius:18px 18px 18px 4px;background:#087A57;border:4px solid white;box-shadow:0 14px 30px rgba(8,122,87,.3);transform:rotate(-45deg)">',
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style="transform:rotate(45deg);color:white" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
    '<path d="m3 10.5 9-7 9 7"></path>',
    '<path d="M5 9.5V20h14V9.5"></path>',
    '<path d="M9 20v-6h6v6"></path>',
    '</svg>',
    '</span>',
  ].join('');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
