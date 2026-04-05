import { useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color = 'blue', size: 'small' | 'medium' | 'large' = 'medium') => {
  const sizes: Record<string, [number, number]> = {
    small: [20, 32],
    medium: [25, 41],
    large: [30, 50]
  };

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: sizes[size],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

interface MapEventsProps {
  onMapClick?: (latlng: L.LatLng) => void;
  onLocationFound?: (latlng: L.LatLng) => void;
}

const MapEvents = ({ onMapClick, onLocationFound }: MapEventsProps) => {
  const map = useMapEvents({
    click: (e) => {
      onMapClick?.(e.latlng);
    },
    locationfound: (e) => {
      onLocationFound?.(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return null;
};

interface CustomControlsProps {
  onLocate: () => void;
  onToggleLayer: (layer: string) => void;
}

const CustomControls = ({ onLocate, onToggleLayer }: CustomControlsProps) => {
  const map = useMap();

  useEffect(() => {
    const control = L.control({ position: 'topright' });

    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'custom-controls');
      div.innerHTML = `
        <div style="background:rgba(255,255,255,0.95);padding:8px;border-radius:8px;border:1px solid #e2e8f0;backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <button id="locate-btn" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:rgba(13,148,136,0.08);color:#0d9488;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1px;">[ ] LOCATE</button>
          <button id="satellite-btn" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#f8fafc;color:#64748b;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1px;">[S] SATELLITE</button>
        </div>
      `;

      L.DomEvent.disableClickPropagation(div);

      div.querySelector('#locate-btn')!.onclick = () => onLocate();
      div.querySelector('#satellite-btn')!.onclick = () => onToggleLayer('satellite');

      return div;
    };

    control.addTo(map);
    return () => { control.remove(); };
  }, [map, onLocate, onToggleLayer]);

  return null;
};

interface SearchControlProps {
  onSearch?: (result: { latLng: [number, number]; name: string }) => void;
}

const SearchControl = ({ onSearch }: SearchControlProps) => {
  const map = useMap();

  useEffect(() => {
    const control = L.control({ position: 'topleft' });

    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'search-control');
      div.innerHTML = `
        <div style="background:rgba(255,255,255,0.95);padding:8px;border-radius:8px;border:1px solid #e2e8f0;backdrop-filter:blur(8px);display:flex;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <input
            id="map-search-input"
            type="text"
            placeholder="Search location..."
            style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#0f172a;font-family:'Share Tech Mono',monospace;font-size:11px;width:180px;outline:none;"
          />
          <button
            id="map-search-btn"
            style="padding:6px 10px;border:1px solid #99f6e4;border-radius:6px;cursor:pointer;background:rgba(13,148,136,0.08);color:#0d9488;font-size:12px;"
          >&gt;</button>
        </div>
      `;

      L.DomEvent.disableClickPropagation(div);

      const input = div.querySelector('#map-search-input') as HTMLInputElement;
      const button = div.querySelector('#map-search-btn')!;

      const doSearch = async () => {
        const q = input.value.trim();
        if (!q) return;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
          const results = await res.json();
          if (results.length > 0) {
            const { lat, lon, display_name } = results[0];
            const latLng: [number, number] = [parseFloat(lat), parseFloat(lon)];
            map.flyTo(latLng, 13);
            onSearch?.({ latLng, name: display_name });
          }
        } catch (err) {
          console.error('Search error:', err);
        }
      };

      input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
      button.addEventListener('click', doSearch);

      return div;
    };

    control.addTo(map);
    return () => { control.remove(); };
  }, [map, onSearch]);

  return null;
};

export interface MapMarker {
  id: string | number;
  position: [number, number];
  color?: string;
  size?: 'small' | 'medium' | 'large';
  icon?: L.Icon;
  popup?: {
    title: string;
    content: string;
    image?: string;
    richHtml?: string;
  };
}

export interface MapPolygon {
  id: string | number;
  positions: [number, number][];
  style?: L.PathOptions;
  popup?: string;
}

export interface MapCircle {
  id: string | number;
  center: [number, number];
  radius: number;
  style?: L.PathOptions;
  popup?: string;
}

export interface MapPolyline {
  id: string | number;
  positions: [number, number][];
  style?: L.PathOptions;
  popup?: string;
}

function ClusterLayer({ markers, onMarkerClick, onMarkerDblClick, maxMarkers = 2000 }: { markers: MapMarker[]; onMarkerClick?: (marker: MapMarker) => void; onMarkerDblClick?: (marker: MapMarker) => void; maxMarkers?: number }) {
  const map = useMap();

  useEffect(() => {
    const group = L.featureGroup();
    const displayMarkers = markers.slice(0, maxMarkers);

    displayMarkers.forEach((marker) => {
      const m = L.marker(marker.position, {
        icon: marker.icon || createCustomIcon(marker.color, marker.size),
      });
      m.on('click', () => onMarkerClick?.(marker));
      m.on('dblclick', (e) => {
        L.DomEvent.stopPropagation(e);
        onMarkerDblClick?.(marker);
      });
      if (marker.popup) {
        const popupContent = marker.popup.richHtml || `<div style="font-family:'Share Tech Mono',monospace;">
            <h3 style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0f172a">${marker.popup.title}</h3>
            <p style="margin:0;font-size:11px;color:#475569">${marker.popup.content}</p>
          </div>`;
        m.bindPopup(popupContent, { maxWidth: 380, minWidth: 320, className: 'action-terminal-popup' });
        m.bindTooltip(
          `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:0.5px">
            <strong>${marker.popup.title}</strong>
          </div>`,
          { className: "cmd-tooltip", direction: "top", offset: [0, -18] }
        );
      }
      m.addTo(group);
    });

    group.addTo(map);
    return () => { group.remove(); };
  }, [markers, map, onMarkerClick, onMarkerDblClick]);

  return null;
}

