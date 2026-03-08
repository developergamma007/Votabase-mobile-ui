import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PROD_BASE_URL = 'http://api.iswot.in:8081';
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
const DEV_BASE_URL = `http://${DEV_HOST}:8082`;
const BASE_URL = __DEV__ ? DEV_BASE_URL : PROD_BASE_URL;

// Create Axios instance
const apiClient = axios.create({
  baseURL: BASE_URL, // must NOT end with a slash
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor — runs before every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('X_INIT_TOKEN'); 
   if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
     const fullUrl = `${config.baseURL}${config.url}`;
    
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error );
    return Promise.reject(error);
  }
);

export default apiClient;
