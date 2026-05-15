import type { Request,Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

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