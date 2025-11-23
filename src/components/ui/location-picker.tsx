'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import('./leaflet-components').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('./leaflet-components').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Circle = dynamic(
  () => import('./leaflet-components').then((mod) => mod.Circle),
  { ssr: false }
);

const Marker = dynamic(
  () => import('./leaflet-components').then((mod) => mod.Marker),
  { ssr: false }
);

const MapClickHandler = dynamic(
  () => import('./leaflet-components').then((mod) => ({ default: mod.MapClickHandler })),
  { ssr: false }
);

const MapCenterHandler = dynamic(
  () => import('./leaflet-components').then((mod) => ({ default: mod.MapCenterHandler })),
  { ssr: false }
);

interface LocationData {
  coordinates: string; // "latitude,longitude"
  rangeInMeters: string;
}

interface LocationPickerProps {
  value: LocationData;
  onChange: (value: LocationData) => void;
}

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  place_id: number;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<LocationSuggestion | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    onChange({
      ...value,
      coordinates: `${lat},${lng}`,
    });
    // Clear search query when clicking on map
    setSearchQuery('');
    setSelectedSuggestion(null);
  }, [value, onChange]);

  const handleRangeChange = useCallback((range: string) => {
    const numRange = parseInt(range) || 100;
    onChange({
      ...value,
      rangeInMeters: numRange.toString(),
    });
  }, [value, onChange]);

  const handleGetCurrentLocation = useCallback(() => {
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
      (error: GeolocationPositionError) => {
        let errorMessage = 'Failed to get current location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'Failed to get current location. Please try again.';
            break;
        }
        
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT,
        });
        
        toast.error(errorMessage);
        setSearching(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [value, onChange]);

  // Fetch location suggestions from OpenStreetMap Nominatim API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ExamLocationPicker/1.0',
          },
        }
      );
      
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        setSuggestions(data);
        setSuggestionsOpen(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 300); // 300ms debounce
    } else {
      setSuggestions([]);
      setSuggestionsOpen(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchSuggestions]);

  // Handle selecting a suggestion
  const handleSelectSuggestion = useCallback((suggestion: LocationSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    onChange({
      ...value,
      coordinates: `${lat},${lng}`,
    });
    setMapCenter([lat, lng]);
    setSearchQuery(suggestion.display_name);
    setSelectedSuggestion(suggestion);
    setSuggestionsOpen(false);
    setSuggestions([]);
    toast.success(`Location set to: ${suggestion.display_name}`);
  }, [value, onChange]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setSearching(true);
    setSuggestionsOpen(false);
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
        setSelectedSuggestion(data[0]);
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
  }, [searchQuery, value, onChange]);

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
        {/* Search Bar with Autocomplete */}
        <div className="space-y-2">
          <Label>Search Location</Label>
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2 relative">
              <div className="flex-1 relative">
                <Popover open={suggestionsOpen && suggestions.length > 0} onOpenChange={setSuggestionsOpen}>
                  <PopoverAnchor asChild>
                    <div className="w-full">
                      <Input
                        ref={inputRef}
                        placeholder="Enter address, city, or landmark..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSelectedSuggestion(null);
                        }}
                        onFocus={() => {
                          if (suggestions.length > 0) {
                            setSuggestionsOpen(true);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearch();
                            setSuggestionsOpen(false);
                          } else if (e.key === 'Escape') {
                            setSuggestionsOpen(false);
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                  </PopoverAnchor>
                  <PopoverContent 
                    className="w-[var(--radix-popover-anchor-width)] p-1 max-h-[300px] overflow-y-auto" 
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => {
                      e.preventDefault();
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestions.length === 0 && searchQuery.length >= 2 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        {searching ? 'Searching...' : 'No locations found'}
                      </div>
                    )}
                    {suggestions.length > 0 && (
                      <div className="space-y-1">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion.place_id}
                            onClick={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(suggestion);
                              setSuggestionsOpen(false);
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input blur
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              "focus:bg-accent focus:text-accent-foreground",
                              "cursor-pointer flex items-start gap-2",
                              selectedSuggestion?.place_id === suggestion.place_id && "bg-accent"
                            )}
                          >
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium truncate">{suggestion.display_name}</span>
                              {suggestion.type && (
                                <span className="text-xs text-muted-foreground capitalize">
                                  {suggestion.type.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
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
          {suggestions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} from OpenStreetMap
            </p>
          )}
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
              zoomControl={true}
              className="rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={19}
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
                      color: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.2,
                      weight: 2,
                      opacity: 0.8,
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

