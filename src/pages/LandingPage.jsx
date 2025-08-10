import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  CalendarOff, 
  FolderKanban, 
  LogIn, 
  Zap, 
  Target, 
  BarChart,
  FileText,
  Users,
  Briefcase,
  ShieldCheck,
  Building2,
  Rocket,
  ArrowRight
} from 'lucide-react';

const LandingPage = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const fadeInLeft = {
    initial: { opacity: 0, x: -60 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6 }
  };

  const fadeInRight = {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Witar - Control horario, vacaciones y documentos laborales en un solo lugar</title>
        <meta name="description" content="Witar es la plataforma completa para gestionar recursos humanos. Control horario, vacaciones, documentos laborales y más, todo en un solo lugar." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Sección Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
          
          <div className="container mx-auto px-4 py-20 lg:py-32">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial="initial"
                animate="animate"
                variants={fadeInUp}
                className="space-y-6"
              >
                <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                  Witar control horario, vacaciones y documentos laborales en un solo lugar
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Simplifica la gestión de recursos humanos con nuestra plataforma integral. 
                  Control horario, gestión de vacaciones, documentos laborales y más, todo 
                  en una interfaz intuitiva y moderna.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    Empieza gratis
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-8 py-4 border-2 border-border text-foreground font-semibold rounded-lg hover:bg-secondary transition-colors duration-200"
                  >
                    <LogIn className="w-5 h-5" />
                    Acceder a mi cuenta
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Sección de Funcionalidades Destacadas */}
        <section id="features" className="py-20 bg-secondary">
          <div className="container mx-auto px-4">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Todo para la gestión de tu equipo, 100% online
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Nuestra plataforma ofrece todas las herramientas necesarias para 
                gestionar eficientemente los recursos humanos de tu empresa.
              </p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {[
                {
                  icon: Clock,
                  title: "Control Horario",
                  description: "Registro de entrada y salida, horas trabajadas y control de presencia en tiempo real."
                },
                {
                  icon: CalendarOff,
                  title: "Gestión de Vacaciones",
                  description: "Solicitud, aprobación y seguimiento de vacaciones y días libres de todo el equipo."
                },
                {
                  icon: FolderKanban,
                  title: "Documentos Laborales",
                  description: "Almacenamiento seguro y gestión centralizada de todos los documentos del empleado."
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-background p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6 mx-auto">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4 text-center">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-center leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Sección "Diseñado para Empresas" */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInLeft}
                className="space-y-8"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  Diseñado para empresas que valoran su tiempo
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Witar está diseñado pensando en las necesidades reales de las empresas 
                  modernas. Automatiza procesos tediosos y libera tiempo para lo que realmente importa.
                </p>

                <ul className="space-y-4">
                  {[
                    { icon: Zap, text: "Procesos automatizados que ahorran tiempo" },
                    { icon: Target, text: "Enfoque en la productividad del equipo" },
                    { icon: BarChart, text: "Reportes detallados para tomar mejores decisiones" }
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-foreground">
                        <strong>{item.text.split(' ').slice(0, 2).join(' ')}</strong> {item.text.split(' ').slice(2).join(' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInRight}
                className="grid grid-cols-2 gap-6"
              >
                {[
                  { icon: FileText, title: "Documentos" },
                  { icon: Users, title: "Equipo" },
                  { icon: Briefcase, title: "Empresa" },
                  { icon: Clock, title: "Tiempo" }
                ].map((item, index) => (
                  <div key={index} className="bg-secondary p-6 rounded-xl text-center">
                    <item.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Sección "¿Por qué elegir Witar?" */}
        <section className="py-20 bg-secondary">
          <div className="container mx-auto px-4">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                ¿Por qué elegir Witar?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Descubre las ventajas que hacen de Witar la elección perfecta 
                para la gestión de recursos humanos de tu empresa.
              </p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
            >
              {[
                { icon: ShieldCheck, title: "Seguridad Garantizada", description: "Tus datos están protegidos con los más altos estándares de seguridad." },
                { icon: CalendarOff, title: "Gestión de Ausencias", description: "Control completo de vacaciones, licencias y días libres." },
                { icon: FolderKanban, title: "Organización Total", description: "Todos los documentos y procesos en un solo lugar organizado." },
                { icon: Building2, title: "Escalable", description: "Crece con tu empresa, desde startups hasta grandes corporaciones." },
                { icon: BarChart, title: "Analytics Avanzados", description: "Reportes detallados para optimizar la gestión de recursos." },
                { icon: Rocket, title: "Implementación Rápida", description: "Empieza a usar Witar en minutos, sin complicaciones." }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-background p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center"
            >
              <p className="text-xl text-muted-foreground mb-8">
                ¿Listo para transformar la gestión de recursos humanos de tu empresa?
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
              >
                Solicitá tu demo gratuita
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Sección de Llamada a la Acción Final */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="max-w-3xl mx-auto space-y-8"
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                ¿Listo para transformar tus Recursos Humanos?
              </h2>
              
              <p className="text-xl opacity-90 leading-relaxed">
                Únete a cientos de empresas que ya confían en Witar para 
                gestionar sus recursos humanos de manera eficiente y moderna.
              </p>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary-foreground text-primary font-semibold rounded-lg hover:bg-primary-foreground/90 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                Probalo sin compromiso
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default LandingPage; 