import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 24 * 60 * 60 * 1000,
};

function signToken(id: number, role: string) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
}

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists, Please Login" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: "Signed Up successfully",
      name: newUser.name,
      email: newUser.email,
    });
  } catch (error) {
    console.error("signupUser error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const token = signToken(user.id, user.role);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("loginUser error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logoutUser = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, plan: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name },
      select: { id: true, name: true, email: true, role: true, plan: true },
    });
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("updateMe error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const loginOAuth = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, message: "Email and name are required" });
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name },
      update: {},
    });

    const token = signToken(user.id, user.role);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("loginOAuth error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Always return same response — don't reveal whether email exists
    const RESPONSE = { success: true, message: "If that email exists, a reset link has been sent" };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json(RESPONSE);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await getResend().emails.send({
      from: "AptiAce <noreply@aptiace.com>",
      to: email,
      subject: "Reset your AptiAce password",
      html: `<p>Click the link below to reset your password. It expires in 15 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return res.status(200).json(RESPONSE);
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!resetToken) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
