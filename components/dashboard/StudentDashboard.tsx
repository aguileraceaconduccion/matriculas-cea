import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, Car, Calendar, Clock, User, LogOut, MessageCircle } from 'lucide-react';

interface StudentDashboardProps {
  userName: string;
  onLogout: () => void;
  onScheduleTheoretical: () => void;
  onSchedulePractical: () => void;
}

export const StudentDashboard = ({ userName, onLogout, onScheduleTheoretical, onSchedulePractical }: StudentDashboardProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Aguilera CEA</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">{userName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-display font-bold mb-2">
            ¡Hola, {userName.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mb-8">
            Bienvenido a tu panel de alumno. Aquí puedes agendar tus clases.
          </p>
        </motion.div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="card-elevated h-full cursor-pointer group hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Clases Teóricas</CardTitle>
                <CardDescription>
                  Aprende las normas de tránsito, señalización y seguridad vial con instructores certificados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Mar - Sáb: 6am - 8pm</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Dom: 6:30am - 6:30pm</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>Bloques de 2 horas</span>
                  </div>
                </div>
                <Button className="w-full group-hover:bg-primary/90" onClick={onScheduleTheoretical}>
                  Agendar Clase Teórica
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="card-elevated h-full cursor-pointer group hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Car className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Clases Prácticas</CardTitle>
                <CardDescription>
                  Practica la conducción con nuestros vehículos y aprende técnicas de manejo seguro.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Car className="w-4 h-4" />
                    <span>Vehículos modernos y seguros</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Horarios personalizados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Sincronizado con Google Calendar</span>
                  </div>
                </div>
                <Button className="w-full group-hover:bg-primary/90" onClick={onSchedulePractical}>
                  Agendar Clase Práctica
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold mb-4">Tu Progreso</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Clases Teóricas', value: '0/10', icon: BookOpen },
              { label: 'Clases Prácticas', value: '0/20', icon: Car },
              { label: 'Próxima Clase', value: 'Sin agendar', icon: Calendar },
              { label: 'Estado', value: 'Activo', icon: User },
            ].map((stat, index) => (
              <Card key={stat.label} className="p-4">
                <div className="flex items-center gap-3">
                  <stat.icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-semibold">{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};
