import express from "express"
import type { Request, Response } from "express"
import dotenv from "dotenv"
import userRoute from "./routes/userRoute.js"

dotenv.config();

const app = express()

app.use(express.json())
app.use("/api/v1", userRoute)

app.get("/", (req: Request, res: Response) => {
    res.send("Hi there")
})

const PORT = process.env.PORT || 8000
app.listen(PORT)
console.log(`Server Listening on ${PORT}`)