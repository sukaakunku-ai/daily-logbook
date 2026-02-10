import { FormField } from '@/hooks/useFormFields';

interface QuickLinksProps {
    fields: FormField[];
}

export function QuickLinks({ fields }: QuickLinksProps) {
    const iconLinks = fields.filter(f => f.field_type === 'icon_link');

    if (iconLinks.length === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {iconLinks.map((field) => {
                const [iconUrl, targetUrl] = field.options || [];
                return (
                    <a
                        key={field.id}
                        href={targetUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-4 bg-card border rounded-xl hover:bg-muted/50 hover:shadow-md transition-all group cursor-pointer no-underline text-foreground"
                    >
                        <div className="w-12 h-12 mb-2 flex items-center justify-center bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                            {iconUrl ? (
                                <img src={iconUrl} alt={field.label} className="w-8 h-8 object-contain" />
                            ) : (
                                <span className="text-xl">🔗</span>
                            )}
                        </div>
                        <span className="text-xs font-medium text-center truncate w-full px-1">
                            {field.label}
                        </span>
                    </a>
                );
            })}
        </div>
    );
}
