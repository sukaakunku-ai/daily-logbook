import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMenus, Menu } from '@/hooks/useMenus';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface FormSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menu: Menu;
}

export function FormSettingsDialog({ open, onOpenChange, menu }: FormSettingsDialogProps) {
    const { updateMenu } = useMenus();
    const [title, setTitle] = useState(menu.form_settings?.title ?? '');
    const [description, setDescription] = useState(menu.form_settings?.description ?? '');
    const [headerImage, setHeaderImage] = useState(menu.form_settings?.header_image ?? '');
    const [isUploading, setIsUploading] = useState(false);

    // Sync state when menu changes or dialog opens
    // We can't easily do this in a controlled component without useEffect,
    // but better to just init from props and maybe key the dialog.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateMenu.mutateAsync({
                id: menu.id,
                name: menu.name,
                icon: menu.icon,
                form_settings: {
                    title,
                    description,
                    header_image: headerImage,
                },
            });
            onOpenChange(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'X-Menu-Id': menu.id,
                    'X-Field-Label': 'Header Image',
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            setHeaderImage(result.webViewLink.replace('/view', '/preview') || result.url); // Prefer preview or direct URL
            toast.success('Header image uploaded');
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Form Customization</DialogTitle>
                        <DialogDescription>
                            Customize the title, description, and header image of the submission form.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="form-title">Form Title</Label>
                            <Input
                                id="form-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Submit New Entry"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="form-desc">Form Description</Label>
                            <Textarea
                                id="form-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Fill out the form to add a new entry."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Header Image</Label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    value={headerImage}
                                    onChange={(e) => setHeaderImage(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1"
                                />
                                <div className="relative">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                    />
                                    <Button type="button" variant="outline" size="icon" disabled={isUploading}>
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            {headerImage && (
                                <div className="mt-2 relative aspect-video rounded-md overflow-hidden border">
                                    <img src={headerImage} alt="Header Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-4 pt-2">
                            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Live Preview</Label>
                            <Card className="border-dashed bg-muted/30">
                                <CardHeader className="p-4">
                                    <CardTitle className="text-lg">
                                        {title || 'Form Title'}
                                    </CardTitle>
                                    <CardDescription>
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed min-h-[1.5rem]">
                                            {description || 'Form description will appear here...'}
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateMenu.isPending}>
                            {updateMenu.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
