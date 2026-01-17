"use client"


import { login } from "@/api/auth.api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@radix-ui/react-label"
import { useFormik } from "formik"
import Link from "next/link"
import { useState } from "react"
import * as Yup from "yup"


const validationSchema = Yup.object({
    email: Yup.string()
        .email("Please enter a valid email address.")
        .required("Email is required."),
    password: Yup.string()
        .min(8, "Password must be at least 8 characters.")
        .required("Password is required."),
})

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            setIsLoading(true)
            try {
                console.log("Submitting values:", values)
                let data = await login(values)
                console.log("Login Success")
            } catch (error) {
                console.error("Login error:", error)
            } finally {
                setIsLoading(false)
            }
        },
    })

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md border-0 shadow-xl ring-1 ring-gray-900/5 sm:rounded-2xl bg-white">
                <CardHeader className="space-y-1 pb-6 pt-8 text-center">
                    <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900">
                        Login into your account
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        Enter your credentials to login into your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <form onSubmit={formik.handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                className={`h-11 rounded-lg border-gray-200 bg-gray-50 px-4 text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0 ${formik.touched.email && formik.errors.email ? "border-red-500" : ""
                                    }`}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.email}
                            />
                            {formik.touched.email && formik.errors.email ? (
                                <div className="text-sm font-medium text-red-500">{formik.errors.email}</div>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                className={`h-11 rounded-lg border-gray-200 bg-gray-50 px-4 text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0 ${formik.touched.password && formik.errors.password ? "border-red-500" : ""
                                    }`}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.password}
                            />
                            {formik.touched.password && formik.errors.password ? (
                                <div className="text-sm font-medium text-red-500">{formik.errors.password}</div>
                            ) : null}
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-11 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-sm font-medium text-base mt-2"
                            disabled={isLoading || !formik.isValid || !formik.dirty}
                        >
                            {isLoading ? "Login in..." : "Login"}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">Don't have an account? </span>
                        <Link href="/signup" className="font-medium text-gray-900 hover:text-gray-700 underline underline-offset-4">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}