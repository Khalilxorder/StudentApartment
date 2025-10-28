'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Search, Bell, BellOff, MapPin, DollarSign, Home, Users, Bath, Car, PawPrint, Sofa } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface SavedSearchData {
  name: string;
  description?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyTypes: string[];
  amenities: string[];
  location?: string;
  locationRadius?: number;
  petFriendly?: boolean;
  furnished?: boolean;
  parkingAvailable?: boolean;
  emailAlertsEnabled: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

interface SavedSearchCreationProps {
  initialFilters?: Partial<SavedSearchData>;
  onSave?: (searchData: SavedSearchData) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  existingSearch?: any;
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment', icon: Home },
  { value: 'house', label: 'House', icon: Home },
  { value: 'condo', label: 'Condo', icon: Home },
  { value: 'townhouse', label: 'Townhouse', icon: Home },
  { value: 'studio', label: 'Studio', icon: Home },
  { value: 'room', label: 'Room for Rent', icon: Users }
];

const AMENITIES = [
  { value: 'pool', label: 'Swimming Pool', icon: null },
  { value: 'gym', label: 'Fitness Center', icon: null },
  { value: 'parking', label: 'Parking', icon: Car },
  { value: 'laundry', label: 'In-Unit Laundry', icon: null },
  { value: 'dishwasher', label: 'Dishwasher', icon: null },
  { value: 'air-conditioning', label: 'Air Conditioning', icon: null },
  { value: 'heating', label: 'Central Heating', icon: null },
  { value: 'balcony', label: 'Balcony/Patio', icon: null },
  { value: 'hardwood-floors', label: 'Hardwood Floors', icon: null },
  { value: 'pet-friendly', label: 'Pet Friendly', icon: PawPrint },
  { value: 'furnished', label: 'Furnished', icon: Sofa }
];

