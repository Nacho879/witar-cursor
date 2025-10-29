import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Cookie, Settings, Eye } from 'lucide-react';

const PoliticaCookies = () => {
  return (
    <>
      <Helmet>
        <title>Política de Cookies - Witar</title>
        <meta name="description" content="Política de cookies de Witar. Información sobre cómo utilizamos las cookies y tecnologías similares." />
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
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-foreground mb-8">
                Política de Cookies
              </h1>
              
              <div className="text-sm text-muted-foreground mb-8">
                Última actualización: 20 de Enero de 2025
              </div>

              <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 mb-8">
                <div className="flex items-start gap-4">
                  <Cookie className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      ¿Qué son las Cookies?
                    </h3>
                    <p className="text-muted-foreground">
                      Las cookies son pequeños archivos de texto que se almacenan en su dispositivo 
                      cuando visita nuestro sitio web. Nos ayudan a mejorar su experiencia y a 
                      proporcionar funcionalidades personalizadas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">1. Tipos de Cookies que Utilizamos</h2>
                  
                  <div className="space-y-6">
                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-xl font-medium text-foreground mb-3">1.1 Cookies Esenciales</h3>
                      <p className="text-muted-foreground mb-3">
                        Estas cookies son necesarias para el funcionamiento básico del sitio web.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                        <li><strong>Autenticación:</strong> Mantener su sesión activa</li>
                        <li><strong>Seguridad:</strong> Proteger contra ataques y fraudes</li>
                        <li><strong>Funcionalidad:</strong> Recordar sus preferencias básicas</li>
                      </ul>
                    </div>

                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-xl font-medium text-foreground mb-3">1.2 Cookies de Rendimiento</h3>
                      <p className="text-muted-foreground mb-3">
                        Nos ayudan a entender cómo interactúa con nuestro sitio web.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                        <li><strong>Analytics:</strong> Medir el tráfico y uso del sitio</li>
                        <li><strong>Errores:</strong> Identificar y corregir problemas técnicos</li>
                        <li><strong>Rendimiento:</strong> Optimizar la velocidad del sitio</li>
                      </ul>
                    </div>

                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-xl font-medium text-foreground mb-3">1.3 Cookies de Funcionalidad</h3>
                      <p className="text-muted-foreground mb-3">
                        Mejoran su experiencia recordando sus preferencias.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                        <li><strong>Idioma:</strong> Recordar su idioma preferido</li>
                        <li><strong>Tema:</strong> Mantener su preferencia de tema (claro/oscuro)</li>
                        <li><strong>Configuración:</strong> Recordar configuraciones personalizadas</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">2. Cookies de Terceros</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>También utilizamos servicios de terceros que pueden establecer cookies:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Google Analytics:</strong> Para análisis de tráfico web</li>
                      <li><strong>Stripe:</strong> Para procesamiento de pagos</li>
                      <li><strong>Supabase:</strong> Para servicios de backend y autenticación</li>
                      <li><strong>Vercel:</strong> Para hosting y análisis de rendimiento</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">3. Duración de las Cookies</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Las cookies se almacenan durante diferentes períodos:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Cookies de sesión:</strong> Se eliminan al cerrar el navegador</li>
                      <li><strong>Cookies persistentes:</strong> Permanecen hasta su fecha de expiración</li>
                      <li><strong>Cookies de autenticación:</strong> Hasta que cierre sesión o expiren</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">4. Gestión de Cookies</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Puede gestionar las cookies de varias maneras:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Configuración del navegador:</strong> Modificar la configuración de cookies</li>
                      <li><strong>Panel de preferencias:</strong> Gestionar cookies desde nuestro sitio</li>
                      <li><strong>Eliminación manual:</strong> Borrar cookies específicas</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">5. Configuración por Navegador</h2>
                  <div className="space-y-4">
                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-lg font-medium text-foreground mb-3">Chrome</h3>
                      <p className="text-muted-foreground">
                        Configuración → Privacidad y seguridad → Cookies y otros datos del sitio
                      </p>
                    </div>
                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-lg font-medium text-foreground mb-3">Firefox</h3>
                      <p className="text-muted-foreground">
                        Opciones → Privacidad y seguridad → Cookies y datos del sitio
                      </p>
                    </div>
                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-lg font-medium text-foreground mb-3">Safari</h3>
                      <p className="text-muted-foreground">
                        Preferencias → Privacidad → Cookies y datos del sitio web
                      </p>
                    </div>
                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-lg font-medium text-foreground mb-3">Edge</h3>
                      <p className="text-muted-foreground">
                        Configuración → Cookies y permisos del sitio → Cookies y datos del sitio
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">6. Impacto de Deshabilitar Cookies</h2>
                  <div className="bg-warning/5 p-6 rounded-xl border border-warning/20">
                    <div className="flex items-start gap-4">
                      <Eye className="w-8 h-8 text-warning flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Consideraciones Importantes
                        </h3>
                        <p className="text-muted-foreground mb-3">
                          Si deshabilita las cookies, algunas funcionalidades pueden no funcionar correctamente:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                          <li>No podrá iniciar sesión en la plataforma</li>
                          <li>Las preferencias no se recordarán</li>
                          <li>Algunas funciones pueden estar limitadas</li>
                          <li>La experiencia de usuario puede verse afectada</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">7. Actualizaciones de esta Política</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Podemos actualizar esta política de cookies ocasionalmente para reflejar cambios 
                    en nuestras prácticas o por otras razones operativas, legales o reglamentarias. 
                    Los cambios se publicarán en esta página.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">8. Contacto</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Si tiene preguntas sobre nuestra política de cookies, puede contactarnos en:
                  </p>
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Email</h4>
                        <p className="text-muted-foreground">
                          privacy@witar.es
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Teléfono</h4>
                        <p className="text-muted-foreground">
                          +34 900 000 000
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">9. Enlaces Útiles</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Para más información sobre cookies, puede visitar:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>
                        <a href="https://www.allaboutcookies.org" className="text-primary hover:underline">
                          All About Cookies
                        </a>
                      </li>
                      <li>
                        <a href="https://www.youronlinechoices.com" className="text-primary hover:underline">
                          Your Online Choices
                        </a>
                      </li>
                      <li>
                        <a href="https://www.aepd.es" className="text-primary hover:underline">
                          Agencia Española de Protección de Datos
                        </a>
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PoliticaCookies; 