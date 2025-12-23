import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { role, gender, age } = body

        if (!role || !gender || !age) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        const client = await clientPromise
        const db = client.db()

        const result = await db.collection("users").updateOne(
            { _id: new ObjectId(session.user.id) },
            {
                $set: {
                    role,
                    gender,
                    age: parseInt(age),
                    hasDetails: true
                },
            }
        )

        return NextResponse.json({ success: true, message: "Profile updated" })
    } catch (error) {
        console.error("Failed to update profile", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
