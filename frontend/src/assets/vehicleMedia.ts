// Add only photographs verified against the exact vehicle or exact brand/model.
// Place owned/licensed images in public/assets/vehicles and reference their /assets/... URL.
// Empty by design: backend seeds contain no vehicles and have no media identifiers.
export const vehicleMedia: {
  byId: Record<string, { src: string; alt: string }>;
  byModel: Record<string, { src: string; alt: string }>;
} = { byId: {}, byModel: {} };
export const editorialHero = "/assets/backgrounds/atelier-road.jpg";
