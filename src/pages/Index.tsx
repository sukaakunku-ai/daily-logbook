import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ClipboardList, ArrowRight, CheckCircle } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const features = [
    'Create custom trackers for any workflow',
    'Build dynamic forms without coding',
    'Upload files directly to cloud storage',
    'View and analyze your entries easily',
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <ClipboardList className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Daily Work Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Sign in
            </Button>
            <Button onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <span>✨ Simple • Powerful • Customizable</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto text-balance">
              Track Your Daily Work{' '}
              <span className="text-primary">Effortlessly</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Create custom trackers, build dynamic forms, and manage your daily
              tasks, reports, and activities—all in one beautiful, intuitive app.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/signup')} className="gap-2">
                Start Tracking Free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Sign in to Dashboard
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <button
                onClick={() => navigate('/dashboard')}
                className="hover:text-primary underline underline-offset-4"
              >
                Browse as guest
              </button>
            </p>

            <div className="mt-16 grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Daily Work Tracker. Built with ❤️ for productivity.</p>
        </div>
      </footer>
    </div>
  );
}
