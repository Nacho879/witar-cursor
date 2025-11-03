import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  CalendarOff, 
  FolderKanban, 
  BarChart,
  Users,
  ShieldCheck,
  Building,
  ArrowRight,
  CheckCircle,
  Star,
  Mail,
  Phone,
  MapPin,
  Send,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const Demo = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    empleados: '',
    interes: 'control-horario',
    mensaje: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Limpiar error cuando el usuario modifica el formulario
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      console.log('📧 Enviando solicitud de demo...', formData);
      
      // Llamar a la edge function para enviar el email
      const { data, error: functionError } = await supabase.functions.invoke('send-demo-request', {
        body: {
          nombre: formData.nombre,
          empresa: formData.empresa,
          email: formData.email,
          telefono: formData.telefono,
          empleados: formData.empleados,
          interes: formData.interes,
          mensaje: formData.mensaje
        }
      });

      console.log('📧 Respuesta de la función:', { data, error: functionError });

      if (functionError) {
        console.error('❌ Error al invocar función:', functionError);
        throw new Error(functionError.message || 'Error al enviar la solicitud');
      }

      if (!data) {
        console.error('❌ No se recibió respuesta de la función');
        throw new Error('No se recibió respuesta del servidor');
      }

      if (!data.success) {
        console.error('❌ Error en respuesta:', data.error);
        throw new Error(data.error || 'Error al enviar la solicitud');
      }

      console.log('✅ Solicitud enviada exitosamente:', data);
      // Si todo salió bien, mostrar mensaje de éxito
      setIsSubmitted(true);
    } catch (err) {
      console.error('❌ Error completo:', err);
      setError(err.message || 'Ha ocurrido un error al enviar tu solicitud. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (isSubmitted) {
    return (
      <>
        <Helmet>
          <title>Demo Solicitada - Witar</title>
          <meta name="description" content="Gracias por solicitar una demo de Witar. Nos pondremos en contacto contigo pronto." />
        </Helmet>

        <div className="min-h-screen bg-background flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center p-8"
          >
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-4">
              ¡Demo Solicitada!
            </h1>
            
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Gracias por tu interés en Witar. Nuestro equipo se pondrá en contacto contigo 
              en las próximas 24 horas para programar tu demo personalizada.
            </p>

            <div className="bg-card p-6 rounded-xl border border-border mb-8">
              <h3 className="font-semibold text-foreground mb-4">Próximos pasos:</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <span className="text-sm text-muted-foreground">Recibirás un email de confirmación</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <span className="text-sm text-muted-foreground">Nuestro equipo te contactará para programar la demo</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <span className="text-sm text-muted-foreground">Demo personalizada de 30 minutos</span>
                </div>
              </div>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Link>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Solicitar Demo - Witar</title>
        <meta name="description" content="Solicita una demo personalizada de Witar y descubre cómo podemos transformar la gestión de tu equipo." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-primary">Witar</span>
              </Link>
              
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              
              {/* Form Section */}
              <motion.div
                initial="initial"
                animate="animate"
                variants={fadeInUp}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                    Solicita tu demo personalizada
                  </h1>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Descubre cómo Witar puede transformar la gestión de tu equipo. 
                    Nuestro equipo te mostrará todas las funcionalidades adaptadas a tus necesidades.
                  </p>
                </div>

                <div className="bg-card p-8 rounded-2xl border border-border shadow-lg">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Nombre completo *
                        </label>
                        <input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="Tu nombre"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Empresa *
                        </label>
                        <input
                          type="text"
                          name="empresa"
                          value={formData.empresa}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="Nombre de tu empresa"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="tu@email.com"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          name="telefono"
                          value={formData.telefono}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="+34 600 000 000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Número de empleados *
                        </label>
                        <select
                          name="empleados"
                          value={formData.empleados}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        >
                          <option value="">Selecciona...</option>
                          <option value="1-10">1-10 empleados</option>
                          <option value="11-25">11-25 empleados</option>
                          <option value="26-50">26-50 empleados</option>
                          <option value="51-100">51-100 empleados</option>
                          <option value="100+">Más de 100 empleados</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Principal interés
                        </label>
                        <select
                          name="interes"
                          value={formData.interes}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        >
                          <option value="control-horario">Control horario</option>
                          <option value="vacaciones">Gestión de vacaciones</option>
                          <option value="documentos">Documentos laborales</option>
                          <option value="reportes">Reportes y analytics</option>
                          <option value="equipo">Gestión de equipos</option>
                          <option value="general">Funcionalidades generales</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Mensaje adicional
                      </label>
                      <textarea
                        name="mensaje"
                        value={formData.mensaje}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                        placeholder="Cuéntanos más sobre tus necesidades específicas..."
                      />
                    </div>

                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-cta hover:bg-cta/90 disabled:bg-cta/50 text-cta-foreground py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando solicitud...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Solicitar Demo
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>

              {/* Info Section */}
              <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="space-y-8"
              >
                <motion.div variants={fadeInUp}>
                  <h2 className="text-3xl font-bold text-foreground mb-6">
                    ¿Qué incluye tu demo?
                  </h2>
                  
                  <div className="space-y-4">
                    {[
                      {
                        icon: Clock,
                        title: "Control horario en tiempo real",
                        description: "Ve cómo funciona el fichaje, geolocalización y reportes de tiempo"
                      },
                      {
                        icon: CalendarOff,
                        title: "Gestión de vacaciones",
                        description: "Solicitudes, aprobaciones y calendario visual integrado"
                      },
                      {
                        icon: FolderKanban,
                        title: "Documentos digitales",
                        description: "Almacenamiento seguro y gestión de documentos laborales"
                      },
                      {
                        icon: BarChart,
                        title: "Analytics avanzados",
                        description: "Reportes personalizados y dashboards ejecutivos"
                      },
                      {
                        icon: Users,
                        title: "Gestión de equipos",
                        description: "Organización por departamentos y permisos granulares"
                      },
                      {
                        icon: ShieldCheck,
                        title: "Seguridad y cumplimiento",
                        description: "GDPR, encriptación y auditoría de accesos"
                      }
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        variants={fadeInUp}
                        className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border"
                      >
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="bg-gradient-to-br from-primary/5 to-cta/5 p-6 rounded-xl border border-border">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-cta" />
                    Beneficios de la demo
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Demo personalizada de 30 minutos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Sin compromiso ni coste
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Adaptada a tu sector y necesidades
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Respuesta en menos de 24 horas
                    </li>
                  </ul>
                </motion.div>

                <motion.div variants={fadeInUp} className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="font-semibold text-foreground mb-4">¿Necesitas ayuda?</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-primary" />
                      <span>demo@witar.es</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-primary" />
                      <span>+34 900 000 000</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>Madrid, España</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Demo; 