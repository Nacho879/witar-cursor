import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, ShieldCheck, Eye, Database, Lock } from 'lucide-react';

const PoliticaPrivacidad = () => {
  return (
    <>
      <Helmet>
        <title>Política de Privacidad - Witar</title>
        <meta name="description" content="Política de privacidad de Witar. Información sobre cómo recopilamos, usamos y protegemos sus datos personales." />
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
                Política de Privacidad
              </h1>
              
              <div className="text-sm text-muted-foreground mb-8">
                Última actualización: 20 de Enero de 2025
              </div>

              <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 mb-8">
                <div className="flex items-start gap-4">
                  <ShieldCheck className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Compromiso con la Privacidad
                    </h3>
                    <p className="text-muted-foreground">
                      En Witar, nos tomamos muy en serio la protección de sus datos personales. 
                      Esta política describe cómo recopilamos, usamos y protegemos su información.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">1. Información que Recopilamos</h2>
                  
                  <h3 className="text-xl font-medium text-foreground mb-3">1.1 Información que nos proporciona</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
                    <li>Información de contacto (nombre, email, teléfono)</li>
                    <li>Información de la empresa (nombre, dirección, CIF)</li>
                    <li>Datos de empleados (nombre, email, departamento, cargo)</li>
                    <li>Documentos laborales subidos a la plataforma</li>
                    <li>Registros de fichaje y horarios</li>
                    <li>Solicitudes de vacaciones y ausencias</li>
                  </ul>

                  <h3 className="text-xl font-medium text-foreground mb-3">1.2 Información recopilada automáticamente</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Datos de uso de la plataforma</li>
                    <li>Información del dispositivo y navegador</li>
                    <li>Dirección IP y datos de geolocalización</li>
                    <li>Cookies y tecnologías similares</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">2. Cómo Usamos su Información</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Utilizamos su información para:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Proporcionar y mantener el servicio de Witar</li>
                      <li>Gestionar su cuenta y autenticación</li>
                      <li>Procesar fichajes y control horario</li>
                      <li>Gestionar solicitudes de vacaciones</li>
                      <li>Almacenar y organizar documentos laborales</li>
                      <li>Generar reportes y analytics</li>
                      <li>Enviar comunicaciones importantes del servicio</li>
                      <li>Mejorar y personalizar la experiencia del usuario</li>
                      <li>Cumplir con obligaciones legales</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">3. Base Legal para el Tratamiento</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Procesamos sus datos basándonos en:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Consentimiento:</strong> Para comunicaciones de marketing</li>
                      <li><strong>Ejecución del contrato:</strong> Para proporcionar el servicio</li>
                      <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios</li>
                      <li><strong>Obligación legal:</strong> Para cumplir con normativas laborales</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">4. Compartir Información</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>No vendemos, alquilamos ni compartimos su información personal con terceros, excepto:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Con su consentimiento explícito</li>
                      <li>Con proveedores de servicios que nos ayudan a operar (hosting, email, etc.)</li>
                      <li>Para cumplir con obligaciones legales</li>
                      <li>Para proteger nuestros derechos y seguridad</li>
                      <li>En caso de fusión o adquisición empresarial</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">5. Seguridad de Datos</h2>
                  <div className="bg-success/5 p-6 rounded-xl border border-success/20">
                    <div className="flex items-start gap-4">
                      <Lock className="w-8 h-8 text-success flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Protección de Datos
                        </h3>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                          <li>Encriptación de datos en tránsito y en reposo</li>
                          <li>Acceso restringido a datos personales</li>
                          <li>Monitoreo continuo de seguridad</li>
                          <li>Copias de seguridad regulares</li>
                          <li>Cumplimiento con estándares de seguridad</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">6. Sus Derechos</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Según el RGPD, tiene los siguientes derechos:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Acceso:</strong> Solicitar información sobre sus datos</li>
                      <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
                      <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos</li>
                      <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
                      <li><strong>Limitación:</strong> Restringir el procesamiento</li>
                      <li><strong>Oposición:</strong> Oponerse al procesamiento</li>
                      <li><strong>Retirada del consentimiento:</strong> Revocar consentimientos dados</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">7. Retención de Datos</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Conservamos sus datos durante el tiempo necesario para:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Proporcionar nuestros servicios</li>
                      <li>Cumplir con obligaciones legales</li>
                      <li>Resolver disputas</li>
                      <li>Hacer cumplir nuestros acuerdos</li>
                    </ul>
                    <p>
                      Los datos se eliminan automáticamente tras la cancelación de la cuenta, 
                      excepto cuando la retención es necesaria por motivos legales.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">8. Cookies y Tecnologías Similares</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>Utilizamos cookies para:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Mantener su sesión activa</li>
                      <li>Recordar sus preferencias</li>
                      <li>Analizar el uso de la plataforma</li>
                      <li>Mejorar la funcionalidad</li>
                    </ul>
                    <p>
                      Puede gestionar las cookies desde la configuración de su navegador.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">9. Transferencias Internacionales</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Sus datos se procesan principalmente en la Unión Europea. Si es necesario 
                    transferir datos fuera del EEE, garantizamos que se apliquen las medidas 
                    de protección adecuadas según el RGPD.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">10. Menores de Edad</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Nuestro servicio no está dirigido a menores de 16 años. No recopilamos 
                    intencionalmente información personal de menores. Si cree que hemos 
                    recopilado información de un menor, contáctenos inmediatamente.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">11. Cambios en esta Política</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Podemos actualizar esta política ocasionalmente. Los cambios importantes 
                    se notificarán por email y se publicarán en esta página. Le recomendamos 
                    revisar esta política periódicamente.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contacto</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Si tiene preguntas sobre esta política o desea ejercer sus derechos, 
                    puede contactarnos en:
                  </p>
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Responsable del Tratamiento</h4>
                        <p className="text-muted-foreground">
                          <strong>Witar S.L.</strong><br />
                          Madrid, España<br />
                          CIF: B12345678
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Contacto</h4>
                        <p className="text-muted-foreground">
                          <strong>Email:</strong> privacy@witar.es<br />
                          <strong>Teléfono:</strong> +34 900 000 000<br />
                          <strong>Dirección:</strong> Madrid, España
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">13. Autoridad de Control</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Si considera que el tratamiento de sus datos personales no se ajusta a 
                    la normativa vigente, puede presentar una reclamación ante la 
                    <a href="https://www.aepd.es" className="text-primary hover:underline"> Agencia Española de Protección de Datos</a>.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PoliticaPrivacidad; 