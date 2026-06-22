"use client";

import React, { useEffect, useRef, useState } from "react";
import { SuspectProfile } from "../lib/types";
import { MapPin, Calendar, Clock, AlertTriangle, FileText, Download, Printer } from "lucide-react";

interface LocationMapProps {
  suspect: SuspectProfile;
}

export default function LocationMap({ suspect }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Section 91 Form fields
  const [officerName, setOfficerName] = useState("Inspector K. Raghavan");
  const [badgeNumber, setBadgeNumber] = useState("CY-8902");
  const [stationName, setStationName] = useState("Cyber Crime Police Station, Bengaluru City");
  const [authorityName, setAuthorityName] = useState("IRCTC Nodal Officer / Uber India Security Office");
  const [showLetterPreview, setShowLetterPreview] = useState(false);

  // Initialize Leaflet Map inside useEffect to prevent SSR compile crash
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let map: any;

    const initMap = async () => {
      try {
        const L = await import("leaflet");
        
        // Reset old map instance if existing
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Suspect center coordinates (e.g. Bangalore)
        const centerLat = (suspect.locations || [])[0]?.lat || 12.9716;
        const centerLng = (suspect.locations || [])[0]?.lng || 77.5946;

        map = L.map(mapContainerRef.current!, {
          center: [centerLat, centerLng],
          zoom: 6,
          zoomControl: true,
          attributionControl: false
        });

        // Apply OpenStreetMap tiles. In globals.css we configured a filter to turn it dark!
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapLoaded(true);

        // Plot markers and build route lines
        const pathCoords: [number, number][] = [];
        
        // Leaflet custom marker icons fix
        const DefaultIcon = L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const AlertIcon = L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        L.Marker.prototype.options.icon = DefaultIcon;

        (suspect.locations || []).forEach((loc) => {
          pathCoords.push([loc.lat, loc.lng]);
          
          const markerIcon = loc.crimeMatched ? AlertIcon : DefaultIcon;
          const popupHtml = `
            <div class="font-mono text-xs p-1 text-slate-200" style="min-width: 180px;">
              <span class="font-bold text-white uppercase block mb-1">${loc.locationName}</span>
              <span class="text-slate-400 block text-[9px] mb-1">Date: ${loc.date}</span>
              <span class="text-slate-300 block text-[9px] mb-1">${loc.details}</span>
              <span class="text-blue-400 block text-[9px] mb-2">Source: ${loc.source.toUpperCase()}</span>
              ${loc.crimeMatched ? `
                <div class="mt-2 pt-2 border-t border-rose-950 text-[9px] text-rose-400 font-bold">
                  ⚠️ Crime scene proximity:
                  <span class="block text-rose-300 font-normal mt-0.5">${loc.crimeMatched.title}</span>
                </div>
              ` : ''}
            </div>
          `;

          const marker = L.marker([loc.lat, loc.lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(popupHtml);
        });

        // Draw connecting polyline representing movement route
        if (pathCoords.length > 1) {
          L.polyline(pathCoords, {
            color: "#3b82f6",
            weight: 3,
            dashArray: "6, 8",
            opacity: 0.75
          }).addTo(map);

          // Fit bounds
          map.fitBounds(L.polyline(pathCoords).getBounds(), { padding: [40, 40] });
        }

      } catch (err) {
        console.error("Leaflet initialization failed:", err);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [suspect]);

  // Section 91 CrPC Letter template rendering
  const handlePrintLetter = () => {
    const printContent = document.getElementById("section-91-letter-print");
    if (!printContent) return;
    
    const win = window.open("", "_blank");
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Section 91 CrPC Requisition Letter</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.5; color: #111; }
            .header { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 25px; text-transform: uppercase; }
            .reference { margin-top: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; }
            .content { text-align: justify; margin-bottom: 25px; font-size: 14px; }
            .signature { margin-top: 50px; float: right; width: 250px; font-size: 14px; }
            .legal-tag { font-size: 10px; color: #777; text-align: center; margin-top: 100px; border-t: 1px solid #ccc; padding-top: 10px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Columns: Map & Geotag Details */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        
        {/* Map Header */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              Location Geotag Timeline & Routing
            </h4>
          </div>
          <span className="text-[10px] text-slate-650 font-bold font-mono">Dynamic OSINT coordinates mapping</span>
        </div>

        {/* Map and timeline layout or empty state */}
        {(suspect.locations || []).length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 bg-white shadow-sm font-mono flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <MapPin className="w-8 h-8 text-slate-500 mb-3 animate-pulse" />
            <p className="text-sm text-slate-600 font-medium">No public geotag locations discovered for this profile.</p>
          </div>
        ) : (
          <>
            {/* Map Node element */}
            <div className="w-full h-[380px] rounded-2xl border border-slate-250 bg-slate-50 overflow-hidden relative shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full z-10" />
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 z-20 font-mono text-xs text-slate-650 font-bold">
                  Initializing spatial mapping data...
                </div>
              )}
            </div>

            {/* Location Trace Timeline list */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h5 className="text-xs font-bold text-ink font-mono uppercase mb-4 tracking-wider">
                Chronological Geotag Trace
              </h5>
              <div className="space-y-4">
                {(suspect.locations || []).map((loc, idx) => {
                  const isAlert = !!loc.crimeMatched;
                  return (
                    <div 
                      key={idx}
                      className={`flex items-start gap-4 p-3 bg-slate-50 border rounded-xl transition-all shadow-sm ${
                        isAlert ? "border-rose-250 bg-rose-50 hover:border-rose-350" : "border-slate-200 hover:border-slate-350 hover:bg-white"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isAlert ? "bg-rose-50 border border-rose-200 text-rose-700" : "bg-blue-50 border border-blue-200 text-blue-700"
                      }`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 font-mono text-xs">
                        <div className="flex items-center justify-between mb-1 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink text-xs">{loc.locationName}</span>
                            {isAlert && (
                              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase">
                                Crime Proximity Correlation
                              </span>
                            )}
                          </div>
                          <span className="text-slate-650 font-bold text-[10px] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" /> {loc.date}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium text-[11px] mb-1">{loc.details}</p>
                        {isAlert && (
                          <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg mb-2 text-rose-900 text-[10px] leading-relaxed font-semibold">
                            <span className="font-bold block mb-0.5 text-rose-800">⚠️ Nearby Crime Scene Match:</span>
                            {loc.crimeMatched?.title} (FIR Date: {loc.crimeMatched?.date})
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-[10px] text-slate-600 font-semibold">
                          <span>Source: <span className="text-blue-700 font-bold">{loc.source.toUpperCase()}</span></span>
                          <span>Coordinates: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Column: Private Records Request Generator */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
                Section 91 CrPC Request
              </h4>
            </div>

            <p className="text-[11px] text-slate-700 font-medium font-mono leading-relaxed mb-6">
              Private data manifests (flight passengers, train reservations, FASTag tolls) are not open-source. Use this module to auto-generate the statutory CrPC Section 91 data request letter to served organizations.
            </p>

            {/* Config fields */}
            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[10px] text-slate-750 font-bold block mb-1">Served Service Authority</label>
                <input
                  type="text"
                  value={authorityName}
                  onChange={(e) => setAuthorityName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-ink focus:outline-none focus:border-blue-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)] font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-750 font-bold block mb-1">Requesting Officer Name</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-ink focus:outline-none focus:border-blue-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)] font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-750 font-bold block mb-1">Badge & Registry ID</label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-ink focus:outline-none focus:border-blue-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)] font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-750 font-bold block mb-1">Assigned Station Cell</label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-ink focus:outline-none focus:border-blue-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)] font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col gap-2">
            <button
              onClick={() => setShowLetterPreview(true)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 shadow-lg glow-blue transition-all"
            >
              <FileText className="w-4 h-4" /> Draft Statutory Requisition
            </button>
          </div>

        </div>
      </div>

      {/* Requisition modal overlay */}
      {showLetterPreview && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col h-[85vh]">
            
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 font-mono text-xs text-slate-500">
              <span>LEGAL DEPARTMENT DRAFT REQUISITION</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrintLetter}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button 
                  onClick={() => setShowLetterPreview(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Letter content for rendering */}
            <div className="flex-1 overflow-y-auto pr-2" id="section-91-letter-print">
              <div className="header" style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginBottom: "25px", textTransform: "uppercase" }}>
                OFFICE OF THE CYBER CRIME INVESTIGATION CELL<br />
                {stationName}
              </div>

              <div className="reference" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "20px" }}>
                <div><strong>Ref No:</strong> SEC91/KA/{suspect.caseReference.replace("SHIELD-2026-", "")}</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString("en-IN")}</div>
              </div>

              <div style={{ fontSize: "13px", marginBottom: "20px" }}>
                <strong>TO,</strong><br />
                The Nodal Officer / Authorized Legal Custodian,<br />
                {authorityName}<br />
                India Office.
              </div>

              <div className="content" style={{ fontSize: "13px", textAlign: "justify", lineHeight: "1.6", marginBottom: "30px" }}>
                <p style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: "15px" }}>
                  SUBJECT: REQUISITION UNDER SECTION 91 OF CODE OF CRIMINAL PROCEDURE, 1973 (CrPC) FOR PRODUCTION OF TRAVEL MANIFESTS AND TRANSACTION LOGS OF SUSPECT {suspect.realName.toUpperCase()}.
                </p>
                <p>
                  This office is currently investigating a cybercrime register reference case involving financial irregularities, cheating, and money laundering under <strong>FIR reference {suspect.caseReference}</strong>.
                </p>
                <p>
                  During active Open Source Intelligence (OSINT) sweeps, digital footprints verified that the suspect, <strong>{suspect.realName}</strong> (using handle <strong>{suspect.username}</strong>), traveled across state boundaries. For the purpose of establishing a verified travel itinerary, you are hereby requested to provide:
                </p>
                <ol>
                  <li>Complete travel listings, ticket reservations, passenger manifest registers, and check-in times associated with phone identifier <strong>{suspect.phoneNumber}</strong> and email <strong>{suspect.emailAddress}</strong>.</li>
                  <li>FASTag toll transactions log registry and geolocation hits for vehicles registered or linked to suspect profiles.</li>
                  <li>IP addresses and browser telemetry logs recorded during the transaction window from May 1, 2026 to June 8, 2026.</li>
                </ol>
                <p>
                  Please treat this as urgent. The requested information may be handed over to the bearer of this letter or transmitted securely via government encrypted channels within 48 hours of receipt.
                </p>
              </div>

              <div className="signature" style={{ float: "right", textAlign: "left", fontSize: "13px", marginTop: "30px" }}>
                Yours faithfully,<br /><br /><br /><br />
                ___________________________<br />
                <strong>{officerName}</strong><br />
                Badge ID: {badgeNumber}<br />
                {stationName}
              </div>

              <div className="legal-tag" style={{ fontSize: "10px", color: "#888", textAlign: "center", marginTop: "150px", borderTop: "1px solid #ddd", paddingTop: "10px", clear: "both" }}>
                CONFIDENTIALITY WARNING: The contents of this requisition letter are legally protected under cybersecurity guidelines. Unauthorized exposure is punishable under the IT Act 2000.
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
