import express from "express";
import {
  signupUser,
  loginUser,
  logoutUser,
  getMe,
  updateMe,
  loginOAuth,
  forgotPassword,
  resetPassword,
} from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/login-oauth", loginOAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

export default router;
