"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { kindLabels, type PublicCase } from "@/lib/data";

function centerFor(cases: PublicCase[]): [number, number] {
  if (!cases.length) return [10.4806, -66.9036];
  const lat = cases.reduce((sum, item) => sum + item.lat, 0) / cases.length;
  const lng = cases.reduce((sum, item) => sum + item.lng, 0) / cases.length;
  return [lat, lng];
}

function clusteredIcon(count: number) {
  return L.divIcon({
    html: `<span>${count}</span>`,
    className: "vj-cluster",
    iconSize: L.point(48, 48, true),
  });
}

function markerIcon(item: PublicCase) {
  return L.divIcon({
    html: `<span>${item.signals.confirmed}</span>`,
    className: `vj-marker ${item.kind}`,
    iconSize: L.point(34, 34, true),
  });
}

function ClusterLayer({ cases }: { cases: PublicCase[] }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 13,
      maxClusterRadius: 58,
      iconCreateFunction: (cluster) => clusteredIcon(cluster.getChildCount()),
    });

    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    group.clearLayers();
    const bounds = L.latLngBounds([]);
    cases.forEach((item) => {
      const marker = L.marker([item.lat, item.lng], { icon: markerIcon(item), title: item.title });
      marker.bindPopup(`
        <strong>${item.title}</strong><br />
        ${kindLabels[item.kind]} · ${item.zone}<br />
        <a href="/casos/${item.slug}">Ver ficha</a>
      `);
      group.addLayer(marker);
      bounds.extend([item.lat, item.lng]);
    });

    if (cases.length > 1) map.fitBounds(bounds.pad(0.22), { animate: false, maxZoom: 10 });
    if (cases.length === 1) map.setView([cases[0].lat, cases[0].lng], 12, { animate: false });
  }, [cases, map]);

  return null;
}

export default function LeafletCaseMap({ cases, compact }: { cases: PublicCase[]; compact?: boolean }) {
  return (
    <MapContainer
      center={centerFor(cases)}
      zoom={compact ? 9 : 10}
      scrollWheelZoom
      wheelPxPerZoomLevel={90}
      className="leaflet-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClusterLayer cases={cases} />
    </MapContainer>
  );
}
