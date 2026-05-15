import type { Request,Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const signupUser = async(req:Request,res:Response)=>{
    try {
        const {name,email,password} = req.body
        if(!name || !email || !password){
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }

        const user = await prisma.user.findFirst({
            where:{email}
        })
        if(user){
            return res.status(400).json({
                success: false,
                message: "User already exists, Please Login"
            })
        }

        const hashedPassword = await bcrypt.hash(password,10)
        const newUser = await prisma.user.create({
            data:{
                name: name,
                email: email,
                password: hashedPassword
            }
        })
        return res.status(200).json({
            success:true,
            message:"Signed Up successfully",
            name : newUser.name,
            email : newUser.email
        })
        
    } catch (error) {
        console.error("signupUser error:", error)
        res.status(500).json({
            message:"Internal Server Error"
        })
    }

}

export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: "1d"
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            name: user.name,
            email: user.email,
            token: token
        });

    } catch (error) {
        console.error("loginUser error:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

export const logoutUser = (req: Request, res: Response) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
};