import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type SoyibaMapMarker = {
  id: string;
  title: string;
  subtitle?: string;
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
};

export function SoyibaMap({ center = [4.4389, -75.2322], zoom = 12, className, markers = [], userLocation }: SoyibaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerKey = useMemo(
    () => markers.map((marker) => `${marker.id}:${marker.position[0]},${marker.position[1]}`).join('|'),
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
      html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#0B1F5B;border:4px solid white;box-shadow:0 10px 24px rgba(11,31,91,.28)"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12],
    });
    const userIcon = L.divIcon({
      className: '',
      html: '<span style="display:grid;place-items:center;width:24px;height:24px;border-radius:9999px;background:#16A34A;border:4px solid white;box-shadow:0 10px 24px rgba(22,163,74,.32)"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -13],
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

    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [28, 28], maxZoom: 15 });
    }

    window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
    };
  }, [center, markerKey, markers, userLocation, zoom]);

  return <div ref={containerRef} className={`min-h-72 w-full overflow-hidden rounded-lg ${className ?? ''}`} />;
}

function buildMarkerPopup(marker: SoyibaMapMarker) {
  return [
    `<strong>${escapeHtml(marker.title)}</strong>`,
    marker.subtitle ? `<br><span>${escapeHtml(marker.subtitle)}</span>` : '',
    marker.mapsUrl
      ? `<br><a href="${escapeAttribute(marker.mapsUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:8px;font-weight:800;color:#145CFF">Abrir en Google Maps</a>`
      : '',
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
