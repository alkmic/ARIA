/**
 * Service météo utilisant l'API OpenWeather
 * API gratuite : https://openweathermap.org/api
 */

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const DEFAULT_CITY = 'Lyon,FR';

/**
 * Récupère la météo actuelle pour une ville
 */
export async function getCurrentWeather(city: string = DEFAULT_CITY): Promise<WeatherData | null> {
  // Si pas de clé API, retourner des données mockées
  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'your_openweather_api_key') {
    console.warn('OpenWeather API key not configured. Using mock data.');
    return {
      temp: 8,
      description: 'Nuageux',
      icon: '04d',
      city: 'Lyon',
    };
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=fr`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name,
    };
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    // Fallback vers données mockées
    return {
      temp: 8,
      description: 'Nuageux',
      icon: '04d',
      city: city.split(',')[0],
    };
  }
}

/**
 * Hook React pour utiliser la météo
 */
import { useState, useEffect } from 'react';

export function useWeather(city?: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      try {
        setLoading(true);
        const data = await getCurrentWeather(city);
        if (!cancelled) {
          setWeather(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [city]);

  return { weather, loading, error };
}
