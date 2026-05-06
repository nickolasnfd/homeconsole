import { useState, useEffect } from "react";
import { 
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, 
  Snowflake, CloudLightning, Droplets, Wind, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const weatherMap: Record<number, { label: string; icon: any; color: string; bg: string }> = {
  0: { label: "Céu Limpo", icon: Sun, color: "text-amber-400", bg: "from-amber-500/10 to-transparent" },
  1: { label: "Céu Limpo", icon: Sun, color: "text-amber-300", bg: "from-amber-500/10 to-transparent" },
  2: { label: "Parcialmente Nublado", icon: CloudSun, color: "text-sky-300", bg: "from-sky-500/10 to-transparent" },
  3: { label: "Encoberto", icon: Cloud, color: "text-zinc-400", bg: "from-zinc-500/10 to-transparent" },
  45: { label: "Nevoeiro", icon: CloudFog, color: "text-zinc-500", bg: "from-zinc-600/10 to-transparent" },
  48: { label: "Nevoeiro", icon: CloudFog, color: "text-zinc-500", bg: "from-zinc-600/10 to-transparent" },
  51: { label: "Chuvisco", icon: CloudDrizzle, color: "text-blue-300", bg: "from-blue-500/10 to-transparent" },
  53: { label: "Chuvisco", icon: CloudDrizzle, color: "text-blue-300", bg: "from-blue-500/10 to-transparent" },
  55: { label: "Chuvisco Intenso", icon: CloudDrizzle, color: "text-blue-400", bg: "from-blue-500/10 to-transparent" },
  61: { label: "Chuva Leve", icon: CloudRain, color: "text-blue-400", bg: "from-blue-600/15 to-transparent" },
  63: { label: "Chuva Moderada", icon: CloudRain, color: "text-blue-500", bg: "from-blue-600/15 to-transparent" },
  65: { label: "Chuva Forte", icon: CloudRain, color: "text-blue-600", bg: "from-blue-600/20 to-transparent" },
  71: { label: "Neve Leve", icon: Snowflake, color: "text-sky-200", bg: "from-sky-300/15 to-transparent" },
  73: { label: "Neve", icon: Snowflake, color: "text-sky-300", bg: "from-sky-300/15 to-transparent" },
  75: { label: "Neve Forte", icon: Snowflake, color: "text-sky-400", bg: "from-sky-300/20 to-transparent" },
  80: { label: "Pancadas de Chuva", icon: CloudRain, color: "text-sky-400", bg: "from-sky-500/15 to-transparent" },
  81: { label: "Pancadas Fortes", icon: CloudRain, color: "text-sky-500", bg: "from-sky-500/15 to-transparent" },
  82: { label: "Tempestade de Chuva", icon: CloudRain, color: "text-sky-600", bg: "from-sky-500/20 to-transparent" },
  95: { label: "Tempestade", icon: CloudLightning, color: "text-purple-400", bg: "from-purple-500/15 to-transparent" },
  96: { label: "Tempestade com Granizo", icon: CloudLightning, color: "text-purple-500", bg: "from-purple-500/15 to-transparent" },
  99: { label: "Tempestade Severa", icon: CloudLightning, color: "text-purple-600", bg: "from-purple-500/20 to-transparent" },
};

const defaultWeather = { label: "Nublado", icon: Cloud, color: "text-zinc-400", bg: "from-zinc-500/10 to-transparent" };

function getWeatherDetails(code: number) {
  return weatherMap[code] ?? defaultWeather;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (active) {
          setWeather(data);
          setLoading(false);
          setError(false);
        }
      } catch (err) {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    // Default coordinates: São Paulo, BR (-23.5505, -46.6333)
    const defaultLat = -23.5505;
    const defaultLon = -46.6333;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather(defaultLat, defaultLon);
        }
      );
    } else {
      fetchWeather(defaultLat, defaultLon);
    }

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-20 rounded-full bg-card/60 border border-border/40 animate-pulse flex items-center justify-center text-[11px] text-muted-foreground font-semibold shrink-0">
        Carregando...
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  const current = weather.current;
  const currentDetails = getWeatherDetails(current.weather_code);
  const Icon = currentDetails.icon;

  const temp = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature);
  const humidity = Math.round(current.relative_humidity_2m);
  const windSpeed = Math.round(current.wind_speed_10m);

  // Daily forecast mapping
  const daily = weather.daily;
  const dailyForecast = daily.time.slice(0, 3).map((timeStr: string, idx: number) => {
    const date = new Date(timeStr + "T00:00:00");
    const dayName = idx === 0 ? "Hoje" : date.toLocaleDateString("pt-BR", { weekday: "short" });
    const max = Math.round(daily.temperature_2m_max[idx]);
    const min = Math.round(daily.temperature_2m_min[idx]);
    const code = daily.weather_code[idx];
    const details = getWeatherDetails(code);
    const rainProb = daily.precipitation_probability_max[idx];
    return { dayName, max, min, details, rainProb };
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="h-9 px-3 rounded-full bg-card/60 backdrop-blur-md border border-border/60 hover:border-primary/40 active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm shrink-0">
          <Icon className={cn("h-4 w-4 shrink-0 animate-pulse", currentDetails.color)} />
          <span className="text-xs font-bold tabular-nums text-foreground">{temp}°C</span>
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-xs rounded-3xl bg-card/95 backdrop-blur-xl border border-border/60 p-5 shadow-elevated">
        <DialogHeader className="text-center">
          <DialogTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Tempo Local</DialogTitle>
        </DialogHeader>

        {/* Big Weather Summary */}
        <div className={cn("rounded-2xl bg-gradient-to-b p-5 text-center mt-3 flex flex-col items-center relative overflow-hidden border border-border/40", currentDetails.bg)}>
          <Icon className={cn("h-12 w-12", currentDetails.color)} strokeWidth={1.8} />
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground mt-2 tabular-nums">
            {temp}°C
          </h2>
          <p className="text-xs font-bold text-foreground mt-1.5 capitalize leading-none">{currentDetails.label}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Sensação térmica de {feelsLike}°C</p>
        </div>

        {/* Weather details parameters grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <div className="bg-muted/40 rounded-xl p-3 border border-border/20 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground font-semibold uppercase leading-none">Umidade</p>
              <p className="text-xs font-bold text-foreground mt-1 tabular-nums">{humidity}%</p>
            </div>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 border border-border/20 flex items-center gap-2">
            <Wind className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground font-semibold uppercase leading-none">Vento</p>
              <p className="text-xs font-bold text-foreground mt-1 tabular-nums">{windSpeed} km/h</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 my-3.5" />

        {/* 3-day forecast timeline */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
            <Calendar className="h-3.5 w-3.5 text-primary" /> Próximos Dias
          </p>
          <div className="space-y-2">
            {dailyForecast.map((day: any, i: number) => {
              const DayIcon = day.details.icon;
              return (
                <div key={i} className="flex items-center justify-between px-1 text-xs">
                  <span className="font-semibold text-muted-foreground w-12 capitalize">{day.dayName}</span>
                  <div className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
                    <DayIcon className={cn("h-4 w-4 shrink-0", day.details.color)} />
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px] hidden sm:inline capitalize">{day.details.label}</span>
                    {day.rainProb > 0 && (
                      <span className="text-[9px] font-semibold text-primary/80 tabular-nums">{day.rainProb}% chuva</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 justify-end w-16 text-right tabular-nums">
                    <span className="font-bold text-foreground">{day.max}°</span>
                    <span className="text-muted-foreground text-[10px]">{day.min}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
