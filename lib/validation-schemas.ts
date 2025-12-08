/**
 * Comprehensive Validation Schemas using Zod
 * Provides type-safe validation for API requests, forms, and data structures
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const EmailSchema = z.string().email('Invalid email address');

export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const PhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const URLSchema = z.string().url('Invalid URL format');

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const DateStringSchema = z.string().datetime('Invalid date format');

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(0).max(50000).optional(),
});


// ============================================================================
// USER SCHEMAS
// ============================================================================

export const UserTypeSchema = z.enum(['student', 'owner', 'admin']);

export const VerificationStatusSchema = z.enum(['unverified', 'pending', 'verified', 'rejected']);

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  userType: UserTypeSchema,
  phoneNumber: PhoneSchema.optional(),
  dateOfBirth: z.string().optional(),
  universityId: UUIDSchema.optional(),
});

export const UpdateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(1000).optional(),
  phoneNumber: PhoneSchema.optional(),
  avatarUrl: URLSchema.optional(),
  universityId: UUIDSchema.optional(),
  preferences: z.record(z.string(), z.any()).optional(),
});

export const UserLoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});


// ============================================================================
// APARTMENT SCHEMAS
// ============================================================================

export const ApartmentStatusSchema = z.enum(['active', 'inactive', 'pending', 'rented']);

export const ApartmentTypeSchema = z.enum(['studio', 'apartment', 'house', 'shared', 'dormitory']);

export const CreateApartmentSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  address: z.string().min(5).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  neighborhood: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().min(5).max(10),
  country: z.string().min(2).max(100).default('USA'),

  price: z.number().min(0).max(100000),
  securityDeposit: z.number().min(0).max(50000).optional(),

  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  squareFeet: z.number().int().min(1).max(100000).optional(),

  apartmentType: ApartmentTypeSchema,
  furnished: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),
  smokingAllowed: z.boolean().default(false),

  amenities: z.array(z.string()).max(50).default([]),
  utilities: z.array(z.string()).max(20).default([]),
  images: z.array(URLSchema).min(1).max(20),

  availableFrom: DateStringSchema,
  leaseDuration: z.enum(['monthly', '3-months', '6-months', 'yearly', 'flexible']),

  universityId: UUIDSchema.optional(),
  commuteTime: z.number().int().min(0).max(300).optional(),
});

export const UpdateApartmentSchema = CreateApartmentSchema.partial();

export const SearchApartmentSchema = z.object({
  q: z.string().max(500).optional(),
  type: z.enum(['structured', 'keyword', 'semantic', 'hybrid']).default('hybrid'),

  // Location filters
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(0).max(50000).optional(),

  // Price filters
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),

  // Room filters
  rooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),

  // Feature filters
  amenities: z.array(z.string()).optional(),
  furnished: z.boolean().optional(),
  petsAllowed: z.boolean().optional(),

  // University filters
  university: UUIDSchema.optional(),
  maxCommute: z.number().int().min(0).max(300).optional(),

  // Sorting and pagination
  sortBy: z.enum(['relevance', 'price', 'newest', 'rating', 'distance']).default('relevance'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});


// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

export const BookingStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed']);

export const PaymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded']);

export const CreateBookingSchema = z.object({
  apartmentId: UUIDSchema,
  checkInDate: DateStringSchema,
  checkOutDate: DateStringSchema,
  guests: z.number().int().min(1).max(20).default(1),
  message: z.string().max(1000).optional(),
}).refine(
  (data) => new Date(data.checkOutDate) > new Date(data.checkInDate),
  { message: 'Check-out date must be after check-in date' }
);

export const UpdateBookingStatusSchema = z.object({
  status: BookingStatusSchema,
  cancellationReason: z.string().max(1000).optional(),
});


// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const ReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const CreateReviewSchema = z.object({
  apartmentId: UUIDSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().min(5).max(200),
  content: z.string().min(20).max(2000),

  // Detailed ratings
  cleanliness: z.number().int().min(1).max(5).optional(),
  communication: z.number().int().min(1).max(5).optional(),
  location: z.number().int().min(1).max(5).optional(),
  value: z.number().int().min(1).max(5).optional(),

  images: z.array(URLSchema).max(10).optional(),
  stayedFrom: DateStringSchema.optional(),
  stayedTo: DateStringSchema.optional(),
});

export const UpdateReviewSchema = CreateReviewSchema.partial();


// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const CreateMessageSchema = z.object({
  conversationId: z.string().min(1),
  receiverId: UUIDSchema,
  content: z.string().min(1).max(5000),
  attachments: z.array(URLSchema).max(5).optional(),
});

export const CreateConversationSchema = z.object({
  participantId: UUIDSchema,
  initialMessage: z.string().min(1).max(5000).optional(),
});


// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const CreatePaymentIntentSchema = z.object({
  bookingId: UUIDSchema,
  amount: z.number().min(1),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.enum(['card', 'bank_transfer', 'paypal']).default('card'),
});

export const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string().optional(),
});


// ============================================================================
// VERIFICATION SCHEMAS
// ============================================================================

export const SubmitVerificationSchema = z.object({
  verificationType: z.enum(['student', 'owner', 'identity']),
  documents: z.array(URLSchema).min(1).max(5),
  additionalInfo: z.record(z.string(), z.any()).optional(),
});

export const UpdateVerificationStatusSchema = z.object({
  status: VerificationStatusSchema,
  reviewerNotes: z.string().max(1000).optional(),
});


// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const NotificationTypeSchema = z.enum([
  'booking',
  'message',
  'review',
  'payment',
  'verification',
  'system',
]);

export const CreateNotificationSchema = z.object({
  userId: UUIDSchema,
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  actionUrl: URLSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateNotificationSchema = z.object({
  read: z.boolean(),
});


// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const AdminActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'delete', 'restore']),
  targetType: z.enum(['user', 'apartment', 'review', 'booking']),
  targetId: UUIDSchema,
  reason: z.string().min(10).max(1000),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const AdminReportSchema = z.object({
  reportType: z.enum(['users', 'apartments', 'bookings', 'revenue', 'analytics']),
  startDate: DateStringSchema.optional(),
  endDate: DateStringSchema.optional(),
  filters: z.record(z.string(), z.any()).optional(),
});


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate data against a schema and return parsed result
 * Throws validation error with detailed messages if invalid
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns success/error object
 */
