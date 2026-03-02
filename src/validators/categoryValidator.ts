import { z } from "zod";

// =============================================
// 📂 Create Category Validator
// =============================================
export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(3, "Category name must be at least 3 characters long"),
    description: z
      .string()
      .min(10, "Category description must be at least 10 characters long")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  }),
});

// =============================================
// ✏️ Update Category Validator
// =============================================
export const updateCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Category name must be at least 3 characters long")
      .optional(),
    description: z
      .string()
      .min(10, "Category description must be at least 10 characters long")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  }),
});

// =============================================
// 🗑️ Delete Category Validator
// =============================================
export const deleteCategorySchema = z.object({
  params: z.object({
    categoryId: z.string().regex(/^\d+$/, "Category ID must be a valid number"),
  }),
});

// =============================================
// 🔄 Toggle Category Status Validator
// =============================================
export const toggleCategoryStatusSchema = z.object({
  params: z.object({
    categoryId: z.string().regex(/^\d+$/, "Category ID must be a valid number"),
  }),
});

// =============================================
// 🔎 Get Single Category By ID Validator
// =============================================
export const getCategoryByIdSchema = z.object({
  params: z.object({
    categoryId: z.string().regex(/^\d+$/, "Category ID must be a valid number"),
  }),
});
