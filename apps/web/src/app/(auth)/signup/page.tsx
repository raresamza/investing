
"use client"

import { useState } from "react"
import { useFormik } from "formik"
import * as Yup from "yup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { toast } from "sonner"
import { signup } from "@/api/auth.api"

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Email is required."),
  name: Yup.string()
    .required("Name is required."),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters.")
    .required("Password is required."),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm Password is required."),
})

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)
      try {
        console.log("Submitting values:", values)
        const data = await signup(values)
        toast.success(data.message || "Signup successful! Please verify your email.")
        console.log("Signup Success")
      } catch (error: any) {
        console.error("Signup error:", error);
        const errorData = error?.response?.data
        const errorMessage = Array.isArray(errorData?.message)
          ? errorData.message.join(", ")
          : errorData?.message || "Signup failed"

        toast.error(errorMessage)
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
            Create an account
          </CardTitle>
          <CardDescription className="text-gray-500">
            Enter your credentials below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={formik.handleSubmit} className="space-y-5">


            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                className={`h-11 rounded-lg border-gray-200 bg-gray-50 px-4 text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0 ${formik.touched.name && formik.errors.name ? "border-red-500" : ""
                  }`}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.name}
              />
              {formik.touched.name && formik.errors.name ? (
                <div className="text-sm font-medium text-red-500">{formik.errors.name}</div>
              ) : null}
            </div>

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




            <div />

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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                className={`h-11 rounded-lg border-gray-200 bg-gray-50 px-4 text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0 ${formik.touched.confirmPassword && formik.errors.confirmPassword ? "border-red-500" : ""
                  }`}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.confirmPassword}
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword ? (
                <div className="text-sm font-medium text-red-500">{formik.errors.confirmPassword}</div>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-sm font-medium text-base mt-2"
              disabled={isLoading || !formik.isValid || !formik.dirty}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="font-medium text-gray-900 hover:text-gray-700 underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
