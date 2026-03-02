import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import asyncHandler from "../utils/asyncHandler";
import { categoryModel } from "../models/sql/categoryModel";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../services/cloudinary";

// =============================================
// 📂 Create Category (Admin)
// =============================================
export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description } =
      (req.body as {
        name: string;
        description?: string;
      }) || {};
    let categoryImage: string | null = null;

    if (!req.body?.name) throw new ApiError(400, "Name is required.");
    if (req.file?.path) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      categoryImage = uploadResult?.secure_url || null;
    }

    const category = await categoryModel.create({
      name,
      description: description || null,
      categoryImage,
    });

    if (!category) {
      throw new ApiError(500, "Unable to create category. Please try again.");
    }

    return res
      .status(201)
      .json(
        new ApiResponse(category, "Category has been created successfully."),
      );
  },
);

// =============================================
// 📑 Get All Categories (Public)
// =============================================
export const getAllCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await categoryModel.findAll({
      where: { isDisabled: false },
      order: [["createdAt", "DESC"]],
    });

    if (!categories.length) {
      throw new ApiError(404, "No categories available.");
    }

    return res
      .status(200)
      .json(new ApiResponse(categories, "Categories retrieved successfully."));
  },
);

// =============================================
// 🔎 Get Single Category By ID
// =============================================
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const categoryId = Number(req.params.categoryId);

    const category = await categoryModel.findByPk(categoryId);

    if (!category) {
      throw new ApiError(404, "The requested category was not found.");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(category, "Category details retrieved successfully."),
      );
  },
);

// =============================================
// 🗑️ Delete Category (Admin)
// =============================================
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const categoryId = Number(req.params.categoryId);
    const category = await categoryModel.findByPk(categoryId);

    if (!category) {
      throw new ApiError(404, "The requested category does not exist.");
    }

    if (category.categoryImage) {
      await deleteFromCloudinary(category.categoryImage);
    }

    await category.destroy();

    return res
      .status(200)
      .json(new ApiResponse(null, "Category has been deleted successfully."));
  },
);

// =============================================
// 🔄 Toggle Category Status (Enable / Disable)
// =============================================
export const isDisableCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const categoryId = Number(req.params.categoryId);

    const category = await categoryModel.findByPk(categoryId);

    if (!category) {
      throw new ApiError(404, "The requested category does not exist.");
    }

    category.isDisabled = !category.isDisabled;
    await category.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          category.isDisabled
            ? "Category has been disabled successfully."
            : "Category has been enabled successfully.",
        ),
      );
  },
);

// =============================================
// ✏️ Update Category (Admin)
// =============================================
export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const categoryId = Number(req.params.categoryId);

    const { name, description } = req.body as {
      name?: string;
      description?: string;
    };

    const category = await categoryModel.findByPk(categoryId);
    if (!category)
      throw new ApiError(404, "The requested category does not exist.");

    // ========= Image Handling ========= //
    if (req.file?.path) {
      if (category.categoryImage)
        await deleteFromCloudinary(category.categoryImage);
      const uploadResult = await uploadOnCloudinary(req.file.path);
      if (!uploadResult?.secure_url)
        throw new ApiError(
          500,
          "Failed to upload category image. Please try again.",
        );
      category.categoryImage = uploadResult.secure_url;
    }

    // ========= Field Updates =========
    if (name) category.name = name;
    if (description) category.description = description.trim();

    await category.save();

    return res
      .status(200)
      .json(
        new ApiResponse(category, "Category has been updated successfully."),
      );
  },
);

// =============================================
// 🛠️ Get All Categories (Admin View)
// =============================================
export const getAllCategoriesForAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await categoryModel.findAll({
      order: [["createdAt", "DESC"]],
    });

    if (!categories.length) {
      throw new ApiError(404, "No categories available.");
    }

    return res
      .status(200)
      .json(new ApiResponse(categories, "Categories retrieved successfully."));
  },
);
