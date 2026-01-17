"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { verifyEmail, resendVerificationEmail } from "@/api/auth.api"

type Status = "idle" | "loading" | "success" | "error"

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const token = useMemo(() => searchParams?.get("token") ?? "", [searchParams]);

    const [status, setStatus] = useState<Status>("idle");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus("error")
                setMessage("Missing verification token.")
                return
            }

            setStatus("loading")
            setMessage("")
            try {
                const res = await verifyEmail(token)
                setStatus("success")
                setMessage(res.message ?? "Email verified successfully.")

            } catch (err: any) {
                setStatus("error")
                const apiMsg =
                    err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    err?.message ||
                    "Verification failed."
                setMessage(Array.isArray(apiMsg) ? apiMsg.join(", ") : String(apiMsg))
            }
        }

        verify()
    }, [token, router])

    const title =
        status === "success"
            ? "Email verified"
            : status === "error"
                ? "Verification failed"
                : "Verifying your email"

    const description =
        status === "success"
            ? "Your account is ready. You can sign in now."
            : status === "error"
                ? "The link may be invalid or expired."
                : "Just a moment while we confirm your token."

    async function handleClick() {
        try {
            const res = await resendVerificationEmail("placehodler, need new file in which to get the email");
        } catch (err: any) {
            console.log(err);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md border-0 shadow-xl ring-1 ring-gray-900/5 sm:rounded-2xl bg-white">
                <CardHeader className="space-y-1 pb-6 pt-8 text-center">
                    <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900">
                        {title}
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        {description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pb-8 space-y-5">
                    {status === "loading" && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            Verifying…
                        </div>
                    )}

                    {status === "success" && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            {message}
                        </div>
                    )}

                    {status === "error" && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {message}
                        </div>
                    )}

                    <Button
                        className="w-full h-11 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-sm font-medium text-base"
                        asChild
                    >
                        <Link href="/login">Go to login</Link>
                    </Button>

                    <div className="text-center text-sm">
                        {/* <span className="text-gray-500">Need a new link? </span> */}
                        <Button className="" variant="link" onClick={() => router.push("/resend-email")}> Need a new link? </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
