import { z } from 'zod';

// Apartment validation schema
export const apartmentSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  price_huf: z.number().positive().int().min(30000).max(1000000),
  size_sqm: z.number().positive().int().min(10).max(500),
  bedrooms: z.number().int().min(0).max(10),
  bathrooms: z.number().int().min(0).max(10),
  district: z.number().int().min(1).max(23),
  address: z.string().min(5).max(200),
  latitude: z.number().min(47.3).max(47.6).optional(),
  longitude: z.number().min(18.9).max(19.3).optional(),
  is_available: z.boolean().default(true),
  deposit_months: z.number().int().min(1).max(3).optional(),
  image_urls: z.array(z.string().url()).min(1).max(20).optional(),
});

export type ApartmentInput = z.infer<typeof apartmentSchema>;

// Booking validation schema
export const bookingSchema = z.object({
  apartmentId: z.string().uuid(),
  userId: z.string().min(1),
  moveInDate: z.string().datetime(),
  leaseMonths: z.number().int().min(1).max(36),
});

export type BookingInput = z.infer<typeof bookingSchema>;

// Message validation schema
export const messageSchema = z.object({
  apartment_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  conversation_key: z.string().min(1),
  sender_id: z.string().uuid(),
  receiver_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export type MessageInput = z.infer<typeof messageSchema>;

// Search query validation
export const searchQuerySchema = z.object({
  search: z.string().max(200).optional(),
  bedrooms: z.string().regex(/^\d+$/).optional(),
  bathrooms: z.string().regex(/^\d+$/).optional(),
  district: z.string().regex(/^([1-9]|1[0-9]|2[0-3])$/).optional(),
  max_price: z.string().regex(/^\d+$/).optional(),
  min_price: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

// User profile validation
export const userProfileSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/).min(8).max(20),
  bio: z.string().max(500).optional(),
  occupation: z.enum(['student', 'professional', 'freelancer', 'researcher', 'other']).optional(),
  university: z.string().max(100).optional(),
  age: z.number().int().min(18).max(100).optional(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return { 
        success: false, 
        error: `${firstError.path.join('.')}: ${firstError.message}` 
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}
