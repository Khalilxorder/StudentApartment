// 200 Apartment Feature Icons Database
// Categorizes every attribute users consider when searching for apartments

export interface FeatureIcon {
  id: string;
  name: string;
  category: FeatureCategory;
  icon: string; // emoji or icon identifier
  description: string;
  keywords: string[]; // for matching with user queries
  priority: 'high' | 'medium' | 'low'; // importance level
}

export type FeatureCategory = 
  | 'location'
  | 'amenities'
  | 'style'
  | 'safety'
  | 'connectivity'
  | 'space'
  | 'utilities'
  | 'social'
  | 'maintenance'
  | 'legal'
  | 'accessibility'
  | 'environment';

// Comprehensive apartment features database
export const APARTMENT_FEATURES: FeatureIcon[] = [
  // ===== LOCATION FEATURES (20) =====
  { id: 'loc_city_center', name: 'City Center', category: 'location', icon: '🏙️', description: 'Downtown/central location', keywords: ['downtown', 'city center', 'central', 'inner city'], priority: 'high' },
  { id: 'loc_university', name: 'Near University', category: 'location', icon: '🎓', description: 'Close to university campus', keywords: ['university', 'campus', 'elte', 'bme', 'student area'], priority: 'high' },
  { id: 'loc_metro', name: 'Metro Access', category: 'location', icon: '🚇', description: 'Near metro station', keywords: ['metro', 'subway', 'underground'], priority: 'high' },
  { id: 'loc_tram', name: 'Tram Line', category: 'location', icon: '🚊', description: 'Tram stop nearby', keywords: ['tram', 'streetcar', '4/6'], priority: 'medium' },
  { id: 'loc_bus', name: 'Bus Stop', category: 'location', icon: '🚌', description: 'Bus stop nearby', keywords: ['bus', 'public transport'], priority: 'medium' },
  { id: 'loc_quiet_street', name: 'Quiet Street', category: 'location', icon: '🤫', description: 'Low traffic area', keywords: ['quiet', 'peaceful', 'calm', 'low traffic'], priority: 'high' },
  { id: 'loc_main_road', name: 'Main Road', category: 'location', icon: '🛣️', description: 'On main road', keywords: ['main road', 'busy street', 'accessible'], priority: 'low' },
  { id: 'loc_residential', name: 'Residential Area', category: 'location', icon: '🏘️', description: 'Quiet residential neighborhood', keywords: ['residential', 'neighborhood', 'family area'], priority: 'medium' },
  { id: 'loc_shopping', name: 'Shopping Nearby', category: 'location', icon: '🛍️', description: 'Shops within walking distance', keywords: ['shopping', 'stores', 'mall', 'retail'], priority: 'medium' },
  { id: 'loc_grocery', name: 'Grocery Store', category: 'location', icon: '🛒', description: 'Grocery store nearby', keywords: ['grocery', 'supermarket', 'tesco', 'aldi', 'spar'], priority: 'high' },
  { id: 'loc_pharmacy', name: 'Pharmacy', category: 'location', icon: '💊', description: 'Pharmacy nearby', keywords: ['pharmacy', 'drugstore', 'apotheke'], priority: 'medium' },
  { id: 'loc_hospital', name: 'Hospital', category: 'location', icon: '🏥', description: 'Hospital/clinic nearby', keywords: ['hospital', 'clinic', 'medical', 'healthcare'], priority: 'medium' },
  { id: 'loc_park', name: 'Park', category: 'location', icon: '🌳', description: 'Park or green space nearby', keywords: ['park', 'green space', 'nature', 'garden'], priority: 'medium' },
  { id: 'loc_river', name: 'River View', category: 'location', icon: '🌊', description: 'Near Danube river', keywords: ['river', 'danube', 'water', 'riverside'], priority: 'low' },
  { id: 'loc_gym', name: 'Gym Nearby', category: 'location', icon: '🏋️', description: 'Gym/fitness center', keywords: ['gym', 'fitness', 'workout', 'sports'], priority: 'low' },
  { id: 'loc_restaurant', name: 'Restaurants', category: 'location', icon: '🍽️', description: 'Restaurants nearby', keywords: ['restaurant', 'dining', 'food', 'cafe'], priority: 'medium' },
  { id: 'loc_nightlife', name: 'Nightlife', category: 'location', icon: '🎉', description: 'Bars/clubs nearby', keywords: ['nightlife', 'bars', 'clubs', 'party', 'ruin bar'], priority: 'low' },
  { id: 'loc_library', name: 'Library', category: 'location', icon: '📚', description: 'Library nearby', keywords: ['library', 'study', 'books'], priority: 'low' },
  { id: 'loc_parking_street', name: 'Street Parking', category: 'location', icon: '🅿️', description: 'Street parking available', keywords: ['parking', 'street parking', 'free parking'], priority: 'medium' },
  { id: 'loc_bike_friendly', name: 'Bike Friendly', category: 'location', icon: '🚲', description: 'Bike lanes nearby', keywords: ['bike', 'bicycle', 'cycling', 'bike lane'], priority: 'low' },

  // ===== AMENITIES (30) =====
  { id: 'amen_furnished', name: 'Furnished', category: 'amenities', icon: '🛋️', description: 'Fully furnished apartment', keywords: ['furnished', 'furniture', 'equipped'], priority: 'high' },
  { id: 'amen_unfurnished', name: 'Unfurnished', category: 'amenities', icon: '📦', description: 'Empty apartment', keywords: ['unfurnished', 'empty', 'bare'], priority: 'medium' },
  { id: 'amen_kitchen', name: 'Full Kitchen', category: 'amenities', icon: '🍳', description: 'Complete kitchen', keywords: ['kitchen', 'cooking', 'stove', 'oven'], priority: 'high' },
  { id: 'amen_kitchenette', name: 'Kitchenette', category: 'amenities', icon: '🥘', description: 'Small kitchen', keywords: ['kitchenette', 'small kitchen', 'mini kitchen'], priority: 'medium' },
  { id: 'amen_dishwasher', name: 'Dishwasher', category: 'amenities', icon: '🍽️', description: 'Dishwasher included', keywords: ['dishwasher', 'automatic dishes'], priority: 'low' },
  { id: 'amen_washing_machine', name: 'Washing Machine', category: 'amenities', icon: '🧺', description: 'Washing machine', keywords: ['washing machine', 'washer', 'laundry'], priority: 'high' },
  { id: 'amen_dryer', name: 'Dryer', category: 'amenities', icon: '🌪️', description: 'Clothes dryer', keywords: ['dryer', 'tumble dryer'], priority: 'low' },
  { id: 'amen_ac', name: 'Air Conditioning', category: 'amenities', icon: '❄️', description: 'Air conditioning', keywords: ['ac', 'air conditioning', 'cooling', 'cool'], priority: 'medium' },
  { id: 'amen_heating', name: 'Central Heating', category: 'amenities', icon: '🔥', description: 'Central heating system', keywords: ['heating', 'warm', 'radiator', 'central heating'], priority: 'high' },
  { id: 'amen_balcony', name: 'Balcony', category: 'amenities', icon: '🏡', description: 'Private balcony', keywords: ['balcony', 'terrace', 'outdoor space'], priority: 'medium' },
  { id: 'amen_terrace', name: 'Terrace', category: 'amenities', icon: '☀️', description: 'Large terrace', keywords: ['terrace', 'patio', 'large balcony'], priority: 'medium' },
  { id: 'amen_garden', name: 'Garden', category: 'amenities', icon: '🌻', description: 'Private garden', keywords: ['garden', 'yard', 'backyard'], priority: 'low' },
  { id: 'amen_elevator', name: 'Elevator', category: 'amenities', icon: '🛗', description: 'Building has elevator', keywords: ['elevator', 'lift'], priority: 'high' },
  { id: 'amen_storage', name: 'Storage Room', category: 'amenities', icon: '📦', description: 'Extra storage space', keywords: ['storage', 'closet', 'wardrobe', 'pantry'], priority: 'medium' },
  { id: 'amen_parking_garage', name: 'Garage Parking', category: 'amenities', icon: '🚗', description: 'Private garage', keywords: ['garage', 'parking', 'covered parking'], priority: 'medium' },
  { id: 'amen_bike_storage', name: 'Bike Storage', category: 'amenities', icon: '🚴', description: 'Secure bike storage', keywords: ['bike storage', 'bicycle room'], priority: 'low' },
  { id: 'amen_cellar', name: 'Cellar', category: 'amenities', icon: '🏚️', description: 'Cellar/basement storage', keywords: ['cellar', 'basement', 'storage room'], priority: 'low' },
  { id: 'amen_bathtub', name: 'Bathtub', category: 'amenities', icon: '🛁', description: 'Bathtub available', keywords: ['bathtub', 'bath', 'tub'], priority: 'low' },
  { id: 'amen_shower', name: 'Shower', category: 'amenities', icon: '🚿', description: 'Shower', keywords: ['shower', 'walk-in shower'], priority: 'high' },
  { id: 'amen_separate_wc', name: 'Separate Toilet', category: 'amenities', icon: '🚽', description: 'Separate WC from bathroom', keywords: ['separate toilet', 'wc', 'guest toilet'], priority: 'medium' },
  { id: 'amen_pet_friendly', name: 'Pet Friendly', category: 'amenities', icon: '🐕', description: 'Pets allowed', keywords: ['pet', 'dog', 'cat', 'animal friendly'], priority: 'medium' },
  { id: 'amen_smoking', name: 'Smoking Allowed', category: 'amenities', icon: '🚬', description: 'Smoking permitted', keywords: ['smoking', 'cigarette'], priority: 'low' },
  { id: 'amen_fireplace', name: 'Fireplace', category: 'amenities', icon: '🪵', description: 'Working fireplace', keywords: ['fireplace', 'chimney'], priority: 'low' },
  { id: 'amen_pool', name: 'Swimming Pool', category: 'amenities', icon: '🏊', description: 'Building pool', keywords: ['pool', 'swimming', 'swimming pool'], priority: 'low' },
  { id: 'amen_gym_building', name: 'Building Gym', category: 'amenities', icon: '💪', description: 'Gym in building', keywords: ['gym', 'fitness room', 'workout room'], priority: 'low' },
  { id: 'amen_sauna', name: 'Sauna', category: 'amenities', icon: '🧖', description: 'Sauna available', keywords: ['sauna', 'spa'], priority: 'low' },
  { id: 'amen_roof_terrace', name: 'Roof Terrace', category: 'amenities', icon: '🌆', description: 'Shared roof terrace', keywords: ['roof', 'rooftop', 'terrace'], priority: 'low' },
  { id: 'amen_mailbox', name: 'Mailbox', category: 'amenities', icon: '📬', description: 'Private mailbox', keywords: ['mailbox', 'post', 'mail'], priority: 'medium' },
  { id: 'amen_doorman', name: 'Doorman', category: 'amenities', icon: '🤵', description: 'Building doorman', keywords: ['doorman', 'concierge', 'porter'], priority: 'low' },
  { id: 'amen_wheelchair', name: 'Wheelchair Access', category: 'amenities', icon: '♿', description: 'Wheelchair accessible', keywords: ['wheelchair', 'accessible', 'disability'], priority: 'medium' },

  // ===== STYLE & DESIGN (25) =====
  { id: 'style_modern', name: 'Modern', category: 'style', icon: '✨', description: 'Modern contemporary design', keywords: ['modern', 'contemporary', 'minimalist'], priority: 'medium' },
  { id: 'style_classic', name: 'Classic', category: 'style', icon: '🏛️', description: 'Classic traditional style', keywords: ['classic', 'traditional', 'vintage'], priority: 'medium' },
  { id: 'style_renovated', name: 'Renovated', category: 'style', icon: '🔨', description: 'Recently renovated', keywords: ['renovated', 'refurbished', 'updated', 'new'], priority: 'high' },
  { id: 'style_historic', name: 'Historic Building', category: 'style', icon: '🏰', description: 'Historic architecture', keywords: ['historic', 'heritage', 'old building'], priority: 'low' },
  { id: 'style_new_build', name: 'New Construction', category: 'style', icon: '🏗️', description: 'Brand new building', keywords: ['new', 'new construction', 'modern building'], priority: 'medium' },
  { id: 'style_loft', name: 'Loft Style', category: 'style', icon: '🏭', description: 'Industrial loft design', keywords: ['loft', 'industrial', 'open space'], priority: 'low' },
  { id: 'style_scandinavian', name: 'Scandinavian', category: 'style', icon: '🪑', description: 'Scandinavian minimalism', keywords: ['scandinavian', 'nordic', 'ikea'], priority: 'low' },
  { id: 'style_rustic', name: 'Rustic', category: 'style', icon: '🪵', description: 'Rustic cozy style', keywords: ['rustic', 'cozy', 'countryside'], priority: 'low' },
  { id: 'style_bright', name: 'Bright Interior', category: 'style', icon: '💡', description: 'Well-lit bright space', keywords: ['bright', 'light', 'sunny', 'illuminated'], priority: 'high' },
  { id: 'style_dark', name: 'Dark Aesthetic', category: 'style', icon: '🌑', description: 'Dark moody interior', keywords: ['dark', 'moody', 'dramatic'], priority: 'low' },
  { id: 'style_colorful', name: 'Colorful', category: 'style', icon: '🎨', description: 'Vibrant colors', keywords: ['colorful', 'vibrant', 'bold colors'], priority: 'low' },
  { id: 'style_neutral', name: 'Neutral Tones', category: 'style', icon: '🤍', description: 'Neutral color palette', keywords: ['neutral', 'beige', 'white', 'gray'], priority: 'medium' },
  { id: 'style_wooden_floor', name: 'Wood Floors', category: 'style', icon: '🪵', description: 'Hardwood flooring', keywords: ['wood', 'wooden floor', 'parquet', 'hardwood'], priority: 'medium' },
  { id: 'style_tile_floor', name: 'Tile Floors', category: 'style', icon: '🔲', description: 'Tile flooring', keywords: ['tile', 'ceramic', 'stone floor'], priority: 'low' },
  { id: 'style_carpet', name: 'Carpeted', category: 'style', icon: '🧶', description: 'Carpeted floors', keywords: ['carpet', 'rug', 'soft floor'], priority: 'low' },
  { id: 'style_high_ceiling', name: 'High Ceilings', category: 'style', icon: '⬆️', description: 'Tall ceilings', keywords: ['high ceiling', 'tall', 'spacious'], priority: 'medium' },
  { id: 'style_large_windows', name: 'Large Windows', category: 'style', icon: '🪟', description: 'Floor-to-ceiling windows', keywords: ['large windows', 'big windows', 'natural light'], priority: 'medium' },
  { id: 'style_bay_window', name: 'Bay Window', category: 'style', icon: '🏠', description: 'Bay window feature', keywords: ['bay window', 'window seat'], priority: 'low' },
  { id: 'style_open_plan', name: 'Open Plan', category: 'style', icon: '🔓', description: 'Open floor plan', keywords: ['open plan', 'open space', 'no walls'], priority: 'medium' },
  { id: 'style_separate_rooms', name: 'Separate Rooms', category: 'style', icon: '🚪', description: 'Clearly divided rooms', keywords: ['separate rooms', 'divided', 'private rooms'], priority: 'high' },
  { id: 'style_built_in', name: 'Built-in Storage', category: 'style', icon: '🗄️', description: 'Built-in wardrobes', keywords: ['built-in', 'fitted', 'custom storage'], priority: 'medium' },
  { id: 'style_exposed_brick', name: 'Exposed Brick', category: 'style', icon: '🧱', description: 'Exposed brick walls', keywords: ['exposed brick', 'brick wall', 'industrial'], priority: 'low' },
  { id: 'style_molding', name: 'Decorative Molding', category: 'style', icon: '🎭', description: 'Classic molding details', keywords: ['molding', 'ornate', 'decorative'], priority: 'low' },
  { id: 'style_minimalist', name: 'Minimalist', category: 'style', icon: '⬜', description: 'Minimal clean design', keywords: ['minimalist', 'minimal', 'simple', 'clean'], priority: 'medium' },
  { id: 'style_luxury', name: 'Luxury Finishes', category: 'style', icon: '💎', description: 'High-end materials', keywords: ['luxury', 'premium', 'high-end', 'deluxe'], priority: 'low' },

  // ===== CONNECTIVITY (15) =====
  { id: 'conn_wifi', name: 'WiFi Included', category: 'connectivity', icon: '📶', description: 'Internet included', keywords: ['wifi', 'internet', 'wireless'], priority: 'high' },
  { id: 'conn_fiber', name: 'Fiber Internet', category: 'connectivity', icon: '⚡', description: 'High-speed fiber', keywords: ['fiber', 'fast internet', 'gigabit'], priority: 'medium' },
  { id: 'conn_cable_tv', name: 'Cable TV', category: 'connectivity', icon: '📺', description: 'Cable TV included', keywords: ['cable', 'tv', 'television'], priority: 'low' },
  { id: 'conn_satellite', name: 'Satellite', category: 'connectivity', icon: '📡', description: 'Satellite connection', keywords: ['satellite', 'dish'], priority: 'low' },
  { id: 'conn_phone', name: 'Landline', category: 'connectivity', icon: '☎️', description: 'Landline phone', keywords: ['phone', 'landline', 'telephone'], priority: 'low' },
  { id: 'conn_intercom', name: 'Intercom', category: 'connectivity', icon: '🔔', description: 'Building intercom', keywords: ['intercom', 'buzzer', 'doorbell'], priority: 'medium' },
  { id: 'conn_smart_home', name: 'Smart Home', category: 'connectivity', icon: '🏠', description: 'Smart home features', keywords: ['smart', 'automation', 'alexa', 'google home'], priority: 'low' },
  { id: 'conn_security_cam', name: 'Security Camera', category: 'connectivity', icon: '📹', description: 'Security cameras', keywords: ['camera', 'cctv', 'surveillance'], priority: 'medium' },
  { id: 'conn_alarm', name: 'Alarm System', category: 'connectivity', icon: '🚨', description: 'Security alarm', keywords: ['alarm', 'security system'], priority: 'low' },
  { id: 'conn_video_doorbell', name: 'Video Doorbell', category: 'connectivity', icon: '🎥', description: 'Smart doorbell', keywords: ['video doorbell', 'ring', 'smart bell'], priority: 'low' },
  { id: 'conn_keyless', name: 'Keyless Entry', category: 'connectivity', icon: '🔑', description: 'Digital lock system', keywords: ['keyless', 'smart lock', 'digital lock'], priority: 'low' },
  { id: 'conn_charging', name: 'EV Charging', category: 'connectivity', icon: '🔌', description: 'Electric vehicle charging', keywords: ['ev', 'charging', 'electric car'], priority: 'low' },
  { id: 'conn_coworking', name: 'Coworking Space', category: 'connectivity', icon: '💼', description: 'Shared workspace', keywords: ['coworking', 'workspace', 'office'], priority: 'low' },
  { id: 'conn_mail_room', name: 'Package Room', category: 'connectivity', icon: '📦', description: 'Secure package delivery', keywords: ['package', 'delivery', 'mail room'], priority: 'low' },
  { id: 'conn_guest_wifi', name: 'Guest WiFi', category: 'connectivity', icon: '👥', description: 'Separate guest network', keywords: ['guest wifi', 'visitor network'], priority: 'low' },

  // ===== SAFETY & SECURITY (15) =====
  { id: 'safe_gated', name: 'Gated Entry', category: 'safety', icon: '🚧', description: 'Gated community', keywords: ['gated', 'secure entry', 'controlled access'], priority: 'medium' },
  { id: 'safe_security_guard', name: 'Security Guard', category: 'safety', icon: '💂', description: '24/7 security', keywords: ['security', 'guard', '24/7', 'watchman'], priority: 'low' },
  { id: 'safe_locked_entrance', name: 'Locked Entrance', category: 'safety', icon: '🔐', description: 'Secure building entrance', keywords: ['locked', 'secure door', 'code entry'], priority: 'high' },
  { id: 'safe_window_bars', name: 'Window Security', category: 'safety', icon: '🪟', description: 'Window bars/locks', keywords: ['window bars', 'secure windows'], priority: 'low' },
  { id: 'safe_reinforced_door', name: 'Security Door', category: 'safety', icon: '🚪', description: 'Reinforced door', keywords: ['security door', 'reinforced', 'steel door'], priority: 'medium' },
  { id: 'safe_fire_alarm', name: 'Fire Alarm', category: 'safety', icon: '🔥', description: 'Fire detection system', keywords: ['fire alarm', 'smoke detector'], priority: 'high' },
  { id: 'safe_fire_extinguisher', name: 'Fire Extinguisher', category: 'safety', icon: '🧯', description: 'Fire extinguisher', keywords: ['fire extinguisher', 'safety equipment'], priority: 'medium' },
  { id: 'safe_emergency_exit', name: 'Emergency Exit', category: 'safety', icon: '🚪', description: 'Clearly marked exits', keywords: ['emergency exit', 'fire escape'], priority: 'medium' },
  { id: 'safe_well_lit', name: 'Well Lit', category: 'safety', icon: '💡', description: 'Well-lit common areas', keywords: ['well lit', 'bright', 'lighting', 'illuminated'], priority: 'high' },
  { id: 'safe_neighborhood', name: 'Safe Neighborhood', category: 'safety', icon: '🛡️', description: 'Low crime area', keywords: ['safe', 'secure', 'low crime', 'family friendly'], priority: 'high' },
  { id: 'safe_police_nearby', name: 'Police Nearby', category: 'safety', icon: '👮', description: 'Police station close', keywords: ['police', 'police station'], priority: 'low' },
  { id: 'safe_women_friendly', name: 'Women Friendly', category: 'safety', icon: '👩', description: 'Safe for women', keywords: ['women', 'female', 'safe for women'], priority: 'high' },
  { id: 'safe_cctv_building', name: 'Building CCTV', category: 'safety', icon: '📹', description: 'Surveillance cameras', keywords: ['cctv', 'cameras', 'surveillance'], priority: 'medium' },
  { id: 'safe_emergency_contact', name: 'Emergency Contact', category: 'safety', icon: '📞', description: '24/7 emergency line', keywords: ['emergency', 'contact', 'help'], priority: 'medium' },
  { id: 'safe_first_aid', name: 'First Aid Kit', category: 'safety', icon: '🩹', description: 'First aid available', keywords: ['first aid', 'medical', 'emergency kit'], priority: 'low' },

  // ===== SPACE & LAYOUT (20) =====
  { id: 'space_studio', name: 'Studio', category: 'space', icon: '🛏️', description: 'Studio apartment', keywords: ['studio', 'one room', 'efficiency'], priority: 'high' },
  { id: 'space_1bed', name: '1 Bedroom', category: 'space', icon: '🛌', description: 'One bedroom', keywords: ['1 bedroom', 'one bedroom', '1br'], priority: 'high' },
  { id: 'space_2bed', name: '2 Bedrooms', category: 'space', icon: '🛏️🛏️', description: 'Two bedrooms', keywords: ['2 bedroom', 'two bedroom', '2br'], priority: 'high' },
  { id: 'space_3bed', name: '3+ Bedrooms', category: 'space', icon: '🏠', description: 'Three or more bedrooms', keywords: ['3 bedroom', 'three bedroom', '3br', 'large'], priority: 'medium' },
  { id: 'space_1bath', name: '1 Bathroom', category: 'space', icon: '🚿', description: 'One bathroom', keywords: ['1 bathroom', 'one bathroom'], priority: 'high' },
  { id: 'space_2bath', name: '2+ Bathrooms', category: 'space', icon: '🛁🛁', description: 'Multiple bathrooms', keywords: ['2 bathroom', 'two bathroom', 'multiple'], priority: 'medium' },
  { id: 'space_large', name: 'Large Space', category: 'space', icon: '📏', description: '80+ sqm', keywords: ['large', 'spacious', 'big', 'roomy'], priority: 'medium' },
  { id: 'space_medium', name: 'Medium Size', category: 'space', icon: '📐', description: '50-80 sqm', keywords: ['medium', 'average', 'moderate'], priority: 'high' },
  { id: 'space_compact', name: 'Compact', category: 'space', icon: '📦', description: 'Under 50 sqm', keywords: ['compact', 'small', 'cozy', 'efficient'], priority: 'medium' },
  { id: 'space_walk_in_closet', name: 'Walk-in Closet', category: 'space', icon: '👔', description: 'Large walk-in closet', keywords: ['walk-in', 'closet', 'wardrobe'], priority: 'low' },
  { id: 'space_office', name: 'Home Office', category: 'space', icon: '💼', description: 'Dedicated office space', keywords: ['office', 'workspace', 'study', 'desk'], priority: 'medium' },
  { id: 'space_dining', name: 'Dining Area', category: 'space', icon: '🍽️', description: 'Separate dining area', keywords: ['dining', 'dining room', 'eating area'], priority: 'medium' },
  { id: 'space_living', name: 'Living Room', category: 'space', icon: '🛋️', description: 'Separate living room', keywords: ['living room', 'lounge', 'sitting area'], priority: 'high' },
  { id: 'space_guest_room', name: 'Guest Room', category: 'space', icon: '🛏️', description: 'Extra bedroom', keywords: ['guest room', 'spare bedroom', 'extra room'], priority: 'low' },
  { id: 'space_utility', name: 'Utility Room', category: 'space', icon: '🧰', description: 'Laundry/utility room', keywords: ['utility', 'laundry room', 'service room'], priority: 'low' },
  { id: 'space_pantry', name: 'Pantry', category: 'space', icon: '🥫', description: 'Kitchen pantry', keywords: ['pantry', 'storage', 'food storage'], priority: 'low' },
  { id: 'space_hallway', name: 'Hallway', category: 'space', icon: '🚪', description: 'Entrance hall', keywords: ['hallway', 'corridor', 'entrance'], priority: 'medium' },
  { id: 'space_attic', name: 'Attic', category: 'space', icon: '🏚️', description: 'Attic space', keywords: ['attic', 'loft', 'upper floor'], priority: 'low' },
  { id: 'space_mezzanine', name: 'Mezzanine', category: 'space', icon: '🪜', description: 'Mezzanine level', keywords: ['mezzanine', 'split level'], priority: 'low' },
  { id: 'space_private_entrance', name: 'Private Entrance', category: 'space', icon: '🚪', description: 'Separate entrance', keywords: ['private entrance', 'own door'], priority: 'medium' },

  // ===== UTILITIES & COSTS (15) =====
  { id: 'util_included', name: 'Utilities Included', category: 'utilities', icon: '💰', description: 'All bills included in rent', keywords: ['utilities included', 'bills included', 'all inclusive'], priority: 'high' },
  { id: 'util_separate', name: 'Separate Utilities', category: 'utilities', icon: '💸', description: 'Pay utilities separately', keywords: ['utilities separate', 'bills separate'], priority: 'medium' },
  { id: 'util_water_incl', name: 'Water Included', category: 'utilities', icon: '💧', description: 'Water bills included', keywords: ['water included'], priority: 'medium' },
  { id: 'util_elec_incl', name: 'Electric Included', category: 'utilities', icon: '⚡', description: 'Electricity included', keywords: ['electric included', 'power included'], priority: 'medium' },
  { id: 'util_gas_incl', name: 'Gas Included', category: 'utilities', icon: '🔥', description: 'Gas bills included', keywords: ['gas included', 'heating included'], priority: 'medium' },
  { id: 'util_low_bills', name: 'Low Utility Costs', category: 'utilities', icon: '💵', description: 'Energy efficient/low bills', keywords: ['low bills', 'cheap utilities', 'energy efficient'], priority: 'high' },
  { id: 'util_individual_meters', name: 'Individual Meters', category: 'utilities', icon: '📊', description: 'Separate utility meters', keywords: ['individual meters', 'own meters'], priority: 'medium' },
  { id: 'util_solar', name: 'Solar Panels', category: 'utilities', icon: '☀️', description: 'Solar energy', keywords: ['solar', 'solar panels', 'renewable'], priority: 'low' },
  { id: 'util_efficient', name: 'Energy Efficient', category: 'utilities', icon: '♻️', description: 'Energy-efficient appliances', keywords: ['efficient', 'eco', 'green', 'sustainable'], priority: 'medium' },
  { id: 'util_insulated', name: 'Well Insulated', category: 'utilities', icon: '🧊', description: 'Good insulation', keywords: ['insulated', 'warm', 'energy saving'], priority: 'medium' },
  { id: 'util_double_glazed', name: 'Double Glazed', category: 'utilities', icon: '🪟', description: 'Double-glazed windows', keywords: ['double glazed', 'insulated windows'], priority: 'medium' },
  { id: 'util_deposit_low', name: 'Low Deposit', category: 'utilities', icon: '💰', description: '1 month deposit', keywords: ['low deposit', 'small deposit', '1 month'], priority: 'high' },
  { id: 'util_deposit_high', name: 'Standard Deposit', category: 'utilities', icon: '💵', description: '2+ months deposit', keywords: ['deposit', '2 months'], priority: 'low' },
  { id: 'util_no_commission', name: 'No Commission', category: 'utilities', icon: '🚫', description: 'No agency fee', keywords: ['no commission', 'no fee', 'direct'], priority: 'high' },
  { id: 'util_flexible_lease', name: 'Flexible Lease', category: 'utilities', icon: '📝', description: 'Short-term option', keywords: ['flexible', 'short term', 'monthly'], priority: 'medium' },

  // ===== SOCIAL & COMMUNITY (15) =====
  { id: 'social_shared_kitchen', name: 'Shared Kitchen', category: 'social', icon: '🍳', description: 'Common kitchen area', keywords: ['shared kitchen', 'common kitchen'], priority: 'medium' },
  { id: 'social_shared_living', name: 'Shared Living Room', category: 'social', icon: '🛋️', description: 'Common living space', keywords: ['shared living', 'common room'], priority: 'low' },
  { id: 'social_private_room', name: 'Private Room', category: 'social', icon: '🚪', description: 'Own private bedroom', keywords: ['private room', 'own room', 'bedroom'], priority: 'high' },
  { id: 'social_roommates', name: 'Roommates', category: 'social', icon: '👥', description: 'Shared apartment', keywords: ['roommates', 'flatmates', 'shared', 'share'], priority: 'high' },
  { id: 'social_students_only', name: 'Students Only', category: 'social', icon: '🎓', description: 'Student accommodation', keywords: ['students', 'student only'], priority: 'medium' },
  { id: 'social_professionals', name: 'Professionals', category: 'social', icon: '💼', description: 'Working professionals', keywords: ['professionals', 'working', 'young professionals'], priority: 'medium' },
  { id: 'social_mixed', name: 'Mixed Community', category: 'social', icon: '🌍', description: 'Diverse residents', keywords: ['mixed', 'diverse', 'everyone'], priority: 'low' },
  { id: 'social_international', name: 'International', category: 'social', icon: '🌎', description: 'International community', keywords: ['international', 'expat', 'foreign'], priority: 'medium' },
  { id: 'social_quiet', name: 'Quiet Building', category: 'social', icon: '🤫', description: 'Quiet residents', keywords: ['quiet', 'calm', 'peaceful residents'], priority: 'high' },
  { id: 'social_party', name: 'Social Atmosphere', category: 'social', icon: '🎉', description: 'Lively community', keywords: ['social', 'party', 'fun', 'lively'], priority: 'low' },
  { id: 'social_couples', name: 'Couples Welcome', category: 'social', icon: '💑', description: 'Couples allowed', keywords: ['couples', 'partner', 'two people'], priority: 'medium' },
  { id: 'social_families', name: 'Family Friendly', category: 'social', icon: '👨‍👩‍👧', description: 'Suitable for families', keywords: ['family', 'children', 'kids'], priority: 'low' },
  { id: 'social_lgbtq', name: 'LGBTQ+ Friendly', category: 'social', icon: '🏳️‍🌈', description: 'LGBTQ+ welcoming', keywords: ['lgbtq', 'inclusive', 'pride'], priority: 'medium' },
  { id: 'social_female_only', name: 'Female Only', category: 'social', icon: '♀️', description: 'Women only', keywords: ['female', 'women', 'girls only'], priority: 'medium' },
  { id: 'social_elderly', name: 'Senior Friendly', category: 'social', icon: '👴', description: 'Suitable for seniors', keywords: ['senior', 'elderly', 'retirement'], priority: 'low' },

  // ===== MAINTENANCE & MANAGEMENT (10) =====
  { id: 'maint_managed', name: 'Professionally Managed', category: 'maintenance', icon: '🏢', description: 'Property management company', keywords: ['managed', 'professional', 'company'], priority: 'medium' },
  { id: 'maint_private_landlord', name: 'Private Landlord', category: 'maintenance', icon: '👤', description: 'Individual owner', keywords: ['private', 'owner', 'landlord'], priority: 'medium' },
  { id: 'maint_on_site', name: 'On-site Maintenance', category: 'maintenance', icon: '🔧', description: 'Maintenance staff on-site', keywords: ['maintenance', 'on-site', 'handyman'], priority: 'medium' },
  { id: 'maint_responsive', name: 'Quick Response', category: 'maintenance', icon: '⚡', description: 'Fast maintenance response', keywords: ['quick', 'fast', 'responsive'], priority: 'high' },
  { id: 'maint_well_maintained', name: 'Well Maintained', category: 'maintenance', icon: '✨', description: 'Regularly maintained building', keywords: ['well maintained', 'clean', 'tidy', 'cared for'], priority: 'high' },
  { id: 'maint_new_appliances', name: 'New Appliances', category: 'maintenance', icon: '🆕', description: 'Recently updated appliances', keywords: ['new', 'modern', 'updated appliances'], priority: 'medium' },
  { id: 'maint_clean', name: 'Clean & Tidy', category: 'maintenance', icon: '🧹', description: 'Regularly cleaned', keywords: ['clean', 'tidy', 'hygienic', 'spotless'], priority: 'high' },
  { id: 'maint_pest_free', name: 'Pest Free', category: 'maintenance', icon: '🐜', description: 'No pest issues', keywords: ['pest free', 'no bugs', 'clean'], priority: 'high' },
  { id: 'maint_garbage', name: 'Garbage Service', category: 'maintenance', icon: '🗑️', description: 'Regular trash collection', keywords: ['garbage', 'trash', 'waste'], priority: 'medium' },
  { id: 'maint_cleaning_service', name: 'Cleaning Service', category: 'maintenance', icon: '🧽', description: 'Optional cleaning service', keywords: ['cleaning', 'maid', 'housekeeping'], priority: 'low' },

  // ===== LEGAL & DOCUMENTATION (10) =====
  { id: 'legal_registered', name: 'Registered Address', category: 'legal', icon: '📄', description: 'Can register address', keywords: ['registered', 'registration', 'address card'], priority: 'high' },
  { id: 'legal_contract', name: 'Official Contract', category: 'legal', icon: '📝', description: 'Legal rental contract', keywords: ['contract', 'legal', 'official'], priority: 'high' },
  { id: 'legal_no_contract', name: 'No Contract', category: 'legal', icon: '⚠️', description: 'Informal arrangement', keywords: ['no contract', 'informal'], priority: 'low' },
  { id: 'legal_visa_support', name: 'Visa Support', category: 'legal', icon: '🛂', description: 'Provides visa documentation', keywords: ['visa', 'visa support', 'documentation'], priority: 'medium' },
  { id: 'legal_foreigner_friendly', name: 'Foreigner Friendly', category: 'legal', icon: '🌍', description: 'Accepts foreigners', keywords: ['foreigner', 'international', 'expat'], priority: 'high' },
  { id: 'legal_long_term', name: 'Long-term Lease', category: 'legal', icon: '📅', description: '1+ year lease', keywords: ['long term', 'stable', 'permanent'], priority: 'medium' },
  { id: 'legal_short_term', name: 'Short-term Available', category: 'legal', icon: '🗓️', description: 'Short-term rental option', keywords: ['short term', 'temporary', 'flexible'], priority: 'medium' },
  { id: 'legal_sublet', name: 'Sublet Allowed', category: 'legal', icon: '🔄', description: 'Can sublet', keywords: ['sublet', 'sublease'], priority: 'low' },
  { id: 'legal_no_sublet', name: 'No Subletting', category: 'legal', icon: '🚫', description: 'Subletting not allowed', keywords: ['no sublet'], priority: 'low' },
  { id: 'legal_references', name: 'References Required', category: 'legal', icon: '📋', description: 'Need references', keywords: ['references', 'proof', 'documents'], priority: 'medium' },

  // ===== ENVIRONMENT (15) =====
  { id: 'env_quiet_neighborhood', name: 'Quiet Neighborhood', category: 'environment', icon: '🌙', description: 'Peaceful area', keywords: ['quiet', 'peaceful', 'calm'], priority: 'high' },
  { id: 'env_noisy', name: 'Busy Area', category: 'environment', icon: '🔊', description: 'High activity area', keywords: ['noisy', 'busy', 'lively'], priority: 'low' },
  { id: 'env_green', name: 'Green Area', category: 'environment', icon: '🌳', description: 'Lots of trees/parks', keywords: ['green', 'trees', 'nature'], priority: 'medium' },
  { id: 'env_urban', name: 'Urban Setting', category: 'environment', icon: '🏙️', description: 'City center location', keywords: ['urban', 'city', 'downtown'], priority: 'medium' },
  { id: 'env_suburban', name: 'Suburban', category: 'environment', icon: '🏘️', description: 'Suburban area', keywords: ['suburban', 'outskirts', 'residential'], priority: 'low' },
  { id: 'env_courtyard', name: 'Courtyard', category: 'environment', icon: '🏛️', description: 'Building courtyard', keywords: ['courtyard', 'inner yard'], priority: 'low' },
  { id: 'env_street_view', name: 'Street Facing', category: 'environment', icon: '🚗', description: 'Faces the street', keywords: ['street view', 'front facing'], priority: 'low' },
  { id: 'env_rear_view', name: 'Rear Facing', category: 'environment', icon: '🏠', description: 'Faces the back', keywords: ['rear', 'back facing', 'quiet side'], priority: 'low' },
  { id: 'env_top_floor', name: 'Top Floor', category: 'environment', icon: '⬆️', description: 'Highest floor', keywords: ['top floor', 'penthouse', 'highest'], priority: 'medium' },
  { id: 'env_ground_floor', name: 'Ground Floor', category: 'environment', icon: '⬇️', description: 'Street level', keywords: ['ground floor', 'first floor'], priority: 'medium' },
  { id: 'env_middle_floor', name: 'Middle Floor', category: 'environment', icon: '↔️', description: 'Mid-level floor', keywords: ['middle floor', 'mid level'], priority: 'low' },
  { id: 'env_no_neighbors_above', name: 'No Neighbors Above', category: 'environment', icon: '☁️', description: 'No upstairs neighbors', keywords: ['no neighbors above', 'top floor'], priority: 'medium' },
  { id: 'env_no_neighbors_below', name: 'No Neighbors Below', category: 'environment', icon: '🏚️', description: 'No downstairs neighbors', keywords: ['no neighbors below', 'ground floor'], priority: 'low' },
  { id: 'env_air_quality', name: 'Good Air Quality', category: 'environment', icon: '🌬️', description: 'Clean air area', keywords: ['air quality', 'clean air', 'fresh'], priority: 'medium' },
  { id: 'env_polluted', name: 'High Traffic Area', category: 'environment', icon: '🚦', description: 'Busy intersection nearby', keywords: ['traffic', 'pollution', 'busy road'], priority: 'low' },
];

