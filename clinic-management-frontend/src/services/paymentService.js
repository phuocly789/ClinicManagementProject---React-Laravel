// src/services/paymentService.js
import axios from '../axios';

const paymentService = {
  // ==================== INVOICE APIs ====================
  
  getInvoices: async (filters = {}) => {
    console.log('📋 Getting invoices with filters:', filters);
    
    try {
      const response = await axios.get('/api/payments/invoices', {
        params: filters
      });
      console.log('✅ Invoices fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Get invoices error:', error);
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

  createPayment: async (orderData) => {
    console.log('💳 Creating payment:', orderData);
    
    try {
      const response = await axios.post('/api/payments/momo/create', orderData);
      console.log('✅ Payment created');
      return response;
    } catch (error) {
      console.error('❌ Create payment error:', error);
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
      const response = await axios.get('/api/payments/momo/return', {
        params: { orderId }
      });
      console.log('✅ Payment result checked');
      return response;
    } catch (error) {
      console.error('❌ Check payment result error:', error);
      throw error;
    }
  }
};

export { paymentService };