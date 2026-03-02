import { z } from "zod";

enum UserStatusEnum {
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
  BLOCKED = "BLOCKED",
  SUSPENDED = "SUSPENDED",
}

// =============================================
// 📩 Send OTP Request Validator
// =============================================
export const sendOtpSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email({ message: "Please enter a valid email address" })
        .regex(
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|in|net|edu|gov|co\.in|co\.uk)$/,
          "Email must end with valid domain extensions like .com, .org, .in, .net, .edu, .gov",
        )
        .optional()
        .transform((v) => (v === "" ? undefined : v)),

      phone: z
        .string()
        .regex(
          /^[6-9][0-9]{9}$/,
          "Phone number must be valid 10 digits.",
        )
        .optional()
        .transform((v) => (v === "" ? undefined : v)),
    })
    .refine((data) => data.email || data.phone, {
      message: "Either email or phone is required to generate OTP",
    })
    .refine((data) => !(data.email && data.phone), {
      message: "Provide only one: email OR phone, not both",
    }),
});

// =============================================
// 🔐 Verify OTP & Authenticate Validator
// =============================================

export const verifyOtpSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email({ message: "Please enter a valid email address." })
        .regex(
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|in|net|edu|gov|co\.in|co\.uk)$/,
          "Email must end with valid domain extensions like .com, .org, .in, .net, .edu, .gov",
        )
        .optional()
        .transform((v) => (v === "" ? undefined : v)),

      phone: z
        .string()
        .regex(/^[6-9][0-9]{9}$/, "Phone number must be valid 10 digits.")
        .optional()
        .transform((v) => (v === "" ? undefined : v)),

      otp: z.string().regex(/^[0-9]{6}$/, "OTP must be exactly 6 digits"),
    })
    .refine((data) => data.email || data.phone, {
      message: "Either email or phone is required to verify OTP",
    })
    .refine((data) => !(data.email && data.phone), {
      message: "Provide only one: email OR phone, not both",
    }),
});

// =============================================
// 📝 Complete User Profile Validator
// =============================================
export const updateUserProfileSchema = z.object({
  body: z
    .object({
      fullName: z
        .string()
        .min(2, "Full name must be at least 2 characters")
        .max(50, "Full name cannot exceed 50 characters")
        .optional(),

      email: z
        .string()
        .email({ message: "Please enter a valid email address." })
        .regex(
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|in|net|edu|gov|co\.in|co\.uk)$/,
          "Email must end with valid domain extensions like .com, .org, .in, .net, .edu, .gov",
        )
        .optional(),

      phone: z
        .string()
        .regex(/^[6-9][0-9]{9}$/, "Phone number must be valid 10 digits.")
        .optional(),
    })
});

// =============================================
// 🔄 Update User Account Status Validator (Admin)
// =============================================
export const updateAccountStatusSchema = z.object({
  params: z.object({
    userId: z.coerce
      .number()
      .int()
      .positive("User id must be a valid positive number"),
  }),

  body: z.object({
    status: z.nativeEnum(UserStatusEnum).refine((val) => !!val, {
      message: "Account status is required",
    }),
  }),
});

// =============================================
// 📋 Get All Users Query Validator (Admin)
// =============================================
export const getAllUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(100).optional(),
    role: z.enum(["CUSTOMER", "SELLER", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "DISABLED", "BLOCKED", "SUSPENDED"]).optional(),
  }),
});

// =============================================
// 👤 Get User By ID Validator (Admin)
// =============================================
export const getUserByIdSchema = z.object({
  params: z.object({
    userId: z.coerce
      .number()
      .int()
      .positive("User ID must be a valid positive number"),
  }),
});
