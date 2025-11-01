'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationData {
  coordinates: string; // "latitude,longitude"
  rangeInMeters: string;
}

interface LocationPickerProps {
  value: LocationData;
  onChange: (value: LocationData) => void;
}

// Component to handle map clicks
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to handle map centering
function MapCenterHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  // Parse coordinates from the value
  const coordinates = value.coordinates ? value.coordinates.split(',').map(Number) : null;
  const latitude = coordinates && coordinates.length === 2 ? coordinates[0] : null;
  const longitude = coordinates && coordinates.length === 2 ? coordinates[1] : null;
  const rangeInMeters = value.rangeInMeters ? parseInt(value.rangeInMeters) : 100;
  
  // Default center (San Francisco)
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  
  useEffect(() => {
    setMounted(true);
    
    // If coordinates are already set, center on them
    if (latitude && longitude) {
      setMapCenter([latitude, longitude]);
    }
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    onChange({
      ...value,
      coordinates: `${lat},${lng}`,
    });
  };

  const handleRangeChange = (range: string) => {
    const numRange = parseInt(range) || 100;
    onChange({
      ...value,
      rangeInMeters: numRange.toString(),
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        onChange({
          ...value,
          coordinates: `${lat},${lng}`,
        });
        setMapCenter([lat, lng]);
        setSearching(false);
        toast.success('Location set to current position');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get current location. Please enable location permissions.');
        setSearching(false);
      }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setSearching(true);
    try {
      // Using Nominatim API (OpenStreetMap's geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'User-Agent': 'ExamLocationPicker/1.0',
          },
        }
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        onChange({
          ...value,
          coordinates: `${lat},${lng}`,
        });
        setMapCenter([lat, lng]);
        toast.success(`Location set to: ${data[0].display_name}`);
      } else {
        toast.error('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Don't render map on server
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Restriction
          </CardTitle>
          <CardDescription>
            Loading map...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Restriction
        </CardTitle>
        <CardDescription>
          Set the allowed location and radius for taking this exam. Students must be within the specified range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="space-y-2">
          <Label>Search Location</Label>
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Enter address, city, or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={handleGetCurrentLocation}
              disabled={searching}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              Use Current Location
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="space-y-2">
          <Label>Click on the map to set location</Label>
          <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onClick={handleMapClick} />
              <MapCenterHandler center={mapCenter} />
              
              {latitude && longitude && (
                <>
                  <Marker position={[latitude, longitude]} />
                  <Circle
                    center={[latitude, longitude]}
                    radius={rangeInMeters}
                    pathOptions={{
                      color: 'blue',
                      fillColor: 'blue',
                      fillOpacity: 0.1,
                    }}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Range Input */}
        <div className="space-y-2">
          <Label htmlFor="range">Allowed Range (meters)</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="range"
              type="number"
              min="10"
              max="10000"
              step="10"
              value={rangeInMeters}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="max-w-xs"
            />
            <span className="text-sm text-muted-foreground">
              meters (~{Math.round(rangeInMeters * 3.28084)} feet)
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Students must be within this distance from the marked location to take the exam.
          </p>
        </div>

        {/* Selected Location Info */}
        {latitude && longitude && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Selected Location:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Latitude:</span>{' '}
                <span className="font-mono">{latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Longitude:</span>{' '}
                <span className="font-mono">{longitude.toFixed(6)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Range:</span>{' '}
                <span className="font-mono">{rangeInMeters}m</span>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> Students will be asked to share their location when starting the exam. 
            If they are outside the allowed range, they won't be able to proceed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

