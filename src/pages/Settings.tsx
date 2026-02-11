import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Lock,
  Database,
  HelpCircle,
  Brain,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Cpu,
  Key,
  Eye,
  EyeOff,
  Save,
  X,
  RefreshCw,
  Zap,
  Shield,
  ExternalLink,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { useWebLLM } from '../hooks/useWebLLM';
import { WEBLLM_MODELS } from '../services/webLlmService';
import { hasExternalLLMKey, getLLMProviderName } from '../services/aiCoachEngine';
import {
  getStoredLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
  testLLMConfig,
  LLM_PROVIDERS,
  getProviderDef,
  type LLMConfig,
  type LLMProviderType,
  type ApiKeyTestResult,
} from '../services/apiKeyService';

// ── Org color mapping for WebLLM models ──
const ORG_COLORS: Record<string, string> = {
  Alibaba: 'bg-orange-100 text-orange-700',
  HuggingFace: 'bg-yellow-100 text-yellow-700',
  Meta: 'bg-blue-100 text-blue-700',
  Microsoft: 'bg-cyan-100 text-cyan-700',
  Google: 'bg-emerald-100 text-emerald-700',
  DeepSeek: 'bg-violet-100 text-violet-700',
  'Mistral AI': 'bg-rose-100 text-rose-700',
};

