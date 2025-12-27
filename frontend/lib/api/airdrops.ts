// Airdrops API Service

import { api } from './client';
import type { AirdropCampaign, AirdropEntry } from '@/types/api';

export const airdropsApi = {
  getActiveCampaigns: (): Promise<AirdropCampaign[]> => {
    return api.get<AirdropCampaign[]>('/airdrops');
  },

  getAllCampaigns: (): Promise<AirdropCampaign[]> => {
    return api.get<AirdropCampaign[]>('/airdrops/all');
  },

  getCampaignById: (id: string): Promise<AirdropCampaign> => {
    return api.get<AirdropCampaign>(`/airdrops/${id}`);
  },

  participate: (campaignId: string, walletAddress: string): Promise<{
    id: string;
    campaignId: string;
    walletAddress: string;
    allocatedAmount: string;
    isEligible: boolean;
    message: string;
  }> => {
    return api.post(`/airdrops/${campaignId}/participate`, { walletAddress });
  },

  completeTask: (campaignId: string, taskId: string, proof?: string): Promise<{
    taskId: string;
    completed: boolean;
    isEligible: boolean;
    tasksCompleted: Record<string, boolean>;
  }> => {
    return api.post(`/airdrops/${campaignId}/complete-task`, { taskId, proof });
  },

  getMyEntries: (): Promise<AirdropEntry[]> => {
    return api.get<AirdropEntry[]>('/airdrops/my-entries');
  },

  // Admin endpoints
  createCampaign: (data: {
    title: string;
    description?: string;
    totalAllocation: number;
    perUserAmount?: number;
    maxParticipants?: number;
    startAt?: string;
    endAt?: string;
    tasks?: { id: string; type: string; description: string; url?: string }[];
  }): Promise<{ id: string; title: string; status: string; message: string }> => {
    return api.post('/airdrops', data);
  },

  updateCampaign: (id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    startAt?: string;
    endAt?: string;
  }): Promise<{ id: string; title: string; status: string; message: string }> => {
    return api.patch(`/airdrops/${id}`, data);
  },

  distributeCampaign: (id: string): Promise<{
    message: string;
    totalDistributed: string;
    entriesProcessed: number;
  }> => {
    return api.post(`/airdrops/${id}/distribute`);
  },
};
