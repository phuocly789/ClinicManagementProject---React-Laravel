// src/services/printPdfService.js
import axios from '../axios';

const printPdfService = {
    // In hóa đơn thanh toán
    printPaymentInvoice: async (data) => {
        try {
            const response = await axios.post('/api/print/payment-invoice', data, {
                responseType: 'blob'
            });

            // Tạo URL từ blob và trigger download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `HOA_DON_THANH_TOAN_${data.invoice_code || Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Print payment invoice error:', error);
            throw error;
        }
    },

    // Preview HTML
    previewHTML: async (data) => {
        try {
            const response = await axios.post('/api/print/preview-html', data);
            return response.data;
        } catch (error) {
            console.error('Preview HTML error:', error);
            throw error;
        }
    }
};

export { printPdfService };