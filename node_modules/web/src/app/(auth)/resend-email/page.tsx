
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@radix-ui/react-label'
import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { resendVerificationEmail } from '@/api/auth.api'
import { toast } from "sonner"
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const ResendEmailPage = () => {

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const formik = useFormik({
        initialValues: {
            email: '',
        },
        validationSchema: Yup.object({
            email: Yup.string().email('Invalid email address').required('Required'),
        }),
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                const res = await resendVerificationEmail(values.email);
                setMessage(res.message);
                console.log(res);
            } catch (err: any) {
                console.log(err);
            } finally {
                setIsLoading(false);
            }
        },
    });
    return (

        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
            <Card className="w-full max-w-md border-0 shadow-xl ring-1 ring-gray-900/5 sm:rounded-2xl bg-white">
                <CardHeader className="space-y-1 pb-6 pt-8 text-center">
                    <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900">Resend Verificastion Email</CardTitle>
                    <CardDescription className="text-gray-500">
                        Enter your email address beloew to receive your new link.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <form onSubmit={formik.handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor='email' className="text-sm font-medium text-gray-700">
                                Email
                            </Label>
                            <Input id='email' type='email' name='email' placeholder='john.doe@example.com' className={`h-11 rounded-lg border-gray-200 bg-gray-50 px-4 text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0`}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.email}
                            />
                        </div>
                        <Button type='submit' className="w-full h-11 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-sm font-medium text-base mt-2"
                            disabled={isLoading || !formik.isValid || !formik.dirty}
                            onClick={() => toast.info(message)}>Resend verification link</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default ResendEmailPage