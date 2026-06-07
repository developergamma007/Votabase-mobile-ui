import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Production: use your public API host (same as web). Raw IP works but stores prefer a stable domain.
const PROD_BASE_URL = 'https://votabase.iswot.in';
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
    const detailText = detail != null ? String(detail) : '';
    const isAccountBlocked =
      detailText === 'Please contact Admin' ||
      /blocked|contact admin/i.test(detailText);

    if (status === 403 && isAccountBlocked) {
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