export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}

/**
 * Extract validation error messages
 */
export function getValidationErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  error.issues.forEach((err: z.ZodIssue) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return errors;
}

/**
 * Middleware helper for Next.js API routes
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: Record<string, string[]> }> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: getValidationErrors(result.error),
  };
}

// Export all schemas as a namespace for organized imports
export const ValidationSchemas = {
  // Common
  Email: EmailSchema,
  Password: PasswordSchema,
  Phone: PhoneSchema,
  URL: URLSchema,
  UUID: UUIDSchema,
  DateString: DateStringSchema,
  Pagination: PaginationSchema,
  Coordinates: CoordinatesSchema,

  // User
  UserType: UserTypeSchema,
  CreateUser: CreateUserSchema,
  UpdateUserProfile: UpdateUserProfileSchema,
  UserLogin: UserLoginSchema,

  // Apartment
  ApartmentStatus: ApartmentStatusSchema,
  ApartmentType: ApartmentTypeSchema,
  CreateApartment: CreateApartmentSchema,
  UpdateApartment: UpdateApartmentSchema,
  SearchApartment: SearchApartmentSchema,

  // Booking
  BookingStatus: BookingStatusSchema,
  CreateBooking: CreateBookingSchema,
  UpdateBookingStatus: UpdateBookingStatusSchema,

  // Review
  CreateReview: CreateReviewSchema,
  UpdateReview: UpdateReviewSchema,

  // Message
  CreateMessage: CreateMessageSchema,
  CreateConversation: CreateConversationSchema,

  // Payment
  CreatePaymentIntent: CreatePaymentIntentSchema,
  ConfirmPayment: ConfirmPaymentSchema,

  // Verification
  SubmitVerification: SubmitVerificationSchema,
  UpdateVerificationStatus: UpdateVerificationStatusSchema,

  // Notification
  NotificationType: NotificationTypeSchema,
  CreateNotification: CreateNotificationSchema,
  UpdateNotification: UpdateNotificationSchema,

  // Admin
  AdminAction: AdminActionSchema,
  AdminReport: AdminReportSchema,
};
