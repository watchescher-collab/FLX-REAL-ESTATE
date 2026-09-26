import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Property } from '../types';
import 'leaflet/dist/leaflet.css';

interface RealEstateLeafletMapProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  onOpenDetails: (property: Property) => void;
  userLocation: { lat: number; lng: number } | null;
}

const satelliteTiles = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
);

const streetTiles = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
);

export const RealEstateLeafletMap: React.FC<RealEstateLeafletMapProps> = ({
  properties,
  selectedProperty,
  onSelectProperty,
  onOpenDetails,
  userLocation,
}) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const callbacksRef = useRef({ onSelectProperty, onOpenDetails });

  useEffect(() => {
    callbacksRef.current = { onSelectProperty, onOpenDetails };
  }, [onSelectProperty, onOpenDetails]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: [-6.7924, 39.2083],
      zoom: 11,
      zoomControl: false,
    });

    satelliteTiles.addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.layers({ Satellite: satelliteTiles, Streets: streetTiles }, undefined, { position: 'topright' }).addTo(map);

    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    properties.forEach((property) => {
      const { lat, lng } = property.location;
      bounds.push([lat, lng]);
      const isSelected = selectedProperty?.id === property.id;
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'fx-leaflet-property-marker',
          html: `<span class="fx-leaflet-marker-pin ${isSelected ? 'is-selected' : ''}"><span></span></span>`,
          iconSize: [30, 38],
          iconAnchor: [15, 38],
        }),
      });

      const popup = document.createElement('button');
      popup.type = 'button';
      popup.className = 'fx-leaflet-popup';
      const title = document.createElement('strong');
      title.textContent = property.title;
      const city = document.createElement('span');
      city.textContent = property.location.city;
      const intent = document.createElement('b');
      intent.textContent = property.property_type === 'Invest' ? 'For sale' : 'For rent';
      popup.append(title, city, intent);
      popup.addEventListener('click', () => callbacksRef.current.onOpenDetails(property));
      marker.bindPopup(popup);
      marker.on('click', () => callbacksRef.current.onSelectProperty(property));
      marker.addTo(markerLayer);
    });

    if (bounds.length && !userLocation) {
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 12 });
    }
  }, [properties, selectedProperty, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(map).bindTooltip('Your location');
    } else {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    }

    map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1.2 });
  }, [userLocation]);

  return <div ref={mapElementRef} className="fx-real-leaflet-map" aria-label="Satellite map of available FLX properties" />;
};
