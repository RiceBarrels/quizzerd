'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet (only run on client)
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  
  // Add custom CSS for modern styling
  const style = document.createElement('style');
  style.textContent = `
    .leaflet-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) !important;
      border-radius: 0.5rem !important;
      overflow: hidden;
    }
    .leaflet-control-zoom a {
      background-color: white !important;
      color: #374151 !important;
      border: none !important;
      transition: all 0.2s ease !important;
    }
    .leaflet-control-zoom a:hover {
      background-color: #f3f4f6 !important;
      color: #111827 !important;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 0.5rem !important;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
    }
    .leaflet-tile-container img {
      filter: brightness(0.95) contrast(1.05) saturate(1.1) !important;
    }
  `;
  document.head.appendChild(style);
}

// Component to handle map clicks
export function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to handle map centering
export function MapCenterHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

// Export Leaflet components
export { MapContainer, TileLayer, Circle, Marker };

