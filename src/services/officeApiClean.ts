import { getApiBaseUrl } from '@/services/invmisApi';

export interface ApiOfficeResponse {
  intOfficeID: number;
  strOfficeName: string;
  strOfficeDescription: string;
  strTelephoneNumber: string;
  strEmail: string;
  OfficeCode: string;
  IS_ACT: boolean;
  IS_DELETED?: boolean;
}

export interface ApiWingResponse {
  Id: number;
  Name: string;
  ShortName: string;
  FocalPerson: string;
  ContactNo: string;
  Creator: string | null;
  CreateDate: string;
  Modifier: string | null;
  ModifyDate: string | null;
  OfficeID: number;
  IS_ACT: boolean;
  HODID: string | null;
  HODName: string | null;
  WingCode: string;
}

export interface ApiDecResponse {
  intAutoID: number;
  WingID: number;
  DECName: string;
  DECAcronym: string;
  DECAddress: string;
  Location: string;
  DECCode: string;
  IS_ACT: boolean;
  HODID: string | null;
  HODName: string | null;
}

const getApiBase = () => getApiBaseUrl().replace('/api', '');

class OfficeApiService {
  async getOffices(): Promise<ApiOfficeResponse[]> {
    try {
      const response = await fetch(`${getApiBase()}/api/offices`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('📊 Fetched offices from tblOffices:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ Error fetching offices from backend:', error);
      return [];
    }
  }

  async getWings(): Promise<ApiWingResponse[]> {
    try {
      const response = await fetch(`${getApiBase()}/api/wings`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('📊 Fetched wings from WingsInformation:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ Error fetching wings from backend:', error);
      return [];
    }
  }

  async getDecs(): Promise<ApiDecResponse[]> {
    try {
      const response = await fetch(`${getApiBase()}/api/decs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('📊 Fetched DECs from DEC_MST:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('❌ Error fetching DECs from backend:', error);
      return [];
    }
  }

  async getOfficeNames(ids: string[]): Promise<{ [key: string]: string }> {
    try {
      const response = await fetch(`${getApiBase()}/api/offices/names?ids=${ids.join(',')}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching office names:', error);
      return {};
    }
  }

  async getWingNames(ids: string[]): Promise<{ [key: string]: string }> {
    try {
      const response = await fetch(`${getApiBase()}/api/wings/names?ids=${ids.join(',')}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching wing names:', error);
      return {};
    }
  }

  async getDecNames(ids: string[]): Promise<{ [key: string]: string }> {
    try {
      const response = await fetch(`${getApiBase()}/api/decs/names?ids=${ids.join(',')}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching DEC names:', error);
      return {};
    }
  }
}

export const officeApi = new OfficeApiService();