interface AdvancedMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  polygons?: MapPolygon[];
  circles?: MapCircle[];
  polylines?: MapPolyline[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMarkerDblClick?: (marker: MapMarker) => void;
  onMapClick?: (latlng: L.LatLng) => void;
  enableClustering?: boolean;
  enableSearch?: boolean;
  enableControls?: boolean;
  mapLayers?: { openstreetmap?: boolean; satellite?: boolean; dark?: boolean; light?: boolean };
  maxMarkers?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const AdvancedMap = ({
  center = [51.505, -0.09],
  zoom = 13,
  markers = [],
  polygons = [],
  circles = [],
  polylines = [],
  onMarkerClick,
  onMarkerDblClick,
  onMapClick,
  enableClustering = true,
  enableSearch = true,
  enableControls = true,
  mapLayers = { light: true },
  maxMarkers = 1000,
  className = '',
  style = { height: '500px', width: '100%' },
  children
}: AdvancedMapProps) => {
  const [currentLayers, setCurrentLayers] = useState(mapLayers);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchResult, setSearchResult] = useState<{ latLng: [number, number]; name: string } | null>(null);

  const handleToggleLayer = useCallback((layerType: string) => {
    setCurrentLayers(prev => ({ ...prev, [layerType]: !prev[layerType as keyof typeof prev] }));
  }, []);

  const handleLocate = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
        (error) => console.error('Geolocation error:', error)
      );
    }
  }, []);

  const handleSearch = useCallback((result: { latLng: [number, number]; name: string }) => {
    setSearchResult(result);
  }, []);

  const renderMarkers = (markerList: MapMarker[]) =>
    markerList.map((marker) => (
      <Marker
        key={marker.id}
        position={marker.position}
        icon={marker.icon || createCustomIcon(marker.color, marker.size)}
        eventHandlers={{ click: () => onMarkerClick?.(marker) }}
      >
        {marker.popup && (
          <Popup>
            <div className="cmd-popup-content">
              <h3 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700 }}>{marker.popup.title}</h3>
              <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>{marker.popup.content}</p>
              {marker.popup.image && (
                <img src={marker.popup.image} alt={marker.popup.title} style={{ maxWidth: '200px', height: 'auto', marginTop: '6px', borderRadius: '4px' }} />
              )}
            </div>
          </Popup>
        )}
      </Marker>
    ));

  return (
    <div className={`advanced-map ${className}`} style={style}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
      >
        {(currentLayers as any).light && !currentLayers.satellite && !currentLayers.dark && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        )}

        {currentLayers.dark && !currentLayers.satellite && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        )}

        {currentLayers.openstreetmap && !currentLayers.dark && !(currentLayers as any).light && !currentLayers.satellite && (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {currentLayers.satellite && (
          <TileLayer
            attribution='&copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        <MapEvents onMapClick={onMapClick} onLocationFound={(ll) => setUserLocation([ll.lat, ll.lng])} />

        {enableSearch && <SearchControl onSearch={handleSearch} />}
        {enableControls && <CustomControls onLocate={handleLocate} onToggleLayer={handleToggleLayer} />}

        {enableClustering ? (
          <ClusterLayer markers={markers} onMarkerClick={onMarkerClick} onMarkerDblClick={onMarkerDblClick} maxMarkers={maxMarkers} />
        ) : (
          renderMarkers(markers.slice(0, maxMarkers))
        )}

        {userLocation && (
          <Marker position={userLocation} icon={createCustomIcon('red', 'medium')}>
            <Popup>Your current location</Popup>
          </Marker>
        )}

        {searchResult && (
          <Marker position={searchResult.latLng} icon={createCustomIcon('green', 'large')}>
            <Popup>{searchResult.name}</Popup>
          </Marker>
        )}

        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.positions}
            pathOptions={polygon.style || { color: '#0d9488', weight: 2, fillOpacity: 0.15 }}
          >
            {polygon.popup && <Popup>{polygon.popup}</Popup>}
          </Polygon>
        ))}

        {circles.map((circle) => (
          <Circle
            key={circle.id}
            center={circle.center}
            radius={circle.radius}
            pathOptions={circle.style || { color: '#0d9488', weight: 2, fillOpacity: 0.1 }}
          >
            {circle.popup && <Popup>{circle.popup}</Popup>}
          </Circle>
        ))}

        {polylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            positions={polyline.positions}
            pathOptions={polyline.style || { color: '#14b8a6', weight: 3 }}
          >
            {polyline.popup && <Popup>{polyline.popup}</Popup>}
          </Polyline>
        ))}

        {children}
      </MapContainer>
    </div>
  );
};
