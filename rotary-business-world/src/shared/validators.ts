import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name").max(120),
  email: z.string().email("Enter a valid email"),
  // Rotary details used for roster-match verification
  rotaryId: z.string().min(3, "Enter your Rotary / membership ID").max(40),
  clubName: z.string().min(2, "Enter your club name").max(160),
  // FK to District record — the picker stores the district id, not a raw code.
  // The service resolves the district code from this id for roster matching.
  districtId: z.string().min(1, "Select your district"),
  // Required contact number — lenient to allow international formats (+, spaces, -, ()).
  phone: z
    .string()
    .regex(/^[0-9+()\-\s]{7,40}$/, "Enter a valid phone number"),
  country: z.string().min(2).max(80).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Same as registerSchema minus email — for Google OAuth users who authenticated
// first and now need to complete their Rotary membership details.
export const rotaryProfileSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name").max(120),
  rotaryId: z.string().min(3, "Enter your Rotary / membership ID").max(40),
  clubName: z.string().min(2, "Enter your club name").max(160),
  districtId: z.string().min(1, "Select your district"),
  phone: z
    .string()
    .regex(/^[0-9+()\-\s]{7,40}$/, "Enter a valid phone number"),
  country: z.string().min(2).max(80).optional(),
});
export type RotaryProfileInput = z.infer<typeof rotaryProfileSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const businessSchema = z.object({
  name: z.string().min(2, "Business name is required").max(160),
  description: z.string().max(4000).optional().or(z.literal("")),
  industryId: z.string().optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  whatsapp: z.string().max(40).optional().or(z.literal("")),
  addressLine: z.string().max(240).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
  instagram: z.string().max(200).optional().or(z.literal("")),
  // Rotarian discount — coerce carefully: FormData sends "" for empty, which
  // z.coerce.number() would turn into 0. Preprocess to undefined first.
  discountPercent: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(100).optional(),
  ),
  discountNote: z.string().max(120).optional().or(z.literal("")),
});
export type BusinessInput = z.infer<typeof businessSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, "Missing conversation"),
  body: z.string().trim().min(1, "Message can't be empty").max(4000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const createDistrictAdminSchema = z.object({
  fullName: z.string().min(2, "Enter the admin's full name").max(120),
  email: z.string().email("Enter a valid email"),
  districtId: z.string().min(1, "Select a district"),
});
export type CreateDistrictAdminInput = z.infer<typeof createDistrictAdminSchema>;

export const createDistrictSchema = z.object({
  code: z.string().min(1, "District code is required").max(20),
  name: z.string().max(160).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
});
export type CreateDistrictInput = z.infer<typeof createDistrictSchema>;

export const createClubSchema = z.object({
  name: z.string().min(2, "Club name is required").max(160),
  districtId: z.string().min(1, "Select a district"),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
});
export type CreateClubInput = z.infer<typeof createClubSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
  // photoUrl comes from ImageUpload — already a full URL or "".
  photoUrl: z.string().optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  whatsapp: z.string().max(40).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  linkedin: z.string().url("Enter a valid LinkedIn URL").optional().or(z.literal("")),
  instagram: z.string().max(200).optional().or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const reviewSchema = z.object({
  businessId: z.string().min(1, "Missing business"),
  slug: z.string().min(1, "Missing slug"),
  // Coerce the hidden rating input the same way discountPercent is handled.
  rating: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1, "Select a rating").max(5),
  ),
  body: z.string().max(2000).optional().or(z.literal("")),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
