import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type SoyibaMapProps = {
  center?: [number, number];
  zoom?: number;
  className?: string;
};

export function SoyibaMap({ center = [6.2442, -75.5812], zoom = 12, className }: SoyibaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    return () => {
      map.remove();
    };
  }, [center, zoom]);

  return <div ref={containerRef} className={`min-h-72 w-full overflow-hidden rounded-lg ${className ?? ''}`} />;
}
