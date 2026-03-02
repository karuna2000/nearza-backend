import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import otpModel from "../models/mongo/otpModel";
import { userModel, UserStatus } from "../models/sql/userModel";
import { generateOTP } from "../utils/generateOTP";
import { generateToken } from "../utils/jwt";
import { Sequelize, Op, WhereOptions } from "sequelize";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../services/cloudinary";

// =============================================
// 📩 Send OTP Controller
// =============================================
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, phone } = req.body as {
    email?: string;
    phone?: string;
  };

  // Generate OTP
  const otp = generateOTP();
  const OTP_EXPIRY_TIME =
    parseInt(process.env.OTP_EXPIRY_MINUTES || "5") * 60 * 1000; // OTP will expire after 5 minutes

  const otpData = await otpModel.create({
    ...(email && { email }),
    ...(phone && { phone }),
    otp,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME),
  });

  if (!otpData) {
    throw new ApiError(500, "Failed to generate OTP. Please try again.");
  }

  // TODO: Send OTP via Email/SMS

  return res.status(200).json(
    new ApiResponse(
      {
        email,
        phone,
        otp, // ⚠️ DEV ONLY (remove in production)
      },
      "A one-time verification code has been sent successfully.",
    ),
  );
});

// =============================================
// 🔐 Verify OTP & Authenticate User
// =============================================
export const verifyOtpAndAuthenticate = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, phone, otp } = req.body as {
      email?: string;
      phone?: string;
      otp: string;
    };
    const currentTime = new Date();

    // 🔍 Find latest OTP record
    const otpQuery = email ? { email, otp } : { phone, otp };
    const otpRecord = await otpModel.findOne(otpQuery).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new ApiError(400, "The verification code you entered is invalid.");
    }

    if (otpRecord.expiresAt < currentTime) {
      throw new ApiError(
        400,
        "The verification code has expired. Please request a new code.",
      );
    }

    // 👤 Include soft-deleted users
    const userWhere = email ? { email } : { phone };

    // 👤 Check user (SQL)
    let user = await userModel.findOne({
      where: userWhere,
      paranoid: false,
    });

    let isNewUser = false;

    // 🆕 If user not found → create
    if (!user) {
      isNewUser = true;

      user = await userModel.create({
        email: email || null,
        phone: phone || null,
      });
    }

    // ♻️ If user was soft deleted → restore automatically
    if (user.deletedAt) {
      const deletedTime = new Date(user.deletedAt).getTime();
      const now = Date.now();

      const hours24 = 24 * 60 * 60 * 1000;
      const days30 = 30 * 24 * 60 * 60 * 1000;

      const timeSinceDelete = now - deletedTime;

      // ❌ Block restore within 24 hours
      if (timeSinceDelete < hours24) {
        throw new ApiError(
          403,
          "Your account was recently deleted. You can restore it after 24 hours.",
        );
      }

      // ❌ If more than 30 days → block login
      if (timeSinceDelete > days30) {
        throw new ApiError(403, "Your account has been permanently deleted.");
      }

      // ✅ Restore if between 24h and 30 days
      await user.restore();
    }

    // 🚫 STATUS CHECK (IMPORTANT PART)
    if (user.status === "BLOCKED") {
      throw new ApiError(
        403,
        "Your account has been blocked. Please contact support for assistance.",
      );
    }

    if (user.status === "DISABLED") {
      throw new ApiError(
        403,
        "Your account is currently disabled. Please reach out to support.",
      );
    }

    if (user.status === "SUSPENDED") {
      throw new ApiError(
        403,
        "Your account has been temporarily suspended. Please try again later.",
      );
    }

    // 🔑 Generate auth token
    const authToken = generateToken({
      id: String(user.id),
      ...(user.email ? { email: user.email } : {}),
      ...(user.phone ? { phone: user.phone } : {}),
      roles: user.roles,
    });

    // 🧹 Delete OTP records
    await otpModel.deleteMany(email ? { email } : { phone });

    // 🍪 Set token cookie
    res.cookie("token", authToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json(
      new ApiResponse(
        {
          token: authToken,
          user,
          isNewUser,
        },
        "You have been authenticated successfully.",
      ),
    );

    // 🔔 NOTE FOR FRONTEND:
    // If `isNewUser === true`, redirect user to profile completion page.
    // Otherwise, proceed to dashboard/home.
  },
);

