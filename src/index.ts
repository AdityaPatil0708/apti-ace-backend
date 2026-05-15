import express from "express"
import type { Request, Response } from "express"
import dotenv from "dotenv"
dotenv.config();

const app = express()

app.get("/", async (req: Request, res: Response) => {
    await res.send("Hi there")
})

const PORT = process.env.PORT
app.listen(PORT)
console.log(`Server Listening on ${PORT}`)
