import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Attach JWT token to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login    = (data) => API.post('/auth/login', data);

// Products
export const getProducts    = (params) => API.get('/products', { params });
export const getMyProducts  = ()       => API.get('/products/mine');
export const addProduct     = (data)   => API.post('/products', data);
export const updateProduct  = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct  = (id)     => API.delete(`/products/${id}`);

// Orders
export const placeOrder = (data) => API.post('/orders', data);
export const getOrders  = ()     => API.get('/orders');

export default API;
