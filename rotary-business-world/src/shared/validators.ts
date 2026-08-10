import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  // Rotary details used for roster-match verification
  rotaryId: z.string().min(3, "Enter your Rotary / membership ID").max(40),
  clubName: z.string().min(2, "Enter your club name").max(160),
  districtCode: z.string().min(1, "Enter your district").max(20),
  // Required contact number — lenient to allow international formats (+, spaces, -, ()).
  phone: z
    .string()
    .regex(/^[0-9+()\-\s]{7,40}$/, "Enter a valid phone number"),
  country: z.string().min(2).max(80).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
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
});
export type BusinessInput = z.infer<typeof businessSchema>;
