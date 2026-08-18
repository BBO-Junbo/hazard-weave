import { useMemo, useState, type KeyboardEvent } from 'react';
import { aiProviderOptions, getAiProviderOption } from '../ai/catalog';
import type { AiProviderConfig, AiProviderId, ChatMessage, SourceReference } from '../types';
import { ChevronDownIcon, DatabaseIcon, SendIcon, SparklesIcon } from './Icons';

interface ChatPanelProps {
  messages: ChatMessage[];
  sources: SourceReference[];
  confidence: string;
  loading: boolean;
  error: string | null;
  aiConfig: AiProviderConfig;
  previewMode: boolean;
  onAiConfigChange: (config: AiProviderConfig) => void;
  onAsk: (question: string) => Promise<void>;
}

const exampleQuestions = [
  'What is the current flood situation in this map view?',
  'Which communities appear most vulnerable and why?',
  'What assistance and resource data are available here?',
];

export function ChatPanel({
  messages,
  sources,
  confidence,
  loading,
  error,
  aiConfig,
  previewMode,
  onAiConfigChange,
  onAsk,
}: ChatPanelProps) {
  const [question, setQuestion] = useState('');
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const selectedProvider = useMemo(
    () => getAiProviderOption(aiConfig.provider),
    [aiConfig.provider],
  );

  const submit = async (value = question) => {
    const cleanQuestion = value.trim();
    if (!cleanQuestion || loading) return;
    setQuestion('');
    await onAsk(cleanQuestion);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const selectProvider = (providerId: AiProviderId) => {
    const option = getAiProviderOption(providerId);
    onAiConfigChange({
      provider: providerId,
      modelId: option.defaultModel,
      apiKey: '',
    });
  };

  const providerReady =
    selectedProvider.mode === 'hosted' || Boolean(aiConfig.apiKey.trim());

  return (
    <aside className="side-panel chat-panel" aria-label="AI assistant">
      <header className="ai-header">
        <div className="ai-identity">
          <div className="ai-orb" aria-hidden="true"><SparklesIcon size={19} /></div>
          <div>
            <div className="ai-title-row">
              <h2>Hazard Copilot</h2>
              <span className="beta-tag">Beta</span>
            </div>
            <p><i /> Model-agnostic geospatial assistant</p>
          </div>
        </div>
        <span className="confidence-badge">{confidence}</span>
      </header>

      <section className="ai-provider-card" aria-label="AI provider">
        <button
          type="button"
          className="ai-provider-trigger"
          aria-expanded={showProviderSettings}
          onClick={() => setShowProviderSettings((current) => !current)}
        >
          <div className="provider-status-icon" aria-hidden="true">
            <span>{selectedProvider.shortLabel.slice(0, 1)}</span>
          </div>
          <div className="provider-trigger-copy">
            <span>AI provider</span>
            <strong>{selectedProvider.label}</strong>
            <small>
              {previewMode
                ? 'Frontend preview · no live model request'
                : providerReady
                  ? 'Ready for live routing'
                  : 'API key required for live routing'}
            </small>
          </div>
          <span className={`provider-mode-badge ${selectedProvider.mode}`}>
            {selectedProvider.badge}
          </span>
          <ChevronDownIcon
            size={14}
            className={showProviderSettings ? 'provider-chevron open' : 'provider-chevron'}
          />
        </button>

        {showProviderSettings && (
          <div className="ai-provider-settings">
            <div className="provider-grid" role="radiogroup" aria-label="Choose AI provider">
              {aiProviderOptions.map((option) => (
                <label
                  key={option.id}
                  className={`provider-option ${aiConfig.provider === option.id ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="ai-provider"
                    value={option.id}
                    checked={aiConfig.provider === option.id}
                    onChange={() => selectProvider(option.id)}
                  />
                  <span className="provider-option-dot" />
                  <span className="provider-option-copy">
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <em>{option.badge}</em>
                </label>
              ))}
            </div>

            <div className="provider-fields">
              {selectedProvider.mode === 'byok' ? (
                <>
                  <label>
                    <span>API key</span>
                    <input
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={aiConfig.apiKey}
                      onChange={(event) =>
                        onAiConfigChange({ ...aiConfig, apiKey: event.target.value })
                      }
                      placeholder="Paste your API key"
                    />
                  </label>
                  <label>
                    <span>Model ID</span>
                    <input
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={aiConfig.modelId}
                      onChange={(event) =>
                        onAiConfigChange({ ...aiConfig, modelId: event.target.value })
                      }
                      placeholder={selectedProvider.modelPlaceholder}
                    />
                  </label>
                  <div className="provider-privacy-note">
                    <span className="privacy-dot" />
                    <p>
                      Session-only design: the key is held in browser memory and is not persisted by this frontend preview.
                    </p>
                  </div>
                </>
              ) : (
                <div className="hosted-model-note">
                  <div>
                    <span>Managed endpoint</span>
                    <strong>HazardWeave research server</strong>
                  </div>
                  <p>
                    The production Vercel API will route requests server-to-server to the hosted small-model endpoint. The server IP is never called directly by the browser.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="ai-context-card">
        <span>Current context</span>
        <strong>East Tennessee flood pilot</strong>
        <p>Map extent, visible data layers and analysis window will be attached to grounded AI requests.</p>
      </section>

      <div className="question-chips" aria-label="Example questions">
        {exampleQuestions.map((example) => (
          <button key={example} type="button" onClick={() => void submit(example)}>
            <SparklesIcon size={13} />
            <span>{example}</span>
          </button>
        ))}
      </div>

      <div className="message-list" aria-live="polite">
        {messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            <div className="message-meta">
              <span className="message-role">{message.role === 'user' ? 'You' : 'HazardWeave Copilot'}</span>
              <time>{message.timestamp}</time>
            </div>
            <p>{message.content}</p>
          </article>
        ))}
        {loading && (
          <article className="message assistant loading-message">
            <div className="message-meta"><span className="message-role">HazardWeave Copilot</span></div>
            <div className="thinking-row"><span /><span /><span /> Analysing spatial evidence</div>
          </article>
        )}
        {error && <p className="error-message">{error}</p>}
      </div>

      {sources.length > 0 && (
        <details className="source-box" open>
          <summary>
            <span><DatabaseIcon size={15} /> Evidence trace</span>
            <b>{sources.length} sources</b>
          </summary>
          <div className="source-list">
            {sources.map((source, index) => (
              <article key={`${source.name}-${source.validTime}`}>
                <span className="source-index">0{index + 1}</span>
                <div>
                  <strong>{source.name}</strong>
                  <span>{source.validTime}</span>
                  {source.modelVersion && <code>{source.modelVersion}</code>}
                </div>
              </article>
            ))}
          </div>
        </details>
      )}

      <div className="composer">
        <label htmlFor="question">Ask HazardWeave</label>
        <div className="composer-box">
          <textarea
            id="question"
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about flood conditions, vulnerability, assistance or community resources…"
          />
          <div className="composer-footer">
            <span>
              {previewMode
                ? `Previewing ${selectedProvider.shortLabel} · no key is transmitted`
                : `${selectedProvider.shortLabel} · Enter to send`}
            </span>
            <button type="button" disabled={loading || !question.trim()} onClick={() => void submit()} aria-label="Send question">
              <SendIcon size={17} />
            </button>
          </div>
        </div>
        <p className="ai-disclaimer">AI-generated analysis requires human verification for operational decisions.</p>
      </div>
    </aside>
  );
}
