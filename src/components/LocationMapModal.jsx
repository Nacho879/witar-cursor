import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X, MapPin, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMapModal = ({ isOpen, onClose, location, locations = null }) => {
  // Si se pasa locations (array), usar ese array, sino usar location (objeto único)
  const allLocations = locations && locations.length > 0 ? locations : (location ? [location] : []);
  
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Fallback inicial
  const [zoom, setZoom] = useState(15);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentLocation = allLocations[currentIndex] || null;

  useEffect(() => {
    // Cuando se abre el modal, centrar en la primera ubicación disponible
    if (isOpen && allLocations.length > 0) {
      const firstLocation = allLocations[0];
      if (firstLocation && firstLocation.lat && firstLocation.lng) {
        setMapCenter([firstLocation.lat, firstLocation.lng]);
        setZoom(15);
        setCurrentIndex(0);
      }
    }
  }, [isOpen, allLocations]);

  useEffect(() => {
    // Cuando cambia la ubicación actual (navegación con flechas), centrar el mapa
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      setMapCenter([currentLocation.lat, currentLocation.lng]);
      setZoom(15);
    }
  }, [currentIndex, currentLocation]);

  const handlePrevious = () => {
    if (allLocations.length > 0) {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allLocations.length - 1));
    }
  };

  const handleNext = () => {
    if (allLocations.length > 0) {
      setCurrentIndex((prev) => (prev < allLocations.length - 1 ? prev + 1 : 0));
    }
  };

  if (!isOpen) return null;

  const handleOpenInMaps = () => {
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      const url = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[90vw] h-[80vh] max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ubicación{allLocations.length > 1 ? 'es' : ''} del Fichaje{allLocations.length > 1 ? 's' : ''}
              </h3>
              {currentLocation && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Lat: {currentLocation.lat?.toFixed(6)}, Lng: {currentLocation.lng?.toFixed(6)}
                    </p>
                    {allLocations.length > 1 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({currentIndex + 1} de {allLocations.length})
                      </span>
                    )}
                  </div>
                  {currentLocation.entryType && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        currentLocation.entryType === 'clock_in' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        currentLocation.entryType === 'clock_out' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        currentLocation.entryType === 'break_start' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {currentLocation.entryType === 'clock_in' ? 'Entrada' :
                         currentLocation.entryType === 'clock_out' ? 'Salida' :
                         currentLocation.entryType === 'break_start' ? 'Inicio Pausa' :
                         currentLocation.entryType === 'break_end' ? 'Fin Pausa' :
                         currentLocation.entryType}
                      </span>
                      {currentLocation.timestamp && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(currentLocation.timestamp).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Navegación con flechas si hay múltiples ubicaciones */}
            {allLocations.length > 1 && (
              <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg">
                <button
                  onClick={handlePrevious}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg transition-colors"
                  title="Ubicación anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-x border-gray-300 dark:border-gray-600">
                  {currentIndex + 1} / {allLocations.length}
                </div>
                <button
                  onClick={handleNext}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg transition-colors"
                  title="Siguiente ubicación"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {currentLocation && currentLocation.lat && currentLocation.lng && (
              <button
                onClick={handleOpenInMaps}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Abrir en Maps
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-[calc(100%-80px)] relative">
          {currentLocation && currentLocation.lat && currentLocation.lng ? (
            <MapContainer
              key={`map-${isOpen}-${currentLocation.lat}-${currentLocation.lng}-${currentIndex}`}
              center={[currentLocation.lat, currentLocation.lng]}
              zoom={zoom}
              style={{ height: '100%', width: '100%' }}
              className="rounded-b-xl"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Mostrar todos los marcadores, pero destacar el actual */}
              {allLocations.map((loc, idx) => (
                <Marker 
                  key={idx}
                  position={[loc.lat, loc.lng]}
                  opacity={idx === currentIndex ? 1 : 0.5}
                >
                  <Popup>
                    <div className="text-center min-w-[200px]">
                      <MapPin className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <p className="font-semibold mb-2">
                        {idx === currentIndex && <span className="text-blue-600">📍 Actual</span>}
                        {idx !== currentIndex && `Ubicación ${idx + 1}`}
                      </p>
                      {loc.entryType && (
                        <div className="mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            loc.entryType === 'clock_in' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            loc.entryType === 'clock_out' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            loc.entryType === 'break_start' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {loc.entryType === 'clock_in' ? '🟢 Entrada' :
                             loc.entryType === 'clock_out' ? '🔴 Salida' :
                             loc.entryType === 'break_start' ? '🟡 Inicio Pausa' :
                             loc.entryType === 'break_end' ? '🔵 Fin Pausa' :
                             loc.entryType}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 font-medium">
                        {new Date(loc.timestamp || Date.now()).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                      {loc.accuracy && (
                        <p className="text-xs text-gray-500 mt-1">
                          Precisión: ±{Math.round(loc.accuracy)}m
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">Sin ubicación GPS</p>
                <p className="text-sm">Este fichaje no tiene coordenadas de ubicación</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con información adicional */}
        {currentLocation && currentLocation.lat && currentLocation.lng && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Latitud:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">{currentLocation.lat?.toFixed(6)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Longitud:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">{currentLocation.lng?.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                {currentLocation.accuracy && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Precisión:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">±{Math.round(currentLocation.accuracy)}m</span>
                  </div>
                )}
                {currentLocation.timestamp && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(currentLocation.timestamp).toLocaleString('es-ES')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationMapModal;
