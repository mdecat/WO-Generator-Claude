import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Button,
  Text,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  LocationRegular,
  SelectAllOnRegular,
  DismissCircleRegular,
  ShapesRegular,
  RectangleLandscapeRegular,
  DismissRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import L from 'leaflet';
// Bundle Leaflet CSS directly — required for D365 web resource (no external CDN)
import 'leaflet/dist/leaflet.css';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon as turfPolygon } from '@turf/helpers';
import { getAllAccountsForMap } from '../../api/accountApi';
import { useGeneratorStore } from '../../store/generatorStore';
import type { ServiceAccount } from '../../types/fieldService';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  mapToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  mapContainer: {
    width: '100%',
    height: '480px',
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 1000,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    boxShadow: tokens.shadow8,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '160px',
  },
  legend: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  legendDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    verticalAlign: 'middle',
    marginRight: '4px',
  },
});

interface MapSelectorProps {
  orgUrl?: string;
}

const SHAPE_STYLE = { color: '#0078D4', weight: 2, opacity: 0.8, fillOpacity: 0.15 };
const VERTEX_STYLE = { radius: 6, fillColor: '#0078D4', color: '#004578', weight: 2, fillOpacity: 1, opacity: 1 };
const FIRST_VERTEX_STYLE = { radius: 8, fillColor: '#D13438', color: '#8E0000', weight: 2, fillOpacity: 1, opacity: 1 };

