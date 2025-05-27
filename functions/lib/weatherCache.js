"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherData = void 0;
exports.fetchWeatherData = fetchWeatherData;
const functions = __importStar(require("firebase-functions"));
const admin_1 = require("./lib/firebase/admin");
const axios_1 = __importDefault(require("axios"));
const secret_manager_1 = require("@google-cloud/secret-manager");
const secretManager = new secret_manager_1.SecretManagerServiceClient();
async function getSecret(secretName) {
    var _a, _b;
    const [version] = await secretManager.accessSecretVersion({
        name: `projects/shut-up-and-run/secrets/${secretName}/versions/latest`,
    });
    return ((_b = (_a = version.payload) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.toString()) || '';
}
async function fetchWeatherData(location, unit = 'imperial') {
    console.log(`[WeatherCache] Fetching weather data for ${location} with unit ${unit}`);
    // Normalize location for cache key
    const normalizedLocation = location.toLowerCase().replace(/[\s,]+/g, '-');
    const cacheRef = admin_1.db.collection('weatherCache').doc(`${normalizedLocation}_${unit}`);
    try {
        // Check cache first
        const cacheDoc = await cacheRef.get();
        if (cacheDoc.exists) {
            const cachedData = cacheDoc.data();
            const cacheTime = cachedData.timestamp.toDate();
            const now = new Date();
            // Cache is valid for 1 hour
            if (cacheTime && (now.getTime() - cacheTime.getTime() < 3600000)) {
                console.log(`[WeatherCache] Using cached data for ${location} (cached at ${cacheTime.toISOString()})`);
                return cachedData.weatherData;
            }
            console.log(`[WeatherCache] Cache expired for ${location}, fetching fresh data`);
        }
        else {
            console.log(`[WeatherCache] No cache found for ${location}, fetching fresh data`);
        }
        // Get API key from Secret Manager
        const apiKey = await getSecret('OPENWEATHERMAP_API_KEY');
        if (!apiKey) {
            throw new Error('OpenWeatherMap API key not found in Secret Manager');
        }
        // Fetch new data from OpenWeatherMap
        console.log(`[WeatherCache] Fetching from OpenWeatherMap API for ${location}`);
        const response = await axios_1.default.get(`https://api.openweathermap.org/data/2.5/forecast?q=${location}&units=${unit}&appid=${apiKey}`);
        if (!response.data || !response.data.list || !response.data.city) {
            throw new Error('Invalid response from OpenWeatherMap API');
        }
        const weatherData = {
            locationName: response.data.city.name,
            date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
            overallDescription: response.data.list[0].weather[0].description,
            tempMin: Math.min(...response.data.list.map((item) => item.main.temp_min)),
            tempMax: Math.max(...response.data.list.map((item) => item.main.temp_max)),
            sunrise: new Date(response.data.city.sunrise * 1000).toLocaleTimeString(),
            sunset: new Date(response.data.city.sunset * 1000).toLocaleTimeString(),
            humidityAvg: response.data.list.reduce((acc, item) => acc + item.main.humidity, 0) / response.data.list.length,
            windAvg: response.data.list.reduce((acc, item) => acc + item.wind.speed, 0) / response.data.list.length,
            hourly: response.data.list.slice(0, 8).map((item) => ({
                time: new Date(item.dt * 1000).toLocaleTimeString(),
                temp: Math.round(item.main.temp),
                feelsLike: Math.round(item.main.feels_like),
                description: item.weather[0].description,
                pop: Math.round(item.pop * 100),
                windSpeed: item.wind.speed,
                windGust: item.wind.gust,
                icon: item.weather[0].icon
            }))
        };
        // Update cache in Firestore
        console.log(`[WeatherCache] Updating Firestore cache for ${location}`);
        await cacheRef.set({
            weatherData,
            timestamp: new Date()
        });
        return weatherData;
    }
    catch (error) {
        console.error(`[WeatherCache] Error fetching weather data for ${location}:`, error);
        throw new functions.https.HttpsError('internal', `Failed to fetch weather data: ${error.message}`);
    }
}
exports.getWeatherData = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    const allowedOrigins = [
        'https://shut-up-and-run.web.app',
        'https://shut-up-and-run.firebaseapp.com',
        'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    else {
        res.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        // Get auth token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Optionally verify token here if needed
        // const token = authHeader.split('Bearer ')[1];
        // ...
        // Get location and unit from query or body
        const location = req.query.location || req.body.location;
        const unit = req.query.unit || req.body.unit || 'imperial';
        if (!location) {
            res.status(400).json({ error: 'Location is required' });
            return;
        }
        const weatherData = await fetchWeatherData(location, unit);
        res.status(200).json(weatherData);
    }
    catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch weather data' });
    }
});
//# sourceMappingURL=weatherCache.js.map