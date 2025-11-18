// src/services/printPdfService.js
import axios from '../axios';

const printPdfService = {

printPDF: async (data) => {
    try {
        console.log('📤 Sending PDF data to backend:', {
            type: data.type,
            patient_name: data.patient_name,
            test_results_count: data.test_results?.length || 0
        });

        // ✅ SỬA: Dùng fetch thay vì axios để tránh interceptor conflict
        const response = await fetch('http://localhost:8000/api/print/prescription/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/pdf',
            },
            body: JSON.stringify(data),
        });

        console.log('📥 PDF Response status:', response.status);

        if (!response.ok) {
            // Xử lý lỗi từ server
            const errorText = await response.text();
            console.error('❌ Server error:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || `Server error: ${response.status}`);
            } catch {
                throw new Error(errorText || `Server returned ${response.status}`);
            }
        }

        // ✅ KIỂM TRA CONTENT TYPE
        const contentType = response.headers.get('content-type');
        console.log('📄 Response Content-Type:', contentType);

        if (!contentType || !contentType.includes('application/pdf')) {
            const errorText = await response.text();
            console.error('❌ Not PDF response:', errorText.substring(0, 200));
            throw new Error('Server returned non-PDF content');
        }

        // ✅ LẤY BLOB DATA
        const blob = await response.blob();
        console.log('📦 Received PDF blob:', {
            size: blob.size,
            type: blob.type
        });

        if (blob.size === 0) {
            throw new Error('PDF file is empty');
        }

        // ✅ TẠO VÀ TẢI FILE
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Xác định tên file
        let fileName = '';
        const timestamp = Date.now();
        
        switch (data.type) {
            case 'prescription':
                fileName = `TOA_THUOC_${data.patient_name || 'benh_nhan'}_${timestamp}.pdf`;
                break;
            case 'service':
                fileName = `PHIEU_DICH_VU_${data.patient_name || 'benh_nhan'}_${timestamp}.pdf`;
                break;
            case 'payment':
                fileName = `HOA_DON_${data.invoice_code || 'HD'}_${timestamp}.pdf`;
                break;
            case 'test_result':
                fileName = `KET_QUA_XET_NGHIEM_${data.patient_name || 'benh_nhan'}_${timestamp}.pdf`;
                break;
            default:
                fileName = `DOCUMENT_${timestamp}.pdf`;
        }

        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('✅ PDF downloaded successfully:', fileName);

        return { 
            success: true,
            fileName: fileName,
            size: blob.size
        };
        
    } catch (error) {
        console.error('❌ Print PDF error:', error);
        
        let errorMessage = 'Lỗi khi tạo PDF';
        
        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Không tìm thấy API in PDF.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Lỗi server khi tạo PDF. Vui lòng thử lại sau.';
        } else if (error.message.includes('non-PDF')) {
            errorMessage = 'Server trả về dữ liệu không phải PDF.';
        } else {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
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