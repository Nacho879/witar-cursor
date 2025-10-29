import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X, MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMapModal = ({ isOpen, onClose, location }) => {
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid por defecto
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (location && location.lat && location.lng) {
      setMapCenter([location.lat, location.lng]);
      setZoom(15); // Zoom más cercano para ubicación específica
    }
  }, [location]);

  if (!isOpen) return null;

  const handleOpenInMaps = () => {
    if (location && location.lat && location.lng) {
      const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
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
                Ubicación del Fichaje
              </h3>
              {location && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Lat: {location.lat?.toFixed(6)}, Lng: {location.lng?.toFixed(6)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {location && location.lat && location.lng && (
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
        <div className="h-[calc(100%-80px)]">
          {location && location.lat && location.lng ? (
            <MapContainer
              center={mapCenter}
              zoom={zoom}
              style={{ height: '100%', width: '100%' }}
              className="rounded-b-xl"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[location.lat, location.lng]}>
                <Popup>
                  <div className="text-center">
                    <MapPin className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <p className="font-semibold">Ubicación del Fichaje</p>
                    <p className="text-sm text-gray-600">
                      {new Date(location.timestamp || Date.now()).toLocaleString('es-ES')}
                    </p>
                    {location.accuracy && (
                      <p className="text-xs text-gray-500">
                        Precisión: ±{Math.round(location.accuracy)}m
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
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
        {location && location.lat && location.lng && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Latitud:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">{location.lat?.toFixed(6)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Longitud:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">{location.lng?.toFixed(6)}</span>
              </div>
              {location.accuracy && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Precisión:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">±{Math.round(location.accuracy)}m</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationMapModal;
