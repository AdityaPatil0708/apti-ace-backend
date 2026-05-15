import express from "express"
import type { Request, Response } from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRoute from "./routes/userRoute.js"

dotenv.config();

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use("/api/v1", userRoute)

app.get("/", (req: Request, res: Response) => {
    res.send("Hi there")
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log(`Server Listening on ${PORT}`)
})