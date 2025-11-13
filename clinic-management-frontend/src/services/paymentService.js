// src/services/paymentService.js
import axios from '../axios';

const paymentService = {
  // ==================== INVOICE APIs ====================
  
  getInvoices: async (filters = {}) => {
    console.log('📋 Getting invoices with filters:', filters);
    try {
      const response = await axios.get('/api/payments/invoices', { params: filters });
      console.log('✅ Invoices fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Get invoices error:', error);
      throw error;
    }
  },

  getPaymentHistory: async (filters = {}) => {
    console.log('💰 Getting payment history with filters:', filters);
    try {
      const response = await axios.get('/api/payments/invoices/payment-history', { params: filters });
      console.log('✅ Payment history fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Get payment history error:', error);
      throw error;
    }
  },

  getInvoiceDetail: async (invoiceId) => {
    console.log('📄 Getting invoice detail:', invoiceId);
    try {
      const response = await axios.get(`/api/payments/invoices/${invoiceId}`);
      console.log('✅ Invoice detail fetched');
      return response;
    } catch (error) {
      console.error('❌ Get invoice detail error:', error);
      throw error;
    }
  },

  createInvoice: async (invoiceData) => {
    console.log('➕ Creating new invoice:', invoiceData);
    try {
      const response = await axios.post('/api/payments/invoices', invoiceData);
      console.log('✅ Invoice created');
      return response;
    } catch (error) {
      console.error('❌ Create invoice error:', error);
      throw error;
    }
  },

  // ==================== PAYMENT APIs ====================

  createPayment: async (paymentData) => {
    console.log('💳 [React] Creating payment with data:', paymentData);
    
    // VALIDATE DATA
    if (!paymentData.paymentMethod) {
      console.error('❌ [React] Missing paymentMethod');
      throw new Error('Thiếu phương thức thanh toán');
    }

    console.log('🔍 [React] Payment method:', paymentData.paymentMethod);
    
    try {
      const response = await axios.post('/api/payments/momo/create', paymentData);
      console.log('✅ [React] Payment created successfully:', response.data);
      return response;
    } catch (error) {
      console.error('❌ [React] Create payment error:', error.response?.data || error.message);
      throw error;
    }
  },

  checkPaymentStatus: async (orderId) => {
    console.log('🔍 Checking payment status:', orderId);
    try {
      const response = await axios.get(`/api/payments/status/${orderId}`);
      console.log('✅ Payment status checked');
      return response;
    } catch (error) {
      console.error('❌ Check payment status error:', error);
      throw error;
    }
  },

  checkPaymentResult: async (orderId) => {
    console.log('📝 Checking payment result:', orderId);
    try {
      const response = await axios.get('/api/payments/momo/return', { params: { orderId } });
      console.log('✅ Payment result checked');
      return response;
    } catch (error) {
      console.error('❌ Check payment result error:', error);
      throw error;
    }
  }
};

export { paymentService };