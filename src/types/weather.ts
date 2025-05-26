export interface WeatherData {
  locationName: string;
  date: string;
  overallDescription: string;
  tempMin: number;
  tempMax: number;
  sunrise: string;
  sunset: string;
  humidityAvg: number;
  windAvg: number;
  hourly: HourlyForecast[];
}

export interface HourlyForecast {
  time: string;
  temp: number;
  feelsLike: number;
  description: string;
  pop: number;
  windSpeed: number;
  windGust: number;
  icon: string;
} 