// Helper functions for feature matching
export function findFeaturesByKeyword(keyword: string): FeatureIcon[] {
  const lower = keyword.toLowerCase();
  return APARTMENT_FEATURES.filter(f => 
    f.keywords.some(k => k.includes(lower)) || 
    f.name.toLowerCase().includes(lower)
  );
}

export function getFeaturesByCategory(category: FeatureCategory): FeatureIcon[] {
  return APARTMENT_FEATURES.filter(f => f.category === category);
}

export function getHighPriorityFeatures(): FeatureIcon[] {
  return APARTMENT_FEATURES.filter(f => f.priority === 'high');
}

export function matchFeaturesFromStory(story: string): FeatureIcon[] {
  const lower = story.toLowerCase();
  const matched: FeatureIcon[] = [];
  
  APARTMENT_FEATURES.forEach(feature => {
    if (feature.keywords.some(keyword => lower.includes(keyword))) {
      matched.push(feature);
    }
  });
  
  return matched;
}

// Get apartment feature score based on user preferences
export function calculateFeatureMatchScore(
  apartmentFeatures: string[], // Array of feature IDs the apartment has
  userPreferredFeatures: string[] // Array of feature IDs user wants
): number {
  if (userPreferredFeatures.length === 0) return 50; // Neutral score
  
  const matches = apartmentFeatures.filter(f => userPreferredFeatures.includes(f));
  return Math.round((matches.length / userPreferredFeatures.length) * 100);
}
