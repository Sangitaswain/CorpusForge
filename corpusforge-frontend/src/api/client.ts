import axios from 'axios';

// No static Content-Type header: axios already sets application/json automatically for a
// plain object request body (see api/query.ts), and a static header here forces every GET
// request to carry it too, unnecessarily turning a simple cross-origin GET into a
// preflighted one.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.response?.data?.detail || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);
