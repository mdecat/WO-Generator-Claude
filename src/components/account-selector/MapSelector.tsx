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
} from '@fluentui/react-icons';
import L from 'leaflet';
// Bundle Leaflet CSS directly — required for D365 web resource (no external CDN)
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { getAllAccountsForMap } from '../../api/accountApi';
import { useGeneratorStore } from '../../store/generatorStore';
import type { ServiceAccount } from '../../types/fieldService';

// Fix Leaflet default icon URLs broken by bundlers
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

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

export function MapSelector({ orgUrl }: MapSelectorProps) {
  const styles = useStyles();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const drawnLayersRef = useRef<L.FeatureGroup | null>(null);
  const polygonHandlerRef = useRef<L.Draw.Polygon | null>(null);
  const rectangleHandlerRef = useRef<L.Draw.Rectangle | null>(null);

  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<GeoJSON.Feature | null>(null);
  const [activeDrawTool, setActiveDrawTool] = useState<'polygon' | 'rectangle' | null>(null);

  const store = useGeneratorStore();
  const selectedAccounts = store.selectedAccounts;

  const isSelected = useCallback(
    (accountId: string) => selectedAccounts.some((a) => a.accountid === accountId),
    [selectedAccounts]
  );

  // Initialize the map
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

    // Drawn items layer
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnLayersRef.current = drawnItems;

    // Programmatic draw handlers — avoids relying on leaflet-draw toolbar sprite images
    const shapeOptions = { color: '#0078D4', weight: 2, opacity: 0.8, fillOpacity: 0.15 };
    polygonHandlerRef.current = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions,
    } as unknown as L.DrawOptions.PolygonOptions);
    rectangleHandlerRef.current = new L.Draw.Rectangle(map, {
      shapeOptions,
    } as unknown as L.DrawOptions.RectangleOptions);

    // Handle shape creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const created = e as L.DrawEvents.Created;
      drawnItems.clearLayers();
      drawnItems.addLayer(created.layer);
      const geojson = created.layer.toGeoJSON() as GeoJSON.Feature;
      setDrawnPolygon(geojson);
      setActiveDrawTool(null);
    });

    leafletMapRef.current = map;

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

    // Clear existing markers
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
      // Cancel active tool
      polygonHandlerRef.current?.disable();
      rectangleHandlerRef.current?.disable();
      setActiveDrawTool(null);
    } else {
      polygonHandlerRef.current?.disable();
      rectangleHandlerRef.current?.disable();
      if (tool === 'polygon') polygonHandlerRef.current?.enable();
      else rectangleHandlerRef.current?.enable();
      setActiveDrawTool(tool);
    }
  };

  const clearDraw = () => {
    polygonHandlerRef.current?.disable();
    rectangleHandlerRef.current?.disable();
    setActiveDrawTool(null);
    drawnLayersRef.current?.clearLayers();
    setDrawnPolygon(null);
    store.clearAccountSelection();
  };

  const clearAll = clearDraw;

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
          onClick={clearAll}
          disabled={store.selectedAccounts.length === 0}
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
        {drawnPolygon && (
          <Button appearance="subtle" size="small" icon={<DismissCircleRegular />} onClick={clearDraw}>
            Clear Shape
          </Button>
        )}
        {activeDrawTool && (
          <Text size={200} style={{ color: '#0078D4', fontStyle: 'italic' }}>
            Click on the map to place points. Double-click to finish.
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
                Polygon active
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
