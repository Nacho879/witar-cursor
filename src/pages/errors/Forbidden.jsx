import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Home, ArrowLeft, ShieldX, Lock } from 'lucide-react';

const Forbidden = () => {
  const navigate = useNavigate();

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.8, delay: 0.2 }
  };

  return (
    <>
      <Helmet>
        <title>403 - Acceso Denegado | Witar</title>
        <meta name="description" content="No tienes permisos para acceder a esta página." />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial="initial"
            animate="animate"
            variants={fadeInUp}
            className="space-y-8"
          >
            {/* 403 Number */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <h1 className="text-9xl md:text-[12rem] font-bold text-primary/20 select-none">
                403
              </h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldX className="w-24 h-24 md:w-32 md:h-32 text-primary/40" />
              </div>
            </motion.div>

            {/* Main Message */}
            <motion.div variants={fadeIn}>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Acceso Denegado
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground mb-2">
                No tienes permisos para acceder a esta página.
              </p>
              <p className="text-base text-muted-foreground">
                Esta área está restringida. Si crees que deberías tener acceso, contacta con tu administrador.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
            >
              <button
                onClick={() => navigate(-1)}
                className="group inline-flex items-center justify-center gap-3 px-6 py-3 bg-cta text-cta-foreground font-semibold rounded-xl hover:bg-cta/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver atrás
              </button>
              
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-3 px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-200 w-full sm:w-auto"
              >
                <Home className="w-5 h-5" />
                Ir al inicio
              </Link>
            </motion.div>

            {/* Helpful Links */}
            <motion.div
              variants={fadeIn}
              className="pt-12 border-t border-border"
            >
              <p className="text-sm text-muted-foreground mb-4">
                ¿Necesitas ayuda?
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary"
                >
                  Iniciar sesión
                </Link>
                <a
                  href="mailto:soporte@witar.es"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary"
                >
                  Contactar soporte
                </a>
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="fixed top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-3xl pointer-events-none"
              style={{ zIndex: 0 }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="fixed bottom-20 right-10 w-32 h-32 bg-cta/10 rounded-full blur-3xl pointer-events-none"
              style={{ zIndex: 0 }}
            />
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Forbidden;

