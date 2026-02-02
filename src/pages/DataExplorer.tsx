import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Sparkles,
  Mic,
  Loader2,
  Table,
  ChevronRight,
  Star
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { DataService } from '../services/dataService';
import { useGroq } from '../hooks/useGroq';
import type { PractitionerProfile } from '../types/database';

interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'table' | 'map' | 'stats';
  title: string;
  data: any[];
  config?: {
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
    colors?: string[];
  };
}

interface QueryResult {
  id: string;
  query: string;
  answer: string;
  charts: ChartData[];
  practitioners?: PractitionerProfile[];
  timestamp: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c43'];

const EXAMPLE_QUERIES = [
  "Répartition des volumes par ville",
  "Top 10 praticiens par volume",
  "Distribution des vingtiles",
  "KOLs par spécialité",
  "Évolution de la fidélité moyenne",
  "Praticiens à risque par ville",
  "Comparaison pneumologues vs généralistes",
  "Carte des volumes par ville"
];

export default function DataExplorer() {
  const navigate = useNavigate();
  const { complete } = useGroq();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [_isListening, _setIsListening] = useState(false);

  // Get all practitioners for analysis
  const practitioners = useMemo(() => DataService.getAllPractitioners(), []);

  // Pre-computed stats
  const stats = useMemo(() => {
    const byCity: Record<string, { count: number; volume: number; kols: number }> = {};
    const bySpecialty: Record<string, { count: number; volume: number; avgLoyalty: number }> = {};
    const byVingtile: Record<string, number> = {};

    practitioners.forEach(p => {
      // By city
      const city = p.address.city;
      if (!byCity[city]) byCity[city] = { count: 0, volume: 0, kols: 0 };
      byCity[city].count++;
      byCity[city].volume += p.metrics.volumeL;
      if (p.metrics.isKOL) byCity[city].kols++;

      // By specialty
      const spec = p.specialty;
      if (!bySpecialty[spec]) bySpecialty[spec] = { count: 0, volume: 0, avgLoyalty: 0 };
      bySpecialty[spec].count++;
      bySpecialty[spec].volume += p.metrics.volumeL;
      bySpecialty[spec].avgLoyalty += p.metrics.loyaltyScore;

      // By vingtile range
      const range = p.metrics.vingtile <= 5 ? '1-5' :
                    p.metrics.vingtile <= 10 ? '6-10' :
                    p.metrics.vingtile <= 15 ? '11-15' : '16-20';
      byVingtile[range] = (byVingtile[range] || 0) + 1;
    });

    // Calculate averages
    Object.keys(bySpecialty).forEach(spec => {
      bySpecialty[spec].avgLoyalty = bySpecialty[spec].avgLoyalty / bySpecialty[spec].count;
    });

    return { byCity, bySpecialty, byVingtile };
  }, [practitioners]);

  // Generate charts based on query
  const generateCharts = useCallback((queryLower: string): ChartData[] => {
    const charts: ChartData[] = [];

    // Volume by city
    if (queryLower.includes('volume') && (queryLower.includes('ville') || queryLower.includes('répartition') || queryLower.includes('distribution'))) {
      const data = Object.entries(stats.byCity)
        .map(([city, data]) => ({ name: city, volume: Math.round(data.volume / 1000) }))
        .sort((a, b) => b.volume - a.volume);

      charts.push({
        type: 'bar',
        title: 'Volume par ville (K L/an)',
        data,
        config: { xKey: 'name', yKey: 'volume' }
      });
    }

    // Top practitioners
    if (queryLower.includes('top') && (queryLower.includes('praticien') || queryLower.includes('prescripteur'))) {
      const limit = queryLower.match(/top\s*(\d+)/i)?.[1] || '10';
      const data = [...practitioners]
        .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL)
        .slice(0, parseInt(limit))
        .map(p => ({
          name: `${p.lastName}`,
          volume: Math.round(p.metrics.volumeL / 1000),
          isKOL: p.metrics.isKOL
        }));

      charts.push({
        type: 'bar',
        title: `Top ${limit} praticiens par volume (K L/an)`,
        data,
        config: { xKey: 'name', yKey: 'volume' }
      });
    }

    // Vingtile distribution
    if (queryLower.includes('vingtile') || queryLower.includes('distribution')) {
      const data = Object.entries(stats.byVingtile)
        .map(([range, count]) => ({ name: range, value: count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      charts.push({
        type: 'pie',
        title: 'Distribution des vingtiles',
        data,
        config: { nameKey: 'name', valueKey: 'value', colors: COLORS }
      });
    }

    // By specialty
    if (queryLower.includes('spécialité') || queryLower.includes('specialite') || queryLower.includes('pneumologue') || queryLower.includes('généraliste')) {
      const data = Object.entries(stats.bySpecialty).map(([spec, data]) => ({
        name: spec,
        praticiens: data.count,
        volume: Math.round(data.volume / 1000),
        fidélité: Math.round(data.avgLoyalty * 10) / 10
      }));

      charts.push({
        type: 'bar',
        title: 'Comparaison par spécialité',
        data,
        config: { xKey: 'name', yKey: 'volume' }
      });
    }

    // KOLs
    if (queryLower.includes('kol')) {
      const kolsByCity = Object.entries(stats.byCity)
        .filter(([_, d]) => d.kols > 0)
        .map(([city, data]) => ({ name: city, kols: data.kols }))
        .sort((a, b) => b.kols - a.kols);

      charts.push({
        type: 'bar',
        title: 'KOLs par ville',
        data: kolsByCity,
        config: { xKey: 'name', yKey: 'kols' }
      });
    }

    // At risk
    if (queryLower.includes('risque') || queryLower.includes('churn')) {
      const atRisk = practitioners.filter(p =>
        p.metrics.churnRisk === 'high' || p.metrics.loyaltyScore < 5
      );
      const byCity: Record<string, number> = {};
      atRisk.forEach(p => {
        byCity[p.address.city] = (byCity[p.address.city] || 0) + 1;
      });

      const data = Object.entries(byCity)
        .map(([city, count]) => ({ name: city, atRisk: count }))
        .sort((a, b) => b.atRisk - a.atRisk);

      charts.push({
        type: 'bar',
        title: 'Praticiens à risque par ville',
        data,
        config: { xKey: 'name', yKey: 'atRisk' }
      });
    }

    // Loyalty
    if (queryLower.includes('fidélité') || queryLower.includes('fidelite') || queryLower.includes('loyalty')) {
      const loyaltyBuckets: Record<string, number> = {
        '1-3': 0, '4-5': 0, '6-7': 0, '8-9': 0, '10': 0
      };

      practitioners.forEach(p => {
        const score = p.metrics.loyaltyScore;
        if (score <= 3) loyaltyBuckets['1-3']++;
        else if (score <= 5) loyaltyBuckets['4-5']++;
        else if (score <= 7) loyaltyBuckets['6-7']++;
        else if (score <= 9) loyaltyBuckets['8-9']++;
        else loyaltyBuckets['10']++;
      });

      charts.push({
        type: 'pie',
        title: 'Distribution de la fidélité',
        data: Object.entries(loyaltyBuckets).map(([range, count]) => ({
          name: `Score ${range}`,
          value: count
        })),
        config: { nameKey: 'name', valueKey: 'value', colors: COLORS }
      });
    }

    // Map-style data by city
    if (queryLower.includes('carte') || queryLower.includes('map') || queryLower.includes('géographique')) {
      const data = Object.entries(stats.byCity)
        .map(([city, d]) => ({
          name: city,
          praticiens: d.count,
          volume: Math.round(d.volume / 1000),
          kols: d.kols
        }))
        .sort((a, b) => b.volume - a.volume);

      charts.push({
        type: 'table',
        title: 'Données par ville',
        data
      });
    }

    // Default: show summary if no specific chart
    if (charts.length === 0) {
      // Stats summary
      charts.push({
        type: 'stats',
        title: 'Résumé du territoire',
        data: [
          { label: 'Praticiens', value: practitioners.length },
          { label: 'KOLs', value: practitioners.filter(p => p.metrics.isKOL).length },
          { label: 'Volume total', value: `${Math.round(practitioners.reduce((s, p) => s + p.metrics.volumeL, 0) / 1000)}K L` },
          { label: 'Fidélité moy.', value: `${(practitioners.reduce((s, p) => s + p.metrics.loyaltyScore, 0) / practitioners.length).toFixed(1)}/10` }
        ]
      });

      // Volume by city
      const data = Object.entries(stats.byCity)
        .map(([city, data]) => ({ name: city, volume: Math.round(data.volume / 1000) }))
        .sort((a, b) => b.volume - a.volume);

      charts.push({
        type: 'bar',
        title: 'Volume par ville (K L/an)',
        data,
        config: { xKey: 'name', yKey: 'volume' }
      });
    }

    return charts;
  }, [practitioners, stats]);

  // Process query
  const processQuery = async () => {
    if (!query.trim()) return;

    setIsLoading(true);

    const queryLower = query.toLowerCase();
    const charts = generateCharts(queryLower);

    // Generate AI response
    let answer = '';
    try {
      const globalStats = DataService.getGlobalStats();
      const context = `Tu es ARIA, assistant IA pour visiteurs médicaux Air Liquide.

DONNÉES TERRITOIRE:
- ${globalStats.totalPractitioners} praticiens (${globalStats.pneumologues} pneumologues, ${globalStats.generalistes} généralistes)
- ${globalStats.totalKOLs} KOLs identifiés
- Volume total: ${(globalStats.totalVolume / 1000).toFixed(0)}K L/an
- Fidélité moyenne: ${globalStats.averageLoyalty.toFixed(1)}/10

Villes: ${Object.keys(stats.byCity).join(', ')}

QUESTION: ${query}

Réponds de manière CONCISE (2-3 phrases max) avec les insights clés. Utilise les données pour être précis.`;

      const response = await complete([{ role: 'user', content: context }]);
      if (response) {
        answer = response;
      }
    } catch {
      // Fallback response
      answer = `Voici l'analyse demandée basée sur ${practitioners.length} praticiens de votre territoire.`;
    }

    // Find relevant practitioners
    let relevantPractitioners: PractitionerProfile[] | undefined;
    if (queryLower.includes('top')) {
      const limit = parseInt(queryLower.match(/top\s*(\d+)/i)?.[1] || '5');
      relevantPractitioners = [...practitioners]
        .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL)
        .slice(0, limit);
    } else if (queryLower.includes('kol')) {
      relevantPractitioners = practitioners.filter(p => p.metrics.isKOL).slice(0, 10);
    } else if (queryLower.includes('risque')) {
      relevantPractitioners = practitioners
        .filter(p => p.metrics.churnRisk === 'high' || p.metrics.loyaltyScore < 5)
        .slice(0, 10);
    }

    const result: QueryResult = {
      id: Date.now().toString(),
      query,
      answer,
      charts,
      practitioners: relevantPractitioners,
      timestamp: new Date()
    };

    setResults(prev => [result, ...prev]);
    setQuery('');
    setIsLoading(false);
  };

  // Render chart based on type
  const renderChart = (chart: ChartData) => {
    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={chart.config?.xKey || 'name'} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey={chart.config?.yKey || 'value'} fill="#0066B3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey={chart.config?.valueKey || 'value'}
              >
                {chart.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.config?.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={chart.config?.yKey || 'value'} stroke="#0066B3" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {Object.keys(chart.data[0] || {}).map(key => (
                    <th key={key} className="text-left py-2 px-3 font-medium text-slate-600 capitalize">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.data.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    {Object.values(row).map((value: any, j) => (
                      <td key={j} className="py-2 px-3 text-slate-700">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'stats':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {chart.data.map((stat: any, i: number) => (
              <div key={i} className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Data Explorer
          </span>
        </h1>
        <p className="text-slate-600">
          Posez vos questions en langage naturel et obtenez des visualisations instantanées
        </p>
      </div>

      {/* Query Input */}
      <div className="glass-card p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && processQuery()}
              placeholder="Ex: Répartition des volumes par ville..."
              className="input-field w-full pr-12"
              disabled={isLoading}
            />
            <button
              onClick={() => {/* TODO: Voice input */}}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-al-blue-600"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={processQuery}
            disabled={isLoading || !query.trim()}
            className="btn-primary bg-gradient-to-r from-indigo-500 to-purple-500 px-6 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyser
              </>
            )}
          </button>
        </div>

        {/* Example queries */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.slice(0, 4).map((example, i) => (
            <button
              key={i}
              onClick={() => setQuery(example)}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-full transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        <AnimatePresence>
          {results.map((result) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden"
            >
              {/* Query header */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">"{result.query}"</p>
                    <p className="text-xs text-slate-500">
                      {result.timestamp.toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Answer */}
              <div className="p-4 border-b border-slate-100">
                <p className="text-slate-700">{result.answer}</p>
              </div>

              {/* Charts */}
              <div className="p-4 space-y-6">
                {result.charts.map((chart, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      {chart.type === 'bar' && <BarChart3 className="w-4 h-4 text-indigo-500" />}
                      {chart.type === 'pie' && <PieChart className="w-4 h-4 text-indigo-500" />}
                      {chart.type === 'line' && <TrendingUp className="w-4 h-4 text-indigo-500" />}
                      {chart.type === 'table' && <Table className="w-4 h-4 text-indigo-500" />}
                      {chart.type === 'stats' && <Users className="w-4 h-4 text-indigo-500" />}
                      {chart.title}
                    </h3>
                    {renderChart(chart)}
                  </div>
                ))}
              </div>

              {/* Related practitioners */}
              {result.practitioners && result.practitioners.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Praticiens associés
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.practitioners.slice(0, 6).map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/practitioner/${p.id}`)}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-indigo-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">
                            {p.title} {p.lastName}
                            {p.metrics.isKOL && (
                              <Star className="w-3 h-3 inline ml-1 text-amber-500" />
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(p.metrics.volumeL / 1000).toFixed(0)}K L • {p.address.city}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mx-auto flex items-center justify-center mb-4">
              <BarChart3 className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Explorez vos données
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Posez une question en langage naturel pour obtenir des analyses et visualisations instantanées
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUERIES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(example)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg transition-colors text-sm"
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