export function Settings() {
  const {
    status,
    progress,
    error,
    isReady,
    isLoading,
    isWebGPUSupported,
    selectedModel,
    loadModel,
    unloadModel,
  } = useWebLLM();

  // ── LLM Config state ──
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderType>('groq');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [deploymentInput, setDeploymentInput] = useState('');
  const [apiVersionInput, setApiVersionInput] = useState('2024-12-01-preview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // ── Test state ──
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ApiKeyTestResult | null>(null);

  // Load existing config
  useEffect(() => {
    const config = getStoredLLMConfig();
    if (config) {
      setSelectedProvider(config.provider);
      setApiKeyInput(config.apiKey);
      setModelInput(config.model);
      if (config.baseUrl) {
        setBaseUrlInput(config.baseUrl);
        setShowAdvanced(true);
      }
      if (config.deployment) setDeploymentInput(config.deployment);
      if (config.apiVersion) setApiVersionInput(config.apiVersion);
      // Check if the model is in the provider's suggestion list
      const providerDef = getProviderDef(config.provider);
      if (providerDef && providerDef.models.length > 0) {
        const isKnown = providerDef.models.some(m => m.id === config.model);
        setIsCustomModel(!isKnown);
      }
      setHasKey(true);
    } else {
      // No config — set defaults for the first provider
      const def = getProviderDef('groq');
      if (def) {
        setModelInput(def.defaultModel);
      }
    }
  }, []);

  const currentProviderDef = getProviderDef(selectedProvider);

  const handleProviderChange = (providerId: LLMProviderType) => {
    setSelectedProvider(providerId);
    const def = getProviderDef(providerId);
    if (def) {
      setModelInput(def.defaultModel);
      setBaseUrlInput(def.needsBaseUrl ? '' : def.defaultBaseUrl);
      setShowAdvanced(def.needsBaseUrl);
      setIsCustomModel(false);
    }
    // Azure defaults
    if (providerId === 'azure') {
      setDeploymentInput('');
      setApiVersionInput('2024-12-01-preview');
    }
    setTestResult(null);
  };

  const buildConfig = useCallback((): LLMConfig => {
    const def = getProviderDef(selectedProvider);
    const baseUrl = baseUrlInput.trim() || undefined;
    return {
      provider: selectedProvider,
      apiKey: apiKeyInput.trim(),
      model: modelInput.trim() || def?.defaultModel || '',
      ...(baseUrl && baseUrl !== def?.defaultBaseUrl ? { baseUrl } : {}),
      ...(selectedProvider === 'azure' && deploymentInput.trim() ? { deployment: deploymentInput.trim() } : {}),
      ...(selectedProvider === 'azure' && apiVersionInput.trim() ? { apiVersion: apiVersionInput.trim() } : {}),
    };
  }, [selectedProvider, apiKeyInput, modelInput, baseUrlInput, deploymentInput, apiVersionInput]);

  const runTest = useCallback(async () => {
    const config = buildConfig();
    if (config.apiKey.length < 10) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testLLMConfig(config);
      setTestResult(result);
      // Auto-save on successful test so the Coach and all other services
      // can use this config immediately (matches the UI message promise)
      if (result.success) {
        saveLLMConfig(config);
        setHasKey(true);
      }
    } catch {
      setTestResult({
        success: false,
        provider: currentProviderDef?.name || 'Inconnu',
        latencyMs: 0,
        error: 'Erreur inattendue lors du test',
      });
    } finally {
      setIsTesting(false);
    }
  }, [buildConfig, currentProviderDef]);

  const handleSaveAndTest = useCallback(async () => {
    const config = buildConfig();
    if (config.apiKey.length < 10) return;
    saveLLMConfig(config);
    setHasKey(true);
    await runTest();
  }, [buildConfig, runTest]);

  const handleClear = () => {
    clearLLMConfig();
    setApiKeyInput('');
    setModelInput(getProviderDef(selectedProvider)?.defaultModel || '');
    setBaseUrlInput('');
    setDeploymentInput('');
    setApiVersionInput('2024-12-01-preview');
    setHasKey(false);
    setTestResult(null);
  };

  const currentModelInfo = WEBLLM_MODELS.find(m => m.id === selectedModel);
  const uniqueOrgs = [...new Set(WEBLLM_MODELS.map(m => m.org))];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2 flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-al-blue-500" />
          <span>Paramètres</span>
        </h1>
        <p className="text-slate-600">
          Configurez l'intelligence artificielle et vos préférences
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — Configuration LLM */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-6 border-2 border-blue-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">Configuration LLM</h2>
              {hasKey && hasExternalLLMKey() && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[11px] font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              Connectez n'importe quel LLM externe — choisissez votre service, modèle et clé API
            </p>
          </div>
        </div>

        {/* Current provider status */}
        <div className="mb-5 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-1">Provider LLM actuel</p>
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-al-blue-500" />
            {getLLMProviderName()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Chaîne de fallback : API externe &rarr; WebLLM navigateur
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">

          {/* 1. Provider select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Service / Provider
            </label>
            <div className="relative">
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value as LLMProviderType)}
                className="input-field w-full pr-10 appearance-none text-sm cursor-pointer"
              >
                {LLM_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.description}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {currentProviderDef?.docUrl && (
              <a
                href={currentProviderDef.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                Obtenir une clé API sur {currentProviderDef.name}
              </a>
            )}
          </div>

          {/* 2. API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Clé API
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder={currentProviderDef?.apiKeyPlaceholder || 'Collez votre clé API'}
                className="input-field pr-10 font-mono text-sm w-full"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3. Model */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Modèle
            </label>
            {currentProviderDef && currentProviderDef.models.length > 0 && !isCustomModel ? (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={modelInput}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomModel(true);
                        setModelInput('');
                      } else {
                        setModelInput(e.target.value);
                      }
                      setTestResult(null);
                    }}
                    className="input-field w-full pr-10 appearance-none text-sm cursor-pointer"
                  >
                    {currentProviderDef.models.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                    ))}
                    <option value="__custom__">Autre modèle (saisie libre)...</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={modelInput}
                  onChange={(e) => {
                    setModelInput(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="Nom du modèle (ex: gpt-4o-mini, llama-3.3-70b-versatile)"
                  className="input-field font-mono text-sm w-full"
                />
                {currentProviderDef && currentProviderDef.models.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomModel(false);
                      setModelInput(currentProviderDef.defaultModel);
                    }}
                    className="text-[11px] text-blue-500 hover:text-blue-700"
                  >
                    Revenir à la liste des modèles suggérés
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. Advanced: Base URL */}
          {(currentProviderDef?.needsBaseUrl || showAdvanced) ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                {selectedProvider === 'azure' ? 'Endpoint Azure' : `URL de l'API`} {!currentProviderDef?.needsBaseUrl && '(optionnel)'}
              </label>
              <input
                type="text"
                value={baseUrlInput}
                onChange={(e) => {
                  setBaseUrlInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder={selectedProvider === 'azure'
                  ? 'https://your-resource.cognitiveservices.azure.com'
                  : (currentProviderDef?.defaultBaseUrl || 'https://your-endpoint.com/v1')
                }
                className="input-field font-mono text-sm w-full"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedProvider === 'azure'
                  ? 'Obligatoire — l\'endpoint de votre ressource Azure AI Foundry (ex: https://xxx.cognitiveservices.azure.com).'
                  : currentProviderDef?.needsBaseUrl
                    ? 'Obligatoire — renseignez l\'URL complète de votre endpoint.'
                    : `Par défaut : ${currentProviderDef?.defaultBaseUrl || '—'}`
                }
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowAdvanced(true);
                setBaseUrlInput(currentProviderDef?.defaultBaseUrl || '');
              }}
              className="text-[11px] text-slate-400 hover:text-blue-500 transition-colors"
            >
              Options avancées (URL personnalisée)...
            </button>
          )}

          {/* 5. Azure-specific: Deployment name + API version */}
          {selectedProvider === 'azure' && (
            <div className="space-y-4 p-4 bg-blue-50/50 rounded-xl border border-blue-200">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Configuration Azure OpenAI
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom du déploiement (deployment)
                </label>
                <input
                  type="text"
                  value={deploymentInput}
                  onChange={(e) => {
                    setDeploymentInput(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="ex: o4-mini, gpt-4o-mini"
                  className="input-field font-mono text-sm w-full"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Le nom de votre déploiement dans Azure AI Foundry (peut différer du nom du modèle).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Version d'API
                </label>
                <input
                  type="text"
                  value={apiVersionInput}
                  onChange={(e) => {
                    setApiVersionInput(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="2024-12-01-preview"
                  className="input-field font-mono text-sm w-full"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Version de l'API Azure OpenAI (ex: 2024-12-01-preview).
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap pt-1">
            <button
              onClick={handleSaveAndTest}
              disabled={apiKeyInput.trim().length < 10 || !modelInput.trim() || isTesting}
              className="px-4 py-2 flex items-center gap-1.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              Sauvegarder & Tester
            </button>
            <button
              onClick={runTest}
              disabled={apiKeyInput.trim().length < 10 || !modelInput.trim() || isTesting}
              className="px-4 py-2 flex items-center gap-1.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Tester la connexion
                </>
              )}
            </button>
            {hasKey && (
              <button
                onClick={handleClear}
                className="px-3 py-2 flex items-center gap-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Supprimer
              </button>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-start gap-3 text-sm px-4 py-3 rounded-xl border-2 ${
              testResult.success
                ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                {testResult.success ? (
                  <>
                    <p className="font-semibold">Connexion réussie !</p>
                    <p className="text-xs mt-1">
                      Provider : <strong>{testResult.provider}</strong> — Modèle : <strong>{testResult.model}</strong> — Latence : <strong>{testResult.latencyMs}ms</strong>
                    </p>
                    <p className="text-xs mt-1 text-green-600">
                      Tous les services IA d'ARIA utiliseront cette configuration automatiquement.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Échec de connexion</p>
                    <p className="text-xs mt-1">{testResult.error}</p>
                    <p className="text-xs mt-1 text-red-500">
                      Vérifiez la clé, le modèle, et (si applicable) l'URL de l'API.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="text-[11px] text-slate-400 space-y-1 pt-1">
            <p>La configuration est stockée uniquement dans votre navigateur (localStorage).</p>
            <p>{LLM_PROVIDERS.length} services supportés : {LLM_PROVIDERS.filter(p => p.id !== 'custom').map(p => p.name).join(', ')} + endpoint personnalisé.</p>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — WebLLM (IA dans le navigateur) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 border-2 border-purple-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">IA locale dans le navigateur</h2>
              <span className="text-[11px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">WebLLM</span>
            </div>
            <p className="text-sm text-slate-500">
              Exécutez un LLM dans votre navigateur via WebGPU — zéro installation, zéro serveur
            </p>
          </div>
          {isReady && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Prêt
            </span>
          )}
        </div>

        {hasKey && hasExternalLLMKey() && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Note :</strong> Une clé API externe est configurée. WebLLM sert de solution de secours si l'API est indisponible.
            </p>
          </div>
        )}

        {!isWebGPUSupported ? (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">WebGPU non disponible</p>
              <p className="text-xs text-amber-600 mt-1">
                Votre navigateur ne supporte pas WebGPU. Utilisez Chrome 113+, Edge 113+ ou un navigateur compatible.
                Configurez plutôt une clé API ci-dessus.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <p className="text-sm font-medium text-slate-700">
                Choisir un modèle ({WEBLLM_MODELS.length} modèles de {uniqueOrgs.length} éditeurs) :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {WEBLLM_MODELS.map((model) => {
                  const isSelected = selectedModel === model.id && isReady;
                  return (
                    <button
                      key={model.id}
                      onClick={() => !isLoading && loadModel(model.id)}
                      disabled={isLoading}
                      className={`p-3 rounded-xl text-left transition-all border-2 ${
                        isSelected
                          ? 'border-purple-400 bg-purple-50 shadow-md shadow-purple-200/50'
                          : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-800">{model.name}</span>
                        <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full whitespace-nowrap">{model.size}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-1.5">{model.description}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ORG_COLORS[model.org] || 'bg-slate-100 text-slate-600'}`}>
                          {model.org}
                        </span>
                        {model.vramMB >= 5000 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">GPU puissant</span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-green-600 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Chargé et actif
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {isLoading && (
              <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  <span className="text-sm font-medium text-purple-800">Chargement du modèle...</span>
                  <span className="text-sm font-bold text-purple-600 ml-auto">{(progress.progress * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(progress.progress * 100, 1)}%` }}
                  />
                </div>
                <p className="text-[11px] text-purple-600 truncate">{progress.text}</p>
                {progress.progress > 0 && progress.progress < 1 && (
                  <p className="text-[11px] text-purple-500 mt-1">
                    Premier chargement : les poids sont téléchargés et mis en cache. Les prochains chargements seront quasi-instantanés.
                  </p>
                )}
              </div>
            )}

            {error && status === 'error' && (
              <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 mb-1">Erreur de chargement</p>
                    <p className="text-sm text-red-700">{error}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => loadModel(selectedModel)}
                        className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Réessayer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {!isReady && !isLoading && status !== 'error' && (
                <button
                  onClick={() => loadModel()}
                  className="px-6 py-2.5 flex items-center gap-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Charger {currentModelInfo?.name || 'le modèle'}
                </button>
              )}
              {isReady && (
                <button
                  onClick={unloadModel}
                  className="px-4 py-2 flex items-center gap-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Décharger le modèle
                </button>
              )}
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>Les modèles sont compilés au format MLC et distribués via le CDN HuggingFace. Le runtime WASM est hébergé sur GitHub (mlc-ai).</p>
                  <p>Les poids sont téléchargés une seule fois puis mis en cache dans IndexedDB — les chargements suivants sont instantanés.</p>
                  <p>Pendant l'inférence, tout s'exécute localement sur votre GPU — aucune donnée n'est envoyée à l'extérieur.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — Settings Grid */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Profil</h2>
              <p className="text-sm text-slate-500">Informations personnelles</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
              <input type="text" defaultValue="Marie Dupont" className="input-field" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input type="email" defaultValue="marie.dupont@airliquide.com" className="input-field" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
              <input type="text" defaultValue="Déléguée Pharmaceutique" className="input-field" disabled />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-al-teal to-al-blue-300 rounded-xl">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
              <p className="text-sm text-slate-500">Préférences d'alertes</p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Visites à planifier</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-al-blue-500 rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">KOLs non visités</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-al-blue-500 rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Objectifs atteints</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-al-blue-500 rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Rappels quotidiens</span>
              <input type="checkbox" className="w-5 h-5 text-al-blue-500 rounded" />
            </label>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Sécurité</h2>
              <p className="text-sm text-slate-500">Paramètres de sécurité</p>
            </div>
          </div>
          <div className="space-y-4">
            <button className="btn-primary w-full" disabled>Changer le mot de passe</button>
            <button className="btn-secondary w-full" disabled>Activer 2FA</button>
            <div className="text-xs text-slate-500 text-center pt-2">Fonctionnalité disponible prochainement</div>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Données</h2>
              <p className="text-sm text-slate-500">Gestion des données</p>
            </div>
          </div>
          <div className="space-y-4">
            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled>Exporter mes données</button>
            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled>Politique de confidentialité</button>
            <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled>Conditions d'utilisation</button>
            <div className="text-xs text-slate-500 text-center pt-2">Fonctionnalité disponible prochainement</div>
          </div>
        </motion.div>
      </div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Aide & Support</h2>
            <p className="text-sm text-slate-500">Besoin d'assistance ?</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button className="btn-secondary" disabled>Documentation</button>
          <button className="btn-secondary" disabled>Tutoriels vidéo</button>
          <button className="btn-secondary" disabled>Contacter le support</button>
        </div>
      </motion.div>

      {/* Version Info */}
      <div className="text-center text-sm text-slate-500">
        ARIA v1.0.0 · Démonstrateur Air Liquide Santé
      </div>
    </motion.div>
  );
}
