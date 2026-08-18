import { useCallback, useEffect, useMemo, useState } from 'react';
import { initialAiProviderConfig } from './ai/catalog';
import { BottomPanel } from './components/BottomPanel';
import { ChatPanel } from './components/ChatPanel';
import { LayerPanel } from './components/LayerPanel';
import { MapPanel } from './components/MapPanel';
import { TopBar } from './components/TopBar';
import { initialFloodLayers, type RemoteFloodLayerId } from './flood/catalog';
import { initialCommunityLayers, type RemoteCommunityLayerId } from './community/catalog';
import {
  initialIncident,
  initialResultRows,
  initialSources,
} from './data/mockData';
import { askHazardQuestion, getDashboardData } from './services/api';
import type {
  AiProviderConfig,
  BasemapId,
  ChatMessage,
  ProviderDescriptor,
  ResultRow,
  SourceReference,
} from './types';

function nowLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(date);
}

const initialProvider: ProviderDescriptor = {
  name: 'mock',
  label: 'Connecting data provider',
  mutable: false,
  source: 'Initial browser state',
};

export default function App() {
  const [incident, setIncident] = useState(initialIncident);
  const [provider, setProvider] = useState<ProviderDescriptor>(initialProvider);
  const [rows, setRows] = useState<ResultRow[]>(initialResultRows);
  const [sources, setSources] = useState<SourceReference[]>(initialSources);
  const [confidence, setConfidence] = useState('Frontend preview');
  const [aiConfig, setAiConfig] = useState<AiProviderConfig>(initialAiProviderConfig);
  const aiPreviewMode = import.meta.env.VITE_AI_FRONTEND_PREVIEW !== 'false';
  const [selectedTime, setSelectedTime] = useState('now');
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [basemap, setBasemap] = useState<BasemapId>('tdot');
  const [basemapOpacity, setBasemapOpacity] = useState(0.96);
  const [floodLayers, setFloodLayers] = useState(initialFloodLayers);
  const [communityLayers, setCommunityLayers] = useState(initialCommunityLayers);
  const [fitBounds, setFitBounds] = useState<[
    number,
    number,
    number,
    number,
  ]>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState(new Date());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Frontend preview ready. Choose an AI provider above, then test the HazardWeave question-answering experience. Live model routing will be connected after the interface is approved.',
      timestamp: nowLabel(),
    },
  ]);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getDashboardData();
      setRows(data.rows);
      setSources(data.sources);
      setIncident(data.incident);
      setProvider(data.provider);
      setGeneratedAt(new Date(data.generatedAt));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const lastUpdated = useMemo(() => nowLabel(generatedAt), [generatedAt]);

  const toggleFloodLayer = (id: RemoteFloodLayerId) => {
    setFloodLayers((current) =>
      current.map((layer) =>
        layer.id === id ? { ...layer, enabled: !layer.enabled } : layer,
      ),
    );
  };

  const changeFloodOpacity = (id: RemoteFloodLayerId, opacity: number) => {
    setFloodLayers((current) =>
      current.map((layer) =>
        layer.id === id ? { ...layer, opacity } : layer,
      ),
    );
  };

  const toggleCommunityLayer = (id: RemoteCommunityLayerId) => {
    setCommunityLayers((current) =>
      current.map((layer) =>
        layer.id === id ? { ...layer, enabled: !layer.enabled } : layer,
      ),
    );
  };

  const changeCommunityOpacity = (id: RemoteCommunityLayerId, opacity: number) => {
    setCommunityLayers((current) =>
      current.map((layer) =>
        layer.id === id ? { ...layer, opacity } : layer,
      ),
    );
  };

  const askQuestion = async (question: string) => {
    setError(null);
    setLoading(true);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        timestamp: nowLabel(),
      },
    ]);

    try {
      const response = await askHazardQuestion(
        question,
        {
          incidentId: incident.id,
          selectedTime,
          selectedCounty,
        },
        {
          previewMode: aiPreviewMode,
          provider: aiConfig.provider,
          modelId: aiConfig.modelId,
        },
      );

      if (aiPreviewMode) {
        setConfidence('Frontend preview');
      } else {
        setRows(response.rows);
        setSources(response.sources);
        setConfidence(`${response.confidence} confidence`);
        if (response.provider) setProvider(response.provider);

        response.mapActions.forEach((action) => {
          if (action.type === 'fit_bounds' && action.bounds) {
            setFitBounds(action.bounds);
          }
        });
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.answer,
          timestamp: nowLabel(),
        },
      ]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unknown error.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <TopBar
        lastUpdated={lastUpdated}
        provider={provider}
        refreshing={refreshing}
        onRefresh={() => void loadDashboard()}
      />

      <div className="dashboard-grid">
        <LayerPanel
          selectedTime={selectedTime}
          selectedCounty={selectedCounty}
          basemap={basemap}
          basemapOpacity={basemapOpacity}
          floodLayers={floodLayers}
          communityLayers={communityLayers}
          onTimeChange={setSelectedTime}
          onCountyChange={setSelectedCounty}
          onBasemapChange={setBasemap}
          onBasemapOpacityChange={setBasemapOpacity}
          onFloodToggle={toggleFloodLayer}
          onFloodOpacityChange={changeFloodOpacity}
          onCommunityToggle={toggleCommunityLayer}
          onCommunityOpacityChange={changeCommunityOpacity}
        />

        <MapPanel
          incidentName={incident.name}
          incidentDescription={incident.description}
          selectedTime={selectedTime}
          fitBounds={fitBounds}
          basemap={basemap}
          basemapOpacity={basemapOpacity}
          floodLayers={floodLayers}
          communityLayers={communityLayers}
        />

        <ChatPanel
          messages={messages}
          sources={sources}
          confidence={confidence}
          loading={loading}
          error={error}
          aiConfig={aiConfig}
          previewMode={aiPreviewMode}
          onAiConfigChange={setAiConfig}
          onAsk={askQuestion}
        />
      </div>

      <BottomPanel rows={rows} />
    </div>
  );
}
