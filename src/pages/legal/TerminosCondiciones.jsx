import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

const TerminosCondiciones = () => {
  return (
    <>
      <Helmet>
        <title>Términos y Condiciones - Witar</title>
        <meta name="description" content="Términos y condiciones de uso de la plataforma Witar para la gestión de recursos humanos." />
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
                Términos y Condiciones
              </h1>
              
              <div className="text-sm text-muted-foreground mb-8">
                Última actualización: 20 de Enero de 2025
              </div>

              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">1. Aceptación de los Términos</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Al acceder y utilizar la plataforma Witar ("el Servicio"), usted acepta estar sujeto a estos Términos y Condiciones ("Términos"). Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro Servicio.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">2. Descripción del Servicio</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Witar es una plataforma de gestión de recursos humanos que incluye:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Control horario y gestión de fichajes</li>
                    <li>Gestión de vacaciones y ausencias</li>
                    <li>Almacenamiento y gestión de documentos laborales</li>
                    <li>Reportes y analytics de recursos humanos</li>
                    <li>Gestión de equipos y departamentos</li>
                    <li>Herramientas de comunicación interna</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">3. Cuentas de Usuario</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Para utilizar el Servicio, debe crear una cuenta proporcionando información precisa y completa. Usted es responsable de:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Mantener la confidencialidad de su contraseña</li>
                      <li>Todas las actividades que ocurran bajo su cuenta</li>
                      <li>Notificar inmediatamente cualquier uso no autorizado</li>
                      <li>Proporcionar información actualizada y precisa</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">4. Uso Aceptable</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Usted se compromete a utilizar el Servicio únicamente para fines legales y de acuerdo con estos Términos. Está prohibido:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Usar el Servicio para actividades ilegales o fraudulentas</li>
                    <li>Intentar acceder no autorizado a sistemas o datos</li>
                    <li>Interferir con el funcionamiento del Servicio</li>
                    <li>Transmitir virus, malware o código dañino</li>
                    <li>Violar derechos de propiedad intelectual</li>
                    <li>Compartir credenciales de acceso con terceros</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">5. Privacidad y Datos</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Su privacidad es importante para nosotros. El uso de la información personal está regido por nuestra Política de Privacidad, que forma parte de estos Términos.
                    </p>
                    <p>
                      Usted es responsable de cumplir con todas las leyes de protección de datos aplicables, incluyendo el RGPD, al utilizar el Servicio para procesar datos de empleados.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">6. Facturación y Pagos</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Los precios del Servicio están disponibles en nuestra página de precios. Los pagos se facturan por adelantado y son no reembolsables, excepto según lo dispuesto en estos Términos.
                    </p>
                    <p>
                      Nos reservamos el derecho de modificar los precios con 30 días de anticipación. Los cambios se comunicarán por email.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">7. Disponibilidad del Servicio</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos la disponibilidad ininterrumpida. Podemos realizar mantenimiento programado con notificación previa.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">8. Propiedad Intelectual</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    El Servicio y su contenido son propiedad de Witar y están protegidos por leyes de propiedad intelectual. Se le otorga una licencia limitada, no exclusiva y revocable para usar el Servicio.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitación de Responsabilidad</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    En ningún caso Witar será responsable por daños indirectos, incidentales, especiales o consecuentes que surjan del uso del Servicio.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">10. Terminación</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Puede cancelar su cuenta en cualquier momento desde la configuración de su perfil. Nos reservamos el derecho de suspender o terminar cuentas que violen estos Términos.
                    </p>
                    <p>
                      Tras la terminación, sus datos se eliminarán según nuestra Política de Privacidad.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">11. Modificaciones</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios se notificarán por email y entrarán en vigor 30 días después de la notificación.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">12. Ley Aplicable</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Estos Términos se rigen por las leyes de España. Cualquier disputa se resolverá en los tribunales de Madrid, España.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contacto</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Si tiene preguntas sobre estos Términos, puede contactarnos en:
                  </p>
                  <div className="bg-card p-4 rounded-lg border border-border mt-4">
                    <p className="text-foreground">
                      <strong>Email:</strong> legal@witar.es<br />
                      <strong>Dirección:</strong> Madrid, España<br />
                      <strong>Teléfono:</strong> +34 900 000 000
                    </p>
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

export default TerminosCondiciones; 