// =============================================
// 👤 Get User Profile Controller
// =============================================
export const getUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    // 🔐 userAuth middleware guarantees req.user
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "You are not authorized to perform this action.");
    }

    const user = await userModel.findByPk(userId);

    if (!user) {
      throw new ApiError(404, "The requested user account could not be found.");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(user, "Your profile has been retrieved successfully."),
      );
  },
);

// =============================================
// 📝 User Update Profile Controller
// =============================================
export const updateUserProfile = asyncHandler(
  async (req: Request & { file?: any; user?: any }, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "You are not authorized to perform this action.");
    }

    const user = await userModel.findByPk(userId);

    if (!user) {
      throw new ApiError(404, "The requested user account could not be found.");
    }

    const { fullName, email, phone } = req.body || {};
    const updateData: any = {};

    // ========= Image Handling =========
    if (req?.file) {
      // delete old image
      if (user?.profileImage) {
        await deleteFromCloudinary(user.profileImage);
      }

      const uploadedImage = await uploadOnCloudinary(req?.file?.path);

      if (!uploadedImage?.secure_url) {
        throw new ApiError(
          500,
          "Something went wrong while uploading your profile image. Please try again.",
        );
      }

      updateData.profileImage = uploadedImage.secure_url;
    }

    // ========= Other Fields =========
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    await user.update(updateData);

    return res
      .status(200)
      .json(
        new ApiResponse(user, "Your profile has been updated successfully."),
      );
  },
);

// =============================================
// 🚪 Logout Controller
// =============================================
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Clear the authentication cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res
    .status(200)
    .json(new ApiResponse("You have been logged out successfully."));
});

// =============================================
// 🔐 Delete Account Controller
// =============================================
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "You are not authorized to perform this action.");
    }
    const user = await userModel.findByPk(userId);

    if (!user) {
      throw new ApiError(404, "The requested user account could not be found.");
    }

    // Soft delete the user
    await user.destroy();

    // Optional: clear refresh token
    await user.update({ refreshToken: null });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res
      .status(200)
      .json(new ApiResponse("Your account has been deleted successfully."));
  },
);

// =============================================
// ADMIN CONTROLLERS
// =============================================

// =============================================
// 📋 Get All Users (Admin Only)
// =============================================
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const search = req.query.search as string | undefined;
  const role = req.query.role as string | undefined;
  const status = req.query.status as UserStatus | undefined;

  const offset = (page - 1) * limit;

  const whereClause: WhereOptions<any> = {
    ...(search && {
      [Op.or]: [
        { fullName: { [Op.like]: `%${search}%` } }, // ✅ MySQL uses Op.like (case-insensitive by default)
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ],
    }),
    ...(role && {
      roles: Sequelize.where(
        Sequelize.fn(
          "JSON_CONTAINS",
          Sequelize.col("roles"),
          JSON.stringify([role]),
        ),
        1,
      ),
    }), // ✅ MySQL uses JSON_CONTAINS for JSON array filtering
    ...(status && { status }),
  };

  const { count, rows } = await userModel.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    attributes: { exclude: ["refreshToken"] },
    order: [["createdAt", "DESC"]],
  });

  return res.status(200).json(
    new ApiResponse(
      {
        users: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
      "User list retrieved successfully.",
    ),
  );
});

// =============================================
// 🔄 Update User Status (Admin Only)
// =============================================
export const updateAccountStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const { status } = req.body as { status: UserStatus };

    const user = await userModel.findByPk(userId);

    if (!user) {
      throw new ApiError(404, "The requested user account could not be found.");
    }

    await user.update({ status });

    return res
      .status(200)
      .json(
        new ApiResponse(
          user,
          "The user's account status has been updated successfully.",
        ),
      );
  },
);

// =============================================
// 👤 Get Single User (Admin View)
// =============================================
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);

  const user = await userModel.findByPk(userId);
  if (!user) {
    throw new ApiError(404, "The requested user account could not be found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(user, "User details retrieved successfully."));
});
