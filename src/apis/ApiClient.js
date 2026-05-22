import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Production nginx redirects HTTP → HTTPS; release builds must use HTTPS or axios fails with "Network Error".
const PROD_BASE_URL = 'https://13.233.40.235';
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEV_BASE_URL = `http://${DEV_HOST}:8000`;
const BASE_URL = __DEV__ ? DEV_BASE_URL : PROD_BASE_URL;
console.log(`[API_BASE] ${BASE_URL} platform=${Platform.OS} __DEV__=${__DEV__}`);

// Create Axios instance
const apiClient = axios.create({
  baseURL: BASE_URL, // must NOT end with a slash
  headers: {
    "Content-Type": "application/json",
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  timeout: 30000,
});

// Interceptor — runs before every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('X_INIT_TOKEN'); 
   if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
     const fullUrl = `${config.baseURL}${config.url}`;
     console.log('API Request:', fullUrl);
    
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    const blocked =
      status === 403 ||
      detail === 'Please contact Admin' ||
      String(detail || '').toLowerCase().includes('blocked');

    if (blocked) {
      await AsyncStorage.multiRemove([
        'token',
        'X_INIT_TOKEN',
        'userInfo',
        'role',
        'tenantId',
        'assemblyCode',
      ]);
    }

    console.log('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
