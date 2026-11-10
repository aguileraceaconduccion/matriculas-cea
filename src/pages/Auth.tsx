import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Mail, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Acceso exclusivo del instructor. No hay registro público: las cuentas se
// crean desde el panel de Supabase y se autorizan en la tabla `administradores`.
const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, isAdmin, loading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user && isAdmin) navigate('/', { replace: true });
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo iniciar sesión',
        description: 'Correo o contraseña incorrectos.',
      });
    }
  };

  const signedInWithoutPermission = !loading && !!user && !isAdmin;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Aguilera CEA</h1>
          <p className="text-muted-foreground mt-1">Centro de Enseñanza Automovilística</p>
        </div>

        <Card className="card-elevated">
          <CardHeader className="text-center">
            <CardTitle>Acceso del instructor</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder al panel</CardDescription>
          </CardHeader>
          <CardContent>
            {signedInWithoutPermission ? (
              <div className="space-y-4 text-center">
                <ShieldAlert className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Esta cuenta no tiene permisos de instructor.
                </p>
                <Button variant="outline" className="w-full" onClick={() => signOut()}>
                  Cerrar sesión
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || loading}>
                  {(submitting || loading) && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
