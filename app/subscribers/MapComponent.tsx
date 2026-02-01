// app/subscribers/MapComponent.tsx
'use client';

import { useEffect, useRef } from 'react';

const COLORS = {
  primary: '#249E94',
  primaryHover: '#1E8A7F',
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
};

interface School {
  id: string;
  schoolName: string;
  logo?: string;
  address: string;
  schoolId: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  contactNumber?: string;
  principal?: string;
}

interface MapComponentProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School | null) => void;
  isMobile: boolean;
}

export default function MapComponent({ schools, selectedSchool, onSelectSchool, isMobile }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const L = (await import('leaflet')).default;
        
        if (typeof document !== 'undefined') {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!isMounted) return;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const phBounds = L.latLngBounds(
          L.latLng(4.2, 116.0),  // Southwest - very strict
          L.latLng(21.2, 126.8)  // Northeast - very strict
        );

        const map = L.map(mapRef.current, {
          center: [12.8797, 121.7740],
          zoom: 6,
          minZoom: 6,
          maxZoom: 18,
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: false,
          maxBounds: phBounds,
          maxBoundsViscosity: 1.0,
          zoomSnap: 0.5,
          zoomDelta: 0.5
        });

        mapInstanceRef.current = map;

        // Match page background color
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '',
          subdomains: 'abcd',
          maxZoom: 20,
          bounds: phBounds,
          minZoom: 6
        }).addTo(map);

        const createIcon = (logo: string, isSelected: boolean = false) => {
          return L.divIcon({
            className: 'pin-marker',
            html: `
              <div class="pin ${isSelected ? 'active' : ''}">
                <div class="pin-glow"></div>
                <div class="pin-head">
                  <img src="${logo || '/logo.png'}" onerror="this.src='/logo.png'" />
                </div>
              </div>
            `,
            iconSize: [40, 50],
            iconAnchor: [20, 50],
          });
        };

        schools.forEach((school) => {
          const marker = L.marker([school.latitude, school.longitude], {
            icon: createIcon(school.logo || '/logo.png'),
            title: school.schoolName,
          });

          marker.on('click', () => {
            onSelectSchool(school);
            markersRef.current.forEach((m, idx) => {
              m.setIcon(createIcon(schools[idx].logo || '/logo.png', schools[idx].id === school.id));
            });
            map.flyTo([school.latitude, school.longitude], 12, { duration: 1.0 });
          });

          marker.addTo(map);
          markersRef.current.push(marker);
        });

      } catch (error) {
        console.error('Map error:', error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, [schools]);

  useEffect(() => {
    if (schools.length > 0 && markersRef.current.length > 0) {
      const L = require('leaflet');
      markersRef.current.forEach((marker, idx) => {
        const isSelected = selectedSchool?.id === schools[idx].id;
        marker.setIcon(L.divIcon({
          className: 'pin-marker',
          html: `
            <div class="pin ${isSelected ? 'active' : ''}">
              <div class="pin-glow"></div>
              <div class="pin-head">
                <img src="${schools[idx].logo || '/logo.png'}" onerror="this.src='/logo.png'" />
              </div>
            </div>
          `,
          iconSize: [40, 50],
          iconAnchor: [20, 50],
        }));
      });
    }
  }, [selectedSchool, schools]);

  return (
    <>
      {/* MAP - NO BOX, floating on background */}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }} 
      />
      
      {/* SMALL Stat Card */}
      {selectedSchool && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: `2px solid ${COLORS.primary}`,
          borderRadius: '16px',
          padding: '20px',
          boxShadow: `0 20px 40px rgba(0, 0, 0, 0.7)`,
          zIndex: 1000,
          width: '280px',
          backdropFilter: 'blur(16px)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {/* Simple X button - no red hover */}
          <button
            onClick={() => onSelectSchool(null)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: 'transparent',
              color: COLORS.textSecondary,
              border: 'none',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'color 0.2s',
              fontSize: '20px',
              fontWeight: 'normal',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = COLORS.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = COLORS.textSecondary;
            }}
          >
            ×
          </button>

          {/* Logo & Name */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: 'rgba(36, 158, 148, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${COLORS.primary}`,
              boxShadow: `0 0 20px ${COLORS.primary}40`
            }}>
              <img 
                src={selectedSchool.logo || '/logo.png'}
                alt={selectedSchool.schoolName}
                style={{ width: '42px', height: '42px', objectFit: 'contain' }}
              />
            </div>
            
            <div style={{ textAlign: 'center', width: '100%' }}>
              <h3 style={{ 
                fontSize: '15px', 
                fontWeight: '700', 
                color: COLORS.textPrimary,
                margin: '0 0 6px 0',
                lineHeight: '1.3'
              }}>
                {selectedSchool.schoolName}
              </h3>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: `${COLORS.primary}30`,
                padding: '3px 10px',
                borderRadius: '6px'
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: COLORS.primary,
                  animation: 'blink 2s infinite'
                }} />
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '600',
                  color: COLORS.textPrimary,
                  textTransform: 'uppercase'
                }}>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Info - Simple, no boxes */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px'
          }}>
            {/* School ID */}
            <div>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '600', 
                color: COLORS.primary,
                textTransform: 'uppercase', 
                marginBottom: '4px'
              }}>
                School ID
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: COLORS.textPrimary,
                fontWeight: '600',
                fontFamily: 'monospace'
              }}>
                {selectedSchool.schoolId}
              </div>
            </div>

            {/* Address */}
            <div>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '600', 
                color: COLORS.primary,
                textTransform: 'uppercase', 
                marginBottom: '4px'
              }}>
                Address
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: COLORS.textPrimary,
                lineHeight: '1.4'
              }}>
                {selectedSchool.address}
              </div>
            </div>

            {/* Date Started */}
            <div>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '600', 
                color: COLORS.primary,
                textTransform: 'uppercase', 
                marginBottom: '4px'
              }}>
                Date Started
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: COLORS.textPrimary,
                fontWeight: '600'
              }}>
                {selectedSchool.createdAt}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .pin-marker {
          background: none !important;
          border: none !important;
        }

        .pin {
          position: relative;
          width: 40px;
          height: 50px;
          transition: all 0.3s ease;
        }

        .pin.active {
          transform: scale(1.3);
          z-index: 999;
        }

        .pin-glow {
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 26px;
          height: 26px;
          background: ${COLORS.primary};
          border-radius: 50%;
          opacity: 0.5;
          animation: glow 2.5s ease-in-out infinite;
        }

        .pin.active .pin-glow {
          width: 36px;
          height: 36px;
          opacity: 0.7;
        }

        @keyframes glow {
          0%, 100% { 
            transform: translateX(-50%) scale(1); 
            opacity: 0.5; 
          }
          50% { 
            transform: translateX(-50%) scale(1.7); 
            opacity: 0; 
          }
        }

        .pin-head {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 40px;
          height: 40px;
          background: ${COLORS.primary};
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: translateX(-50%) rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .pin.active .pin-head {
          background: ${COLORS.primaryHover};
          box-shadow: 0 12px 36px rgba(36, 158, 148, 0.9);
          border-width: 4px;
        }

        .pin-head:hover {
          transform: translateX(-50%) rotate(-45deg) scale(1.15);
        }

        .pin-head img {
          width: 24px;
          height: 24px;
          transform: rotate(45deg);
          object-fit: contain;
        }

        /* MAP background EXACTLY matches page - invisible box! */
        .leaflet-container {
          background: #0F172A !important;
          font-family: inherit !important;
        }

        /* Map tiles - ONLY show PH map, hide the rest */
        .leaflet-tile-pane {
          filter: 
            brightness(1.2) 
            contrast(1.2) 
            saturate(1.5) 
            hue-rotate(160deg);
          opacity: 1;
        }

        /* Hide the dark background of tiles - blend with page */
        .leaflet-tile {
          background: transparent !important;
        }

        .leaflet-control-zoom {
          border: 1px solid ${COLORS.primary}50 !important;
          border-radius: 10px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6) !important;
        }

        .leaflet-control-zoom a {
          background: rgba(15, 23, 42, 0.95) !important;
          color: ${COLORS.textPrimary} !important;
          border: none !important;
          border-bottom: 1px solid ${COLORS.primary}25 !important;
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          font-size: 22px !important;
          backdrop-filter: blur(10px);
        }

        .leaflet-control-zoom a:hover {
          background: ${COLORS.primary} !important;
        }

        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }

        .leaflet-control-attribution {
          display: none !important;
        }

        /* Remove ALL borders */
        .leaflet-container,
        .leaflet-pane,
        .leaflet-tile-container {
          border: none !important;
          outline: none !important;
        }
      `}}/>
    </>
  );
}