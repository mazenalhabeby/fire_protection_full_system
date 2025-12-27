// Marketplace API Service

import { api } from './client';
import type {
  ProductCategory,
  Product,
  Order,
  CreateOrderRequest,
} from '@/types/api';

export const marketplaceApi = {
  // Categories
  getCategories: (): Promise<ProductCategory[]> => {
    return api.get<ProductCategory[]>('/marketplace/categories');
  },

  createCategory: (data: {
    name: string;
    description?: string;
    imageUrl?: string;
  }): Promise<ProductCategory> => {
    return api.post<ProductCategory>('/marketplace/categories', data);
  },

  // Products
  getProducts: (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    inStock?: boolean;
  }): Promise<{
    products: Product[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/marketplace/products', params);
  },

  getProductById: (id: string): Promise<Product> => {
    return api.get<Product>(`/marketplace/products/${id}`);
  },

  createProduct: (data: {
    name: string;
    description?: string;
    categoryId: string;
    priceHbct: number;
    priceUsd?: number;
    stock: number;
    images?: { url: string; isPrimary?: boolean }[];
  }): Promise<Product> => {
    return api.post<Product>('/marketplace/products', data);
  },

  updateProduct: (id: string, data: {
    name?: string;
    description?: string;
    categoryId?: string;
    priceHbct?: number;
    priceUsd?: number;
    isActive?: boolean;
  }): Promise<Product> => {
    return api.patch<Product>(`/marketplace/products/${id}`, data);
  },

  deleteProduct: (id: string): Promise<{ message: string }> => {
    return api.delete(`/marketplace/products/${id}`);
  },

  updateInventory: (id: string, data: {
    stock?: number;
    reserved?: number;
  }): Promise<{ productId: string; stock: number; reserved: number }> => {
    return api.patch(`/marketplace/products/${id}/inventory`, data);
  },

  // Orders
  createOrder: (data: CreateOrderRequest): Promise<{
    orderId: string;
    totalHbct: string;
    status: string;
    message: string;
  }> => {
    return api.post('/marketplace/orders', data);
  },

  getOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    orders: Order[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/marketplace/orders', params);
  },

  getOrderById: (id: string): Promise<Order & {
    items: { productId: string; productName: string; quantity: number; priceHbct: string }[];
  }> => {
    return api.get(`/marketplace/orders/${id}`);
  },

  updateOrderStatus: (id: string, data: {
    status: string;
    trackingNumber?: string;
  }): Promise<{ orderId: string; status: string; message: string }> => {
    return api.patch(`/marketplace/orders/${id}/status`, data);
  },
};
