import { supabase } from './supabase';

/**
 * Asaas Integration Service
 * This service acts as a bridge to Supabase Edge Functions
 * ensuring the ASAAS_API_KEY is never exposed in the browser.
 */

export interface AsaasPaymentRequest {
  company_id: string;
  plan_id: string;
  amount: number;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  customerName: string;
  customerEmail: string;
  customerCnpj: string;
}

export const createAsaasCheckout = async (request: AsaasPaymentRequest) => {
  try {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: request
    });

    if (error) throw error;
    return data;
  } catch (err: any) {
    console.error('Erro ao processar checkout Asaas:', err.message);
    throw err;
  }
};

export const fetchPaymentStatus = async (paymentId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('asaas-check-status', {
      body: { paymentId }
    });

    if (error) throw error;
    return data;
  } catch (err: any) {
    console.error('Erro ao consultar status Asaas:', err.message);
    throw err;
  }
};
