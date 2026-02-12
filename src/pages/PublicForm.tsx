import { useParams } from 'react-router-dom';
import { useMenus } from '@/hooks/useMenus';
import { DynamicForm } from '@/components/forms/DynamicForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function PublicForm() {
    const { menuId } = useParams();
    const { menus, isLoading } = useMenus();
    const [submitted, setSubmitted] = useState(false);

    const menu = menus.find((m) => m.id === menuId);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!menu) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Form Not Found</CardTitle>
                        <CardDescription>The form you're looking for doesn't exist or has been removed.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="w-full max-w-md text-center animate-fade-in">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <CardTitle>Submission Successful!</CardTitle>
                        <CardDescription>
                            Thank you for filling out the form. Your response has been recorded.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <button
                            onClick={() => setSubmitted(false)}
                            className="text-primary hover:underline text-sm font-medium"
                        >
                            Submit another response
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2 mb-4">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                        {menu.name}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                        Please fill out the form below. Your responses are collected securely.
                    </p>
                </div>

                <DynamicForm
                    menuId={menu.id}
                    onSuccess={() => setSubmitted(true)}
                    formSettings={menu.form_settings}
                />

                <div className="flex flex-col items-center justify-center gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-medium">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-bold">K</span>
                        </div>
                        <span>Management KST</span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-bold">
                        &copy; {new Date().getFullYear()} &bull; Professional Form Solutions
                    </p>
                </div>
            </div>
        </div>
    );
}
