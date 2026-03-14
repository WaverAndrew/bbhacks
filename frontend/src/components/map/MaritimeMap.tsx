"use client";

import { useEffect, useRef, useState } from "react";
import type { Ship } from "@/lib/types";
import L from "leaflet";

const STATUS_COLORS: Record<string, string> = {
  underway: "#00ff88",
  anchored: "#ffaa00",
  incident: "#ff3366",
};

function createShipIcon(ship: Ship) {
  const color = STATUS_COLORS[ship.status] ?? "#00d4ff";
  const rotation = ship.heading;
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `
      <div style="position:relative;width:32px;height:32px;">
        <div class="ship-marker-ring" style="position:absolute;inset:0;border:2px solid ${color};border-radius:50%;opacity:0.4;"></div>
        <svg viewBox="0 0 32 32" style="position:absolute;inset:0;transform:rotate(${rotation}deg);">
          <polygon points="16,4 24,26 16,22 8,26" fill="${color}" opacity="0.85" stroke="${color}" stroke-width="0.5"/>
        </svg>
        ${ship.status === "incident" ? `<div style="position:absolute;inset:-4px;border:2px solid #ff3366;border-radius:50%;animation:ship-pulse 1s ease-in-out infinite;"></div>` : ""}
      </div>
    `,
  });
}

type Props = {
  ships: Ship[];
  selectedShip: Ship | null;
  onSelectShip: (ship: Ship | null) => void;
};

export default function MaritimeMap({ ships, selectedShip, onSelectShip }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, {
      center: [26.56, 56.25],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 18,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    leafletMap.current = map;
    setReady(true);

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!ready || !markersRef.current) return;
    markersRef.current.clearLayers();

    ships.forEach((ship) => {
      const marker = L.marker(ship.position, { icon: createShipIcon(ship) });
      marker.on("click", () => onSelectShip(ship));
      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;background:#0d1526;color:#c8d6e5;border:1px solid #1a2744;padding:6px 8px;border-radius:3px;line-height:1.5;">
          <div style="color:#00d4ff;font-weight:bold;">${ship.name}</div>
          <div>${ship.routeName}</div>
          <div style="color:${STATUS_COLORS[ship.status]}">${ship.status.toUpperCase()} · ${ship.speed} kn</div>
        </div>`,
        { direction: "top", offset: [0, -16], className: "leaflet-tooltip-custom", opacity: 1 }
      );
      markersRef.current!.addLayer(marker);
    });
  }, [ships, ready, onSelectShip]);

  // Show selected route
  useEffect(() => {
    if (!ready || !routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (selectedShip) {
      const color = STATUS_COLORS[selectedShip.status] ?? "#00d4ff";
      // Full route dashed
      L.polyline(selectedShip.path, {
        color,
        weight: 2,
        opacity: 0.3,
        dashArray: "8, 6",
      }).addTo(routeLayerRef.current);

      // Traveled portion solid
      const shipIdx = selectedShip.path.findIndex(
        (p) =>
          Math.abs(p[0] - selectedShip.position[0]) < 0.5 &&
          Math.abs(p[1] - selectedShip.position[1]) < 0.5
      );
      if (shipIdx >= 0) {
        const traveled = selectedShip.path.slice(0, shipIdx + 1);
        traveled.push(selectedShip.position);
        L.polyline(traveled, {
          color,
          weight: 3,
          opacity: 0.7,
        }).addTo(routeLayerRef.current);
      }

      // Waypoint dots
      selectedShip.path.forEach((p, i) => {
        L.circleMarker(p, {
          radius: 3,
          color,
          fillColor: color,
          fillOpacity: i === 0 || i === selectedShip.path.length - 1 ? 0.9 : 0.3,
          weight: 1,
        }).addTo(routeLayerRef.current!);
      });

      // Pan to ship
      leafletMap.current?.flyTo(selectedShip.position, 8, { duration: 0.8 });
    }
  }, [selectedShip, ready]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
