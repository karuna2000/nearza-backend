import { Router } from "express";
import { adminAuth } from "../middlewares/auth";
import { upload } from "../middlewares/multer";
import { validate } from "../middlewares/zodValidator";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
  isDisableCategory,
  updateCategory,
  getAllCategoriesForAdmin,
} from "../controllers/categoryController";
import { createCategorySchema } from "../validators/categoryValidator";

const router = Router();

// =============================================
// 📦 PUBLIC ROUTES
// =============================================

// Get all categories : GET
router.get("/all-categories", getAllCategories);

// Get single category by ID : GET
router.get("/single-category/:categoryId", getCategoryById);

// =============================================
// 👑 ADMIN ROUTES (Protected)
// =============================================

// Create new category : POST
router.post(
  "/create-category",
  adminAuth,
  upload.single("categoryImage"),
  validate(createCategorySchema),
  createCategory,
);

// Delete category (Hard delete) : DELETE
router.delete("/delete-category/:categoryId", adminAuth, deleteCategory);

// Soft delete category (Disable) : PUT
router.put("/isDisabled-category/:categoryId", adminAuth, isDisableCategory);

// Update category details : PUT
router.put(
  "/update-category/:categoryId",
  adminAuth,
  upload.single("categoryImage"),
  updateCategory,
);

// Get all categories (including disabled) for admin : GET
router.get("/categoriesForAdmin", adminAuth, getAllCategoriesForAdmin);

export default router;
