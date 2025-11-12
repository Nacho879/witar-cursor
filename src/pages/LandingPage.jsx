import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
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
  Building,
  Rocket,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
  Globe,
  Smartphone,
  Cloud,
  Lock,
  Euro,
  Infinity,
  Award,
  Quote,
  HeadphonesIcon,
  Menu,
  X,
  Play
} from 'lucide-react';

const LandingPage = () => {
  const [activeSection, setActiveSection] = React.useState('home');
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  // Función para cerrar el menú móvil y hacer scroll a una sección
  const handleMobileNavClick = (sectionId) => {
    setIsMobileMenuOpen(false);
    scrollToSection(sectionId);
  };

  // Función para manejar el acceso a la cuenta
  const handleAccessAccount = async (e) => {
    if (e) e.preventDefault();
    
    try {
      // Verificar si hay sesión activa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // No hay sesión, redirigir al login
        navigate('/login');
        return;
      }

      // Hay sesión activa, obtener el rol del usuario
      const { data: userRole, error: roleError } = await supabase
        .from('user_company_roles')
        .select('role, company_id, companies(id, name, slug)')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (roleError || !userRole) {
        // Si no hay rol activo, verificar si hay invitaciones pendientes
        const { data: pendingInvitation } = await supabase
          .from('invitations')
          .select('*')
          .eq('email', session.user.email)
          .in('status', ['pending', 'sent'])
          .single();

        if (pendingInvitation) {
          navigate(`/accept-invitation?token=${pendingInvitation.token}`);
          return;
        } else {
          // Por defecto, redirigir a employee
          navigate('/employee');
          return;
        }
      }

      // Redirigir según el rol
      const redirectPath = userRole.role === 'owner' ? '/owner' : 
                         userRole.role === 'admin' ? '/admin' : 
                         userRole.role === 'manager' ? '/manager' : '/employee';
      navigate(redirectPath);
    } catch (error) {
      console.error('Error verificando sesión:', error);
      // En caso de error, redirigir al login
      navigate('/login');
    }
  };

  // Detectar scroll para cambiar el estilo del header y sección activa
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      // Detectar sección activa
      const sections = ['home', 'features', 'pricing', 'testimonials', 'faq'];
      const scrollPosition = window.scrollY + 100;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Función para scroll suave a secciones
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

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
        {/* Header/Navigation */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-card/95 backdrop-blur-md border-b border-border shadow-lg' 
            : 'bg-transparent'
        }`}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl overflow-hidden">
                  <img src="/logo.png" alt="Witar" className="w-10 h-10 object-contain" />
                </div>
                <span className="text-2xl font-bold text-primary">
                  Witar
                </span>
              </div>
              
              {/* Desktop Navigation - Centered */}
              <nav className="hidden md:flex items-center justify-center flex-1 gap-8">
                <button 
                  onClick={() => scrollToSection('home')}
                  className={`transition-colors ${
                    activeSection === 'home' 
                      ? 'text-primary font-semibold' 
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  Inicio
                </button>
                <button 
                  onClick={() => scrollToSection('features')}
                  className={`transition-colors ${
                    activeSection === 'features' 
                      ? 'text-primary font-semibold' 
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  Características
                </button>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className={`transition-colors ${
                    activeSection === 'pricing' 
                      ? 'text-primary font-semibold' 
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  Precios
                </button>
                <button 
                  onClick={() => scrollToSection('testimonials')}
                  className={`transition-colors ${
                    activeSection === 'testimonials' 
                      ? 'text-primary font-semibold' 
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  Testimonios
                </button>
                <button 
                  onClick={() => scrollToSection('faq')}
                  className={`transition-colors ${
                    activeSection === 'faq' 
                      ? 'text-primary font-semibold' 
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  FAQ
                </button>
              </nav>

              {/* Right side buttons */}
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/demo"
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Solicitar Demo
                </Link>
                <button
                  onClick={handleAccessAccount}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Iniciar Sesión
                </button>
                <Link
                  to="/register"
                  className="px-6 py-2 bg-cta text-cta-foreground rounded-lg hover:bg-cta/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Empezar Gratis
                </Link>
              </div>

              {/* Mobile menu button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Mobile Menu Panel */}
              <div className="fixed top-16 left-0 right-0 bg-card border-b border-border z-50 md:hidden shadow-lg">
                <nav className="container mx-auto px-4 py-4 space-y-4">
                  {/* Navigation Links */}
                  <button
                    onClick={() => handleMobileNavClick('home')}
                    className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeSection === 'home' 
                        ? 'text-primary font-semibold bg-primary/10' 
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    Inicio
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('features')}
                    className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeSection === 'features' 
                        ? 'text-primary font-semibold bg-primary/10' 
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    Características
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('pricing')}
                    className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeSection === 'pricing' 
                        ? 'text-primary font-semibold bg-primary/10' 
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    Precios
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('testimonials')}
                    className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeSection === 'testimonials' 
                        ? 'text-primary font-semibold bg-primary/10' 
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    Testimonios
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('faq')}
                    className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeSection === 'faq' 
                        ? 'text-primary font-semibold bg-primary/10' 
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    FAQ
                  </button>
                  
                  {/* Divider */}
                  <div className="border-t border-border my-4" />
                  
                  {/* Action Buttons */}
                  <Link
                    to="/demo"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-left px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Solicitar Demo
                  </Link>
                  <button
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      handleAccessAccount(e);
                    }}
                    className="block w-full text-left px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 bg-cta text-cta-foreground rounded-lg hover:bg-cta/90 transition-all duration-200 font-semibold"
                  >
                    Empezar Gratis
                  </Link>
                </nav>
              </div>
            </>
          )}
        </header>

        {/* Hero Section */}
        <section id="home" className="relative overflow-hidden pt-20 pb-32">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
          
          <div className="relative container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial="initial"
                animate="animate"
                variants={fadeInUp}
                className="space-y-8"
              >
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-2 bg-cta/10 text-cta rounded-full text-sm font-medium">
                  <Star className="w-4 h-4 mr-2" />
                  La plataforma más completa de gestión de RRHH
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground leading-tight">
                  <span className="text-primary">
                    Simplifica
                  </span>
                  <br />
                  la gestión de tu equipo
                </h1>
                
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                  Control horario, vacaciones, documentos laborales y más. 
                  Todo en una plataforma moderna y fácil de usar.
                </p>

                {/* Stats */}
                <div className="flex flex-wrap justify-center gap-4 sm:gap-8 py-6 sm:py-8 px-4 sm:px-0">
                  {[
                    { number: "500+", label: "Empresas confían en Witar" },
                    { number: "50K+", label: "Empleados gestionados" },
                    { number: "99.9%", label: "Tiempo de actividad" }
                  ].map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.number}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 sm:pt-8 px-4 sm:px-0">
                  <Link
                    to="/register"
                    className="group inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-cta text-cta-foreground font-semibold rounded-xl hover:bg-cta/90 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 w-full sm:w-auto"
                  >
                    Empezar gratis
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  
                  <Link
                    to="/demo"
                    className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-200 w-full sm:w-auto"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                    Solicitar Demo
                  </Link>
                  
                  <button
                    onClick={handleAccessAccount}
                    className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 border-2 border-border text-foreground font-semibold rounded-xl hover:bg-secondary transition-all duration-200 w-full sm:w-auto"
                  >
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                    Acceder a mi cuenta
                  </button>
                </div>


              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-secondary">
          <div className="container mx-auto px-4">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-20"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-4 sm:px-0">
                Todo lo que necesitas para gestionar tu equipo
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
                Una plataforma completa que integra todas las herramientas necesarias 
                para la gestión eficiente de recursos humanos.
              </p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            >
              {[
                {
                  icon: Clock,
                  title: "Control Horario Inteligente",
                  description: "Registro automático de entrada y salida con geolocalización y reportes en tiempo real.",
                  color: "bg-primary"
                },
                {
                  icon: CalendarOff,
                  title: "Gestión de Vacaciones",
                  description: "Solicitud, aprobación y seguimiento de vacaciones con calendario visual intuitivo.",
                  color: "bg-success"
                },
                {
                  icon: FolderKanban,
                  title: "Documentos Digitales",
                  description: "Almacenamiento seguro en la nube con firma digital y versionado automático.",
                  color: "bg-cta"
                },
                {
                  icon: BarChart,
                  title: "Analytics Avanzados",
                  description: "Reportes detallados y dashboards personalizables para tomar mejores decisiones.",
                  color: "bg-primary"
                },
                {
                  icon: Users,
                  title: "Gestión de Equipos",
                  description: "Organización por departamentos, roles y permisos granulares para cada usuario.",
                  color: "bg-success"
                },
                {
                  icon: ShieldCheck,
                  title: "Seguridad Empresarial",
                  description: "Cumplimiento GDPR, encriptación de datos y auditoría completa de accesos.",
                  color: "bg-cta"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="group bg-card p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-border hover:border-primary/20"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color === 'bg-primary' ? 'from-primary to-primary-dark' : feature.color === 'bg-success' ? 'from-success to-green-600' : 'from-cta to-orange-600'} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-primary/10 to-cta/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 bg-gradient-to-br from-success/10 to-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInLeft}
                className="space-y-8"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                  Diseñado para empresas que valoran la eficiencia
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Witar automatiza procesos tediosos y libera tiempo para que tu equipo 
                  se enfoque en lo que realmente importa: hacer crecer tu empresa.
                </p>

                <div className="space-y-6">
                  {[
                    { icon: Zap, text: "Ahorra hasta 10 horas semanales en gestión administrativa" },
                    { icon: TrendingUp, text: "Mejora la productividad del equipo en un 25%" },
                    { icon: Globe, text: "Acceso desde cualquier dispositivo, en cualquier lugar" },
                    { icon: Lock, text: "Cumplimiento total con normativas laborales vigentes" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <span className="text-foreground text-lg">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInRight}
                className="relative"
              >
                <div className="bg-card rounded-2xl p-8 shadow-2xl border border-border">
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { icon: Smartphone, title: "Móvil", desc: "App nativa" },
                      { icon: Cloud, title: "Cloud", desc: "Siempre disponible" },
                      { icon: ShieldCheck, title: "Seguro", desc: "Encriptado" },
                      { icon: Clock, title: "Rápido", desc: "Tiempo real" }
                    ].map((item, index) => (
                      <div key={index} className="text-center p-6 bg-secondary rounded-xl">
                        <item.icon className="w-12 h-12 text-primary mx-auto mb-3" />
                        <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Progress Chart */}
                  <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-cta/5 rounded-xl">
                    <h4 className="font-semibold text-foreground mb-4 text-center">Eficiencia del equipo</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Productividad", value: 85, color: "from-success to-green-600" },
                        { label: "Asistencia", value: 92, color: "from-primary to-primary-dark" },
                        { label: "Satisfacción", value: 88, color: "from-cta to-orange-600" }
                      ].map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">{item.label}</span>
                            <span className="text-muted-foreground">{item.value}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className={`h-2 bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 ease-out`}
                              style={{ width: `${item.value}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-secondary">
          <div className="container mx-auto px-4">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Precios transparentes y escalables
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Solo pagas por lo que usas. Sin costes ocultos, sin compromisos a largo plazo.
              </p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            >
              {/* Plan Básico */}
              <motion.div
                variants={fadeInUp}
                className="bg-card p-8 rounded-2xl shadow-lg border border-border hover:shadow-2xl transition-all duration-300"
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Básico</h3>
                  <p className="text-muted-foreground mb-6">Para empresas pequeñas</p>
                  
                  <div className="mb-8">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-bold text-foreground">€1.50</span>
                      <span className="text-muted-foreground mt-2">por empleado al mes más IVA</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8 text-left">
                    {[
                      "Control horario básico",
                      "Gestión de vacaciones",
                      "Documentos laborales",
                      "Hasta 25 empleados",
                      "Soporte por email"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    Empezar gratis
                  </Link>
                </div>
              </motion.div>

              {/* Plan Profesional - Destacado */}
              <motion.div
                variants={fadeInUp}
                className="relative bg-card p-8 rounded-2xl shadow-2xl border-2 border-cta hover:shadow-3xl transition-all duration-300"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-cta text-cta-foreground px-4 py-2 rounded-full text-sm font-semibold">
                    Más popular
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Profesional</h3>
                  <p className="text-muted-foreground mb-6">Para empresas en crecimiento</p>
                  
                  <div className="mb-8">
                    <span className="text-4xl font-bold text-foreground">Personalizado</span>
                  </div>

                  <ul className="space-y-4 mb-8 text-left">
                    {[
                      "Todo del plan Básico",
                      "Analytics avanzados",
                      "Reportes personalizados",
                      "Empleados ilimitados",
                      "Soporte prioritario",
                      "API personalizada"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => window.open('mailto:ventas@witar.es', '_blank')}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-cta text-cta-foreground font-semibold rounded-xl hover:bg-cta/90 transition-all duration-200 shadow-lg"
                  >
                    Contactar ventas
                  </button>
                </div>
              </motion.div>

              {/* Plan Enterprise */}
              <motion.div
                variants={fadeInUp}
                className="bg-card p-8 rounded-2xl shadow-lg border border-border hover:shadow-2xl transition-all duration-300"
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Enterprise</h3>
                  <p className="text-muted-foreground mb-6">Para grandes empresas</p>
                  
                  <div className="mb-8">
                    <span className="text-4xl font-bold text-foreground">Personalizado</span>
                  </div>

                  <ul className="space-y-4 mb-8 text-left">
                    {[
                      "Todo del plan Profesional",
                      "Integración personalizada",
                      "Soporte 24/7 dedicado",
                      "Onboarding personalizado",
                      "SLA garantizado",
                      "Consultoría incluida"
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => window.open('mailto:ventas@witar.es', '_blank')}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    Contactar ventas
                  </button>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mt-16"
            >
              <p className="text-lg text-muted-foreground mb-4">
                ✨ <strong>14 días de prueba gratuita</strong> • Cancelación inmediata
              </p>
              <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Precios en euros
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Pago seguro
                </div>
                <div className="flex items-center gap-2">
                  <Infinity className="w-4 h-4" />
                  Escalabilidad garantizada
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Lo que dicen nuestros clientes
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Empresas de todos los tamaños confían en Witar para gestionar sus equipos.
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
                  name: "María González",
                  role: "CEO, TechStart",
                  company: "Startup tecnológica",
                  text: "Witar nos ha permitido ahorrar 15 horas semanales en gestión administrativa. La interfaz es intuitiva y el soporte excepcional.",
                  rating: 5
                },
                {
                  name: "Carlos Ruiz",
                  role: "Director RRHH",
                  company: "Consultoría 150 empleados",
                  text: "Desde que implementamos Witar, la gestión de vacaciones y documentos es mucho más eficiente. Altamente recomendado.",
                  rating: 5
                },
                {
                  name: "Ana Martín",
                  role: "Gerente General",
                  company: "Empresa familiar",
                  text: "La facilidad de uso y la completitud de funciones nos convenció desde el primer día. Excelente relación calidad-precio.",
                  rating: 5
                }
              ].map((testimonial, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-card p-8 rounded-2xl shadow-lg border border-border hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-cta fill-current" />
                    ))}
                  </div>
                  
                  <Quote className="w-8 h-8 text-primary/20 mb-4" />
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed italic">
                    "{testimonial.text}"
                  </p>
                  
                  <div className="border-t border-border pt-4">
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-sm text-primary">{testimonial.company}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-secondary">
          <div className="container mx-auto px-4">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Preguntas frecuentes
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Resolvemos las dudas más comunes sobre Witar.
              </p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="max-w-4xl mx-auto space-y-6"
            >
              {[
                {
                  question: "¿Cómo funciona el sistema de fichajes?",
                  answer: "El sistema es muy sencillo: los empleados pueden fichar entrada/salida y pausas desde cualquier dispositivo. Los managers pueden ver en tiempo real el estado de su equipo y aprobar solicitudes de modificación."
                },
                {
                  question: "¿Qué pasa si un empleado olvida fichar?",
                  answer: "Los empleados pueden solicitar la adición de fichajes faltantes. Los managers revisan y aprueban estas solicitudes, manteniendo un control total sobre las modificaciones."
                },
                {
                  question: "¿Puedo modificar un fichaje ya registrado?",
                  answer: "Sí, pero siempre a través del sistema de solicitudes. Los empleados solicitan cambios, los managers los revisan y aprueban/rechazan. Todo queda registrado para auditoría."
                },
                {
                  question: "¿El sistema funciona sin conexión a internet?",
                  answer: "Sí, puedes fichar sin conexión. Los datos se sincronizan automáticamente cuando recuperas la conexión. Nunca perderás información."
                },
                {
                  question: "¿Cómo sé si un empleado está trabajando?",
                  answer: "El sistema muestra en tiempo real el estado de cada empleado: trabajando, en pausa, o fuera de servicio. Los managers tienen una vista completa de su equipo."
                },
                {
                  question: "¿Qué tipos de reportes puedo generar?",
                  answer: "Horas trabajadas, pausas, tardanzas, ausencias, productividad por empleado, comparativas entre períodos, y exportación a Excel/PDF para contabilidad."
                },
                {
                  question: "¿Es legal para cumplir con la normativa española?",
                  answer: "Sí, Witar cumple con el Real Decreto-Ley 8/2019 sobre control horario. Registra entrada, salida y pausas, mantiene historial de 4 años, y genera reportes para inspección de trabajo."
                },
                {
                  question: "¿Puedo configurar horarios flexibles?",
                  answer: "Sí, puedes configurar horarios personalizados por empleado, tolerancias de llegada/salida, y diferentes tipos de jornada. El sistema se adapta a tu empresa."
                },
                {
                  question: "¿Qué pasa con la privacidad de los empleados?",
                  answer: "Los empleados solo ven sus propios fichajes. Los managers ven solo su equipo. Los datos están encriptados y cumplimos con GDPR. Cada usuario tiene acceso controlado."
                },
                {
                  question: "¿Puedo integrar Witar con mi nómina?",
                  answer: "Sí, puedes exportar las horas trabajadas en formatos compatibles con los principales sistemas de nómina. También ofrecemos integraciones directas con software contable."
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-all duration-300"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-24 bg-background">
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
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                La plataforma más completa y segura para la gestión de recursos humanos en España.
              </p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {[
                {
                  icon: Users,
                  title: "Fácil de usar",
                  description: "Interfaz intuitiva que cualquier empleado puede dominar en minutos"
                },
                {
                  icon: Zap,
                  title: "Implementación rápida",
                  description: "Tu empresa funcionando con Witar en menos de 24 horas"
                },
                {
                  icon: HeadphonesIcon,
                  title: "Soporte en español",
                  description: "Atención al cliente especializada y en tu idioma"
                },
                {
                  icon: Smartphone,
                  title: "Acceso móvil",
                  description: "App nativa para iOS y Android, trabaja desde cualquier lugar"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="text-center p-6 bg-card rounded-xl border border-border hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-cta rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mt-16"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                <div className="text-center">
                  <Award className="w-12 h-12 text-cta mx-auto mb-4" />
                  <h3 className="font-bold text-foreground mb-2">Certificado ISO 27001</h3>
                  <p className="text-sm text-muted-foreground">Seguridad de datos garantizada</p>
                </div>
                <div className="text-center">
                  <ShieldCheck className="w-12 h-12 text-success mx-auto mb-4" />
                  <h3 className="font-bold text-foreground mb-2">Cumplimiento GDPR</h3>
                  <p className="text-sm text-muted-foreground">Protección de datos europea</p>
                </div>
                <div className="text-center">
                  <Clock className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-foreground mb-2">99.9% Uptime</h3>
                  <p className="text-sm text-muted-foreground">Disponibilidad garantizada</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="max-w-4xl mx-auto space-y-8"
            >
              <h2 className="text-4xl md:text-5xl font-bold">
                ¿Listo para transformar la gestión de tu empresa?
              </h2>
              
              <p className="text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">
                Únete a cientos de empresas que ya confían en Witar para 
                gestionar sus recursos humanos de manera eficiente y moderna.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-cta text-cta-foreground font-semibold rounded-xl hover:bg-cta/90 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Probar gratis por 14 días
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <button
                  onClick={handleAccessAccount}
                  className="inline-flex items-center gap-3 px-8 py-4 border-2 border-primary-foreground/30 text-primary-foreground font-semibold rounded-xl hover:bg-primary-foreground/10 transition-all duration-200"
                >
                  <LogIn className="w-5 h-5" />
                  Acceder ahora
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm opacity-80">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Sin tarjeta de crédito
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Cancelación gratuita
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Soporte 24/7
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-card border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Main Footer Content */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                {/* Company Info */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                    <div className="w-8 h-8 rounded-lg overflow-hidden">
                      <img src="/logo.png" alt="Witar" className="w-8 h-8 object-contain" />
                    </div>
                    <span className="text-xl font-bold text-foreground">Witar</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    La plataforma más completa para la gestión de recursos humanos. 
                    Simplifica el control horario, vacaciones y documentos laborales.
                  </p>
                  <div className="flex justify-center md:justify-start space-x-4">
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      <span className="sr-only">Twitter</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      <span className="sr-only">LinkedIn</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Product */}
                <div className="text-center md:text-left">
                  <h3 className="font-semibold text-foreground mb-4">Producto</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="#features" className="hover:text-primary transition-colors">Características</a></li>
                    <li><a href="#pricing" className="hover:text-primary transition-colors">Precios</a></li>
                    <li><Link to="/demo" className="hover:text-primary transition-colors">Solicitar Demo</Link></li>
                    <li><a href="#testimonials" className="hover:text-primary transition-colors">Testimonios</a></li>
                    <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
                  </ul>
                </div>

                {/* Company */}
                <div className="text-center md:text-left">
                  <h3 className="font-semibold text-foreground mb-4">Empresa</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="#" className="hover:text-primary transition-colors">Sobre nosotros</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Carreras</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Soporte</a></li>
                  </ul>
                </div>

                {/* Legal */}
                <div className="text-center md:text-left">
                  <h3 className="font-semibold text-foreground mb-4">Legal</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="/terminos-condiciones" className="hover:text-primary transition-colors">Términos y Condiciones</Link></li>
                    <li><Link to="/politica-privacidad" className="hover:text-primary transition-colors">Política de Privacidad</Link></li>
                    <li><Link to="/politica-cookies" className="hover:text-primary transition-colors">Política de Cookies</Link></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Condiciones de Servicio</a></li>
                    <li><a href="#" className="hover:text-primary transition-colors">Cumplimiento RGPD</a></li>
                  </ul>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="border-t border-border pt-8">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                  <p className="text-sm text-muted-foreground">
                    © 2024 Witar. Todos los derechos reservados.
                  </p>
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <span>Hecho con ❤️ en España</span>
                    <span>•</span>
                    <span>ISO 27001 Certificado</span>
                    <span>•</span>
                    <span>RGPD Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

    </>
  );
};

export default LandingPage; 