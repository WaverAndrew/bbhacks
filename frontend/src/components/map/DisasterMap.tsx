"use client";

import { useEffect, useRef, useState } from "react";
import type { Property, DisasterZone } from "@/lib/types";
import L from "leaflet";

const DAMAGE_COLORS: Record<string, string> = {
  none: "#00ff88",
  minor: "#ffaa00",
  moderate: "#ff8800",
  severe: "#ff3366",
  destroyed: "#cc0033",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "rgba(255,170,0,0.08)",
  medium: "rgba(255,136,0,0.12)",
  high: "rgba(255,51,102,0.15)",
  critical: "rgba(204,0,51,0.2)",
};

const SEVERITY_BORDER: Record<string, string> = {
  low: "rgba(255,170,0,0.3)",
  medium: "rgba(255,136,0,0.4)",
  high: "rgba(255,51,102,0.5)",
  critical: "rgba(204,0,51,0.6)",
};

function createPropertyIcon(prop: Property) {
  const color = DAMAGE_COLORS[prop.damageLevel] ?? "#00d4ff";
  const isPaid = prop.claimStatus === "claim_paid";
  const isPending = prop.claimStatus === "pending";
  const size = prop.damageLevel === "destroyed" ? 14 : prop.damageLevel === "severe" ? 12 : 10;
  return L.divIcon({
    className: "",
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    html: `
      <div style="position:relative;width:${size * 2}px;height:${size * 2}px;">
        <div style="position:absolute;inset:0;background:${color};opacity:0.25;border-radius:2px;transform:rotate(45deg);"></div>
        <div style="position:absolute;inset:3px;background:${color};opacity:0.7;border-radius:1px;transform:rotate(45deg);border:1px solid ${color};"></div>
        ${isPaid ? `<div style="position:absolute;top:-4px;right:-4px;width:8px;height:8px;background:#00ff88;border-radius:50%;border:1px solid #0a0f1a;"></div>` : ""}
        ${isPending ? `<div style="position:absolute;top:-4px;right:-4px;width:8px;height:8px;background:#ffaa00;border-radius:50;border:1px solid #0a0f1a;animation:ship-pulse 1.5s ease-in-out infinite;"></div>` : ""}
      </div>
    `,
  });
}

type Props = {
  properties: Property[];
  zones: DisasterZone[];
  selectedProperty: Property | null;
  onSelectProperty: (prop: Property | null) => void;
};

export default function DisasterMap({ properties, zones, selectedProperty, onSelectProperty }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const zonesRef = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, {
      center: [18.45, -66.10],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 18,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    zonesRef.current = L.layerGroup().addTo(map);
    leafletMap.current = map;
    setReady(true);
    return () => { map.remove(); leafletMap.current = null; };
  }, []);

  // Draw disaster zones
  useEffect(() => {
    if (!ready || !zonesRef.current) return;
    zonesRef.current.clearLayers();
    zones.forEach((z) => {
      L.circle(z.center, {
        radius: z.radius,
        color: SEVERITY_BORDER[z.severity],
        fillColor: SEVERITY_COLORS[z.severity],
        fillOpacity: 1,
        weight: 1,
        dashArray: "6, 4",
      })
        .bindTooltip(
          `<div style="font-family:monospace;font-size:11px;background:#0d1526;color:#c8d6e5;border:1px solid #1a2744;padding:6px 8px;border-radius:3px;">
            <div style="color:#ff3366;font-weight:bold;">${z.name}</div>
            <div>Type: ${z.type} · Severity: ${z.severity.toUpperCase()}</div>
          </div>`,
          { direction: "center", className: "leaflet-tooltip-custom", opacity: 1 }
        )
        .addTo(zonesRef.current!);
    });
  }, [zones, ready]);

  // Draw property markers
  useEffect(() => {
    if (!ready || !markersRef.current) return;
    markersRef.current.clearLayers();
    properties.forEach((prop) => {
      const marker = L.marker(prop.position, { icon: createPropertyIcon(prop) });
      marker.on("click", () => onSelectProperty(prop));
      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;background:#0d1526;color:#c8d6e5;border:1px solid #1a2744;padding:6px 8px;border-radius:3px;line-height:1.5;">
          <div style="color:#00d4ff;font-weight:bold;">${prop.address}</div>
          <div style="color:${DAMAGE_COLORS[prop.damageLevel]}">Damage: ${prop.damageLevel.toUpperCase()}</div>
          <div>Insured: $${Number(prop.insuredAmount).toLocaleString()}</div>
        </div>`,
        { direction: "top", offset: [0, -10], className: "leaflet-tooltip-custom", opacity: 1 }
      );
      markersRef.current!.addLayer(marker);
    });
  }, [properties, ready, onSelectProperty]);

  // Pan to selected
  useEffect(() => {
    if (!ready || !selectedProperty) return;
    leafletMap.current?.flyTo(selectedProperty.position, 15, { duration: 0.6 });
  }, [selectedProperty, ready]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
