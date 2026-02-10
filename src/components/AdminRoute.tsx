import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
    const { user, loading } = useAuth();
    const location = useLocation();
    const isAdmin = user?.email === 'muhamadiruel@gmail.com';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        // If not logged in, go to login. If logged in but not admin, go to dashboard.
        const redirectPath = !user ? '/login' : '/dashboard';
        return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