export function MapSelector({ orgUrl }: MapSelectorProps) {
  const styles = useStyles();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const drawnLayersRef = useRef<L.FeatureGroup | null>(null);

  // Shared draw mode ref (readable inside Leaflet event handlers)
  const activeDrawToolRef = useRef<'polygon' | 'rectangle' | null>(null);

  // Custom polygon: click to add vertices, button to finish
  const polyPointsRef = useRef<L.LatLng[]>([]);
  const polyVertexMarkersRef = useRef<L.CircleMarker[]>([]);
  const polyLineRef = useRef<L.Polyline | null>(null);

  // Custom rectangle: two-click corner selection
  const rectCorner1Ref = useRef<L.LatLng | null>(null);
  const rectMarkerRef = useRef<L.CircleMarker | null>(null);

  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<GeoJSON.Feature | null>(null);
  const [activeDrawTool, setActiveDrawTool] = useState<'polygon' | 'rectangle' | null>(null);
  const [polyVertexCount, setPolyVertexCount] = useState(0);
  const [rectFirstCornerPlaced, setRectFirstCornerPlaced] = useState(false);

  const store = useGeneratorStore();
  const selectedAccounts = store.selectedAccounts;

  // Keep ref in sync with state so Leaflet click handler (set up once) can read current mode
  useEffect(() => {
    activeDrawToolRef.current = activeDrawTool;
  }, [activeDrawTool]);

  const isSelected = useCallback(
    (accountId: string) => selectedAccounts.some((a) => a.accountid === accountId),
    [selectedAccounts]
  );

  // Helpers to clean up in-progress draw state
  const clearPolyDraw = useCallback(() => {
    const map = leafletMapRef.current;
    polyPointsRef.current = [];
    setPolyVertexCount(0);
    polyVertexMarkersRef.current.forEach((m) => m.remove());
    polyVertexMarkersRef.current = [];
    if (polyLineRef.current) { polyLineRef.current.remove(); polyLineRef.current = null; }
    if (map) map.getContainer().style.cursor = '';
  }, []);

  const clearRectDraw = useCallback(() => {
    rectCorner1Ref.current = null;
    setRectFirstCornerPlaced(false);
    if (rectMarkerRef.current) { rectMarkerRef.current.remove(); rectMarkerRef.current = null; }
  }, []);

  // Finish the custom polygon — called by "Finish Drawing" button
  const finishPolygon = useCallback(() => {
    const pts = polyPointsRef.current;
    if (pts.length < 3) return;

    const map = leafletMapRef.current;
    const drawnItems = drawnLayersRef.current;
    if (!map || !drawnItems) return;

    // Build closed ring
    const ring = [...pts, pts[0]];
    const coords: [number, number][] = ring.map((p) => [p.lng, p.lat]);
    const geojson = turfPolygon([coords]) as GeoJSON.Feature;

    // Draw polygon on map
    const poly = L.polygon(pts.map((p) => [p.lat, p.lng] as [number, number]), SHAPE_STYLE);
    drawnItems.clearLayers();
    drawnItems.addLayer(poly);

    setDrawnPolygon(geojson);
    clearPolyDraw();
    setActiveDrawTool(null);
  }, [clearPolyDraw]);

  // Initialize the map once
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Try to zoom to user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 10),
        () => { /* permission denied or unavailable — keep default USA view */ }
      );
    }

    // Layer for completed shapes
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnLayersRef.current = drawnItems;

    // Unified click handler for both polygon and rectangle drawing
    map.on('click', (e: L.LeafletMouseEvent) => {
      const mode = activeDrawToolRef.current;

      if (mode === 'polygon') {
        const pts = polyPointsRef.current;
        pts.push(e.latlng);
        setPolyVertexCount(pts.length);

        // First vertex — red marker so user can identify starting point
        const vertexStyle = pts.length === 1 ? FIRST_VERTEX_STYLE : VERTEX_STYLE;
        const vm = L.circleMarker(e.latlng, vertexStyle).addTo(map);
        polyVertexMarkersRef.current.push(vm);

        // Update preview polyline
        if (polyLineRef.current) polyLineRef.current.remove();
        if (pts.length >= 2) {
          polyLineRef.current = L.polyline(pts.map((p) => [p.lat, p.lng] as [number, number]), {
            color: '#0078D4', weight: 2, opacity: 0.8, dashArray: '5,5',
          }).addTo(map);
        }
      } else if (mode === 'rectangle') {
        if (!rectCorner1Ref.current) {
          // First click — store corner 1
          rectCorner1Ref.current = e.latlng;
          setRectFirstCornerPlaced(true);
          rectMarkerRef.current = L.circleMarker(e.latlng, VERTEX_STYLE).addTo(map);
        } else {
          // Second click — build and complete rectangle
          const bounds = L.latLngBounds(rectCorner1Ref.current, e.latlng);
          const rect = L.rectangle(bounds, SHAPE_STYLE);
          drawnItems.clearLayers();
          if (rectMarkerRef.current) { rectMarkerRef.current.remove(); rectMarkerRef.current = null; }
          drawnItems.addLayer(rect);

          const geojson = rect.toGeoJSON() as GeoJSON.Feature;
          setDrawnPolygon(geojson);
          rectCorner1Ref.current = null;
          setRectFirstCornerPlaced(false);
          setActiveDrawTool(null);
        }
      }
    });

    leafletMapRef.current = map;

    // Recalculate map dimensions after container is fully laid out in D365 iframe
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load accounts for map display
  useEffect(() => {
    async function loadAccounts() {
      setLoading(true);
      setError(null);
      try {
        const accts = await getAllAccountsForMap(store.queryFilters, orgUrl);
        setAccounts(accts);
      } catch (err) {
        setError(`Failed to load accounts: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgUrl]);

  // Render markers on the map
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || accounts.length === 0) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const bounds: [number, number][] = [];

    accounts.forEach((account) => {
      const lat = account.address1_latitude;
      const lng = account.address1_longitude;
      if (!lat || !lng) return;

      const selected = isSelected(account.accountid);
      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: selected ? '#0078D4' : '#A19F9D',
        color: selected ? '#004578' : '#605E5C',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8,
      });

      marker.bindTooltip(
        `<strong>${account.name}</strong><br>${account.address1_city ?? ''}, ${account.address1_stateorprovince ?? ''}`,
        { sticky: true }
      );

      marker.on('click', () => {
        store.toggleAccountSelected(account);
      });

      marker.addTo(map);
      markersRef.current.set(account.accountid, marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // Update marker colors when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, accountId) => {
      const selected = isSelected(accountId);
      marker.setStyle({
        fillColor: selected ? '#0078D4' : '#A19F9D',
        color: selected ? '#004578' : '#605E5C',
      });
    });
  }, [isSelected, selectedAccounts]);

  // Select accounts within drawn polygon
  useEffect(() => {
    if (!drawnPolygon) return;

    const inPolygon = accounts.filter((account) => {
      if (!account.address1_latitude || !account.address1_longitude) return false;
      const pt = point([account.address1_longitude, account.address1_latitude]);
      try {
        return booleanPointInPolygon(pt, drawnPolygon as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>);
      } catch {
        return false;
      }
    });

    store.setSelectedAccounts(inPolygon);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnPolygon, accounts]);

  const startDraw = (tool: 'polygon' | 'rectangle') => {
    if (activeDrawTool === tool) {
      // Toggle off — cancel current draw
      clearPolyDraw();
      clearRectDraw();
      setActiveDrawTool(null);
    } else {
      // Cancel any previous draw and start new
      clearPolyDraw();
      clearRectDraw();
      setActiveDrawTool(tool);
      const map = leafletMapRef.current;
      if (map) map.getContainer().style.cursor = 'crosshair';
    }
  };

  const clearDraw = () => {
    clearPolyDraw();
    clearRectDraw();
    setActiveDrawTool(null);
    drawnLayersRef.current?.clearLayers();
    setDrawnPolygon(null);
    store.clearAccountSelection();
    const map = leafletMapRef.current;
    if (map) map.getContainer().style.cursor = '';
  };

  const selectAllVisible = () => {
    store.setSelectedAccounts(accounts);
  };

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.mapToolbar}>
        {loading && <Spinner size="tiny" label="Loading accounts..." />}
        {!loading && (
          <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
            <LocationRegular style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            {accounts.length} accounts with coordinates
          </Text>
        )}
        <Badge appearance="filled" color="brand">
          {store.selectedAccounts.length} selected
        </Badge>
        <Button
          appearance="subtle"
          size="small"
          icon={<SelectAllOnRegular />}
          onClick={selectAllVisible}
          disabled={accounts.length === 0}
        >
          Select All
        </Button>
        <Button
          appearance="subtle"
          size="small"
          icon={<DismissCircleRegular />}
          onClick={clearDraw}
          disabled={store.selectedAccounts.length === 0 && !drawnPolygon && activeDrawTool === null}
        >
          Clear Selection
        </Button>
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {/* Draw tools */}
      <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', alignItems: 'center' }}>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Draw area to select:</Text>
        <Button
          appearance={activeDrawTool === 'polygon' ? 'primary' : 'outline'}
          size="small"
          icon={activeDrawTool === 'polygon' ? <DismissRegular /> : <ShapesRegular />}
          onClick={() => startDraw('polygon')}
          disabled={accounts.length === 0}
        >
          {activeDrawTool === 'polygon' ? 'Cancel Drawing' : 'Freehand Polygon'}
        </Button>
        <Button
          appearance={activeDrawTool === 'rectangle' ? 'primary' : 'outline'}
          size="small"
          icon={activeDrawTool === 'rectangle' ? <DismissRegular /> : <RectangleLandscapeRegular />}
          onClick={() => startDraw('rectangle')}
          disabled={accounts.length === 0}
        >
          {activeDrawTool === 'rectangle' ? 'Cancel Drawing' : 'Rectangle'}
        </Button>
        {drawnPolygon && activeDrawTool === null && (
          <Button appearance="subtle" size="small" icon={<DismissCircleRegular />} onClick={clearDraw}>
            Clear Shape
          </Button>
        )}
        {activeDrawTool === 'polygon' && (
          <>
            <Button
              appearance="primary"
              size="small"
              icon={<CheckmarkRegular />}
              onClick={finishPolygon}
              disabled={polyVertexCount < 3}
            >
              Finish Drawing ({polyVertexCount} pts)
            </Button>
            <Text size={200} style={{ color: '#0078D4', fontStyle: 'italic' }}>
              {polyVertexCount === 0
                ? 'Click on the map to place vertices. Red dot = starting point.'
                : polyVertexCount < 3
                ? `${polyVertexCount} point${polyVertexCount > 1 ? 's' : ''} placed — need at least 3 to finish.`
                : `${polyVertexCount} points — click Finish Drawing to close the polygon.`}
            </Text>
          </>
        )}
        {activeDrawTool === 'rectangle' && (
          <Text size={200} style={{ color: '#0078D4', fontStyle: 'italic' }}>
            {rectFirstCornerPlaced ? 'Now click the opposite corner.' : 'Click the first corner on the map.'}
          </Text>
        )}
      </div>

      {/* Map */}
      <div className={styles.mapContainer}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        {/* Overlay stats */}
        {!loading && accounts.length > 0 && (
          <div className={styles.mapOverlay}>
            <Text size={200} weight="semibold">Selection</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {store.selectedAccounts.length} of {accounts.length} accounts
            </Text>
            {drawnPolygon && (
              <Text size={100} style={{ color: '#0078D4' }}>
                Shape active
              </Text>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: '#0078D4' }} />
          Selected
        </span>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: '#A19F9D' }} />
          Not selected
        </span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
          Click markers to toggle · Draw polygon to select area
        </span>
      </div>
    </div>
  );
}
