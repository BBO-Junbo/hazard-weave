import type { DashboardPayload } from './contracts';

export const mockDashboardPayload: DashboardPayload = {
  layers: [
    {
      id: 'flood',
      name: 'Prototype flood probability',
      description: 'Illustrative demo layer — not an official flood product',
      enabled: false,
      opacity: 0.48,
    },
    {
      id: 'vulnerability',
      name: 'Community vulnerability',
      description: 'Illustrative social vulnerability areas',
      enabled: true,
      opacity: 0.28,
    },
    {
      id: 'facilities',
      name: 'Critical facilities',
      description: 'Hospitals, shelters and care facilities',
      enabled: true,
      opacity: 0.95,
    },
    {
      id: 'incidents',
      name: 'Recent incidents',
      description: 'Illustrative road and flooding reports',
      enabled: true,
      opacity: 0.9,
    },
  ],
  map: {
    floodZones: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { probability: 0.82, label: 'High probability' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-84.05, 35.89],
              [-83.95, 35.89],
              [-83.91, 35.96],
              [-83.99, 36.01],
              [-84.07, 35.97],
              [-84.05, 35.89],
            ]],
          },
        },
        {
          type: 'Feature',
          properties: { probability: 0.66, label: 'Moderate probability' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-83.93, 35.98],
              [-83.82, 35.96],
              [-83.78, 36.04],
              [-83.87, 36.08],
              [-83.95, 36.04],
              [-83.93, 35.98],
            ]],
          },
        },
      ],
    },
    vulnerabilityAreas: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { score: 0.79, community: 'North River' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-84.01, 35.96],
              [-83.93, 35.96],
              [-83.91, 36.03],
              [-83.99, 36.04],
              [-84.01, 35.96],
            ]],
          },
        },
        {
          type: 'Feature',
          properties: { score: 0.68, community: 'East Creek' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-83.91, 35.91],
              [-83.82, 35.92],
              [-83.81, 35.98],
              [-83.9, 35.98],
              [-83.91, 35.91],
            ]],
          },
        },
      ],
    },
    facilities: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Regional Medical Centre', type: 'Hospital', status: 'Open' },
          geometry: { type: 'Point', coordinates: [-83.934, 35.961] },
        },
        {
          type: 'Feature',
          properties: { name: 'Northside Care Home', type: 'Care facility', status: 'Review' },
          geometry: { type: 'Point', coordinates: [-83.987, 36.006] },
        },
        {
          type: 'Feature',
          properties: { name: 'East Community Shelter', type: 'Shelter', status: 'Open' },
          geometry: { type: 'Point', coordinates: [-83.846, 35.969] },
        },
      ],
    },
    incidents: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { type: 'Road flooding', severity: 'High', reportedAt: '17:05' },
          geometry: { type: 'Point', coordinates: [-83.974, 35.945] },
        },
        {
          type: 'Feature',
          properties: { type: 'Debris', severity: 'Moderate', reportedAt: '16:48' },
          geometry: { type: 'Point', coordinates: [-83.867, 36.018] },
        },
        {
          type: 'Feature',
          properties: { type: 'Water level rising', severity: 'Moderate', reportedAt: '16:35' },
          geometry: { type: 'Point', coordinates: [-84.013, 35.985] },
        },
      ],
    },
  },
  rows: [
    {
      id: 'north-river',
      name: 'North River',
      risk: 'High',
      exposedPopulation: 4280,
      primaryReason: 'High flood probability and elevated vulnerability',
    },
    {
      id: 'east-creek',
      name: 'East Creek',
      risk: 'Moderate',
      exposedPopulation: 2710,
      primaryReason: 'Road access and facility exposure',
    },
    {
      id: 'south-bank',
      name: 'South Bank',
      risk: 'Low',
      exposedPopulation: 940,
      primaryReason: 'Limited projected inundation',
    },
  ],
  sources: [
    {
      name: 'Illustrative flood probability layer',
      validTime: '28 July 2026, 17:00 EDT',
      modelVersion: 'demo-flood-v0.1',
    },
    {
      name: 'Illustrative community vulnerability layer',
      validTime: 'Prototype dataset',
      modelVersion: 'demo-svi-v0.1',
    },
  ],
  incident: {
    id: 'active-demo-event',
    name: 'East Tennessee flood pilot',
    description: 'Illustrative data for interface and provider development',
    validTime: '28 July 2026, 17:00 EDT',
  },
};