export default function SavedSearchCreation({
  initialFilters = {},
  onSave,
  onCancel,
  mode = 'create',
  existingSearch
}: SavedSearchCreationProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [searchData, setSearchData] = useState<SavedSearchData>({
    name: '',
    description: '',
    propertyTypes: [],
    amenities: [],
    emailAlertsEnabled: true,
    alertFrequency: 'daily',
    ...initialFilters
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (existingSearch) {
      setSearchData({
        name: existingSearch.name || '',
        description: existingSearch.description || '',
        minPrice: existingSearch.min_price,
        maxPrice: existingSearch.max_price,
        bedrooms: existingSearch.bedrooms,
        bathrooms: existingSearch.bathrooms,
        minArea: existingSearch.min_area_sqft,
        maxArea: existingSearch.max_area_sqft,
        propertyTypes: existingSearch.property_types || [],
        amenities: existingSearch.amenities || [],
        location: existingSearch.location_center ? 'Custom Location' : undefined,
        locationRadius: existingSearch.location_radius_miles,
        petFriendly: existingSearch.pet_friendly,
        furnished: existingSearch.furnished,
        parkingAvailable: existingSearch.parking_available,
        emailAlertsEnabled: existingSearch.email_alerts_enabled ?? true,
        alertFrequency: existingSearch.alert_frequency || 'daily'
      });
    }
  }, [existingSearch]);

  const handleLocationSearch = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      // This would integrate with Google Places API or similar
      // For now, we'll use a simple mock
      const mockSuggestions = [
        `${query} University District`,
        `${query} Downtown`,
        `${query} Midtown`,
        `${query} Arts District`
      ];
      setLocationSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Location search error:', error);
    }
  };

  const handlePropertyTypeToggle = (propertyType: string) => {
    setSearchData(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(propertyType)
        ? prev.propertyTypes.filter(type => type !== propertyType)
        : [...prev.propertyTypes, propertyType]
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setSearchData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!searchData.name.trim()) {
      errors.push('Search name is required');
    }

    if (searchData.minPrice && searchData.maxPrice && searchData.minPrice > searchData.maxPrice) {
      errors.push('Minimum price cannot be greater than maximum price');
    }

    if (searchData.minArea && searchData.maxArea && searchData.minArea > searchData.maxArea) {
      errors.push('Minimum area cannot be greater than maximum area');
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === 'edit' && existingSearch
        ? `/api/saved-searches/${existingSearch.id}`
        : '/api/saved-searches';

      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save search');
      }

      const result = await response.json();

      toast({
        title: mode === 'edit' ? 'Search Updated!' : 'Search Saved!',
        description: mode === 'edit'
          ? 'Your saved search has been updated successfully.'
          : 'Your search has been saved and email alerts are now active.',
      });

      onSave?.(searchData);
      router.refresh();

    } catch (error) {
      console.error('Save search error:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="w-5 h-5" />
          {mode === 'edit' ? 'Edit Saved Search' : 'Create Saved Search'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Search Name *</Label>
                <Input
                  id="name"
                  value={searchData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., '2BR near campus under $1500'"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={searchData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what you're looking for"
                />
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Price Range
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPrice">Minimum Price</Label>
                <Input
                  id="minPrice"
                  type="number"
                  min="0"
                  step="50"
                  value={searchData.minPrice || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchData(prev => ({
                    ...prev,
                    minPrice: parseInt(e.target.value) || undefined
                  }))}
                  placeholder="e.g., 1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice">Maximum Price</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  min="0"
                  step="50"
                  value={searchData.maxPrice || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchData(prev => ({
                    ...prev,
                    maxPrice: parseInt(e.target.value) || undefined
                  }))}
                  placeholder="e.g., 2000"
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Home className="w-5 h-5" />
              Property Details
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Select
                  value={searchData.bedrooms?.toString() || ''}
                  onValueChange={(value: string) => setSearchData(prev => ({
                    ...prev,
                    bedrooms: value ? parseInt(value) : undefined
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="0">Studio</SelectItem>
                    <SelectItem value="1">1 BR</SelectItem>
                    <SelectItem value="2">2 BR</SelectItem>
                    <SelectItem value="3">3 BR</SelectItem>
                    <SelectItem value="4">4+ BR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Select
                  value={searchData.bathrooms?.toString() || ''}
                  onValueChange={(value: string) => setSearchData(prev => ({
                    ...prev,
                    bathrooms: value ? parseFloat(value) : undefined
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="1.5">1.5+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="2.5">2.5+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minArea">Min Area (sq ft)</Label>
                <Input
                  id="minArea"
                  type="number"
                  min="0"
                  value={searchData.minArea || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchData(prev => ({
                    ...prev,
                    minArea: parseInt(e.target.value) || undefined
                  }))}
                  placeholder="e.g., 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxArea">Max Area (sq ft)</Label>
                <Input
                  id="maxArea"
                  type="number"
                  min="0"
                  value={searchData.maxArea || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchData(prev => ({
                    ...prev,
                    maxArea: parseInt(e.target.value) || undefined
                  }))}
                  placeholder="e.g., 1500"
                />
              </div>
            </div>
          </div>

          {/* Property Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PROPERTY_TYPES.map(({ value, label, icon: Icon }) => (
                <div
                  key={value}
                  onClick={() => handlePropertyTypeToggle(value)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    searchData.propertyTypes.includes(value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="text-sm">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AMENITIES.map(({ value, label, icon: Icon }) => (
                <div
                  key={value}
                  onClick={() => handleAmenityToggle(value)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    searchData.amenities.includes(value)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="text-sm">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={searchData.location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchData(prev => ({ ...prev, location: e.target.value }));
                    handleLocationSearch(e.target.value);
                  }}
                  placeholder="Enter city, neighborhood, or address"
                />
                {locationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setSearchData(prev => ({ ...prev, location: suggestion }));
                          setLocationSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationRadius">Search Radius (miles)</Label>
                <Select
                  value={searchData.locationRadius?.toString() || '10'}
                  onValueChange={(value: string) => setSearchData(prev => ({
                    ...prev,
                    locationRadius: parseFloat(value)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="petFriendly"
                  checked={searchData.petFriendly || false}
                  onCheckedChange={(checked) => setSearchData(prev => ({
                    ...prev,
                    petFriendly: checked as boolean
                  }))}
                />
                <Label htmlFor="petFriendly" className="flex items-center gap-2">
                  <PawPrint className="w-4 h-4" />
                  Pet Friendly
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="furnished"
                  checked={searchData.furnished || false}
                  onCheckedChange={(checked) => setSearchData(prev => ({
                    ...prev,
                    furnished: checked as boolean
                  }))}
                />
                <Label htmlFor="furnished" className="flex items-center gap-2">
                  <Sofa className="w-4 h-4" />
                  Furnished
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="parkingAvailable"
                  checked={searchData.parkingAvailable || false}
                  onCheckedChange={(checked) => setSearchData(prev => ({
                    ...prev,
                    parkingAvailable: checked as boolean
                  }))}
                />
                <Label htmlFor="parkingAvailable" className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Parking Available
                </Label>
              </div>
            </div>
          </div>

          {/* Email Alerts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {searchData.emailAlertsEnabled ? (
                <Bell className="w-5 h-5 text-blue-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              Email Alerts
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailAlerts"
                  checked={searchData.emailAlertsEnabled}
                  onCheckedChange={(checked) => setSearchData(prev => ({
                    ...prev,
                    emailAlertsEnabled: checked as boolean
                  }))}
                />
                <Label htmlFor="emailAlerts">
                  Enable email alerts for new matching apartments
                </Label>
              </div>

              {searchData.emailAlertsEnabled && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="alertFrequency">Alert Frequency</Label>
                  <Select
                    value={searchData.alertFrequency}
                    onValueChange={(value: 'immediate' | 'daily' | 'weekly' | 'monthly') =>
                      setSearchData(prev => ({ ...prev, alertFrequency: value }))
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Search' : 'Save Search'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}