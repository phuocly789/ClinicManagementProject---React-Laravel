// src/services/printPdfService.js
import axios from '../axios';

const printPdfService = {

    // 🔥 API Xuất PDF - GIỮ NGUYÊN
    printPDF: async (data) => {
        try {
            console.log('📤 Sending PDF data to backend:', {
                type: data.type,
                patient_name: data.patient_name,
                test_results_count: data.test_results?.length || 0
            });

            // ✅ Dùng fetch thay vì axios để tránh interceptor conflict
            const response = await fetch('http://125.212.218.44:8000/api/print/prescription/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/pdf',
                },
                body: JSON.stringify(data),
            });

            console.log('📥 PDF Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error:', errorText);

                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.message || `Server error: ${response.status}`);
                } catch {
                    throw new Error(errorText || `Server returned ${response.status}`);
                }
            }

            const contentType = response.headers.get('content-type');
            console.log('📄 Response Content-Type:', contentType);

            if (!contentType || !contentType.includes('application/pdf')) {
                const errorText = await response.text();
                console.error('❌ Not PDF response:', errorText.substring(0, 200));
                throw new Error('Server returned non-PDF content');
            }

            const blob = await response.blob();
            console.log('📦 Received PDF blob:', {
                size: blob.size,
                type: blob.type
            });

            if (blob.size === 0) {
                throw new Error('PDF file is empty');
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

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


    // 🔥 API Lưu Logo lên Server - XỬ LÝ RESPONSE "OK"
    saveLogo: async (logoData) => {
        try {
            console.log('💾 Saving logo to server:', logoData);

            const response = await axios.post('/api/print/logo/save', logoData);

            console.log('✅ Logo saved raw response:', response);
            console.log('✅ Logo saved data:', response.data);

            // 🔥 XỬ LÝ RESPONSE LÀ STRING "OK"
            const responseData = response.data;

            // Nếu response là string "OK" hoặc "success"
            if (typeof responseData === 'string') {
                if (responseData.toLowerCase() === 'ok' || responseData.toLowerCase() === 'success') {
                    return {
                        success: true,
                        message: 'Logo saved successfully',
                        // Giả sử URL logo sẽ được lưu ở một endpoint cố định
                        url: `/storage/logos/clinic_${logoData.clinic_id || 1}.png`
                    };
                }
            }

            // 🔥 XỬ LÝ CÁC FORMAT RESPONSE KHÁC
            // Format 1: Có success property
            if (responseData && responseData.success !== undefined) {
                return responseData;
            }

            // Format 2: Có trực tiếp URL
            if (responseData && responseData.url) {
                return {
                    success: true,
                    url: responseData.url,
                    message: 'Logo saved successfully'
                };
            }

            // Format 3: Response trực tiếp là string URL
            if (responseData && typeof responseData === 'string' && responseData.includes('/storage/')) {
                return {
                    success: true,
                    url: responseData,
                    message: 'Logo saved successfully'
                };
            }

            // 🔥 MẶC ĐỊNH: Nếu không có data hoặc data không xác định
            console.warn('⚠️ Unknown response format, assuming success');
            return {
                success: true,
                message: 'Logo saved successfully (assumed)',
                url: `/storage/logos/clinic_${logoData.clinic_id || 1}.png`
            };

        } catch (error) {
            console.error('❌ Save logo error:', error);

            const errorMessage = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Lỗi khi lưu logo';

            throw new Error(errorMessage);
        }
    },

    // 🔥 API Tải Logo từ Server
    getLogo: async (clinicId = 1) => {
        try {
            console.log('📥 Loading logo from server, clinic_id:', clinicId);

            const response = await axios.get(`/api/print/logo/${clinicId}`);

            console.log('✅ Logo loaded raw response:', response);
            console.log('✅ Logo loaded data:', response.data);

            const responseData = response.data;

            // 🔥 XỬ LÝ RESPONSE LÀ STRING "OK" HOẶC URL
            if (typeof responseData === 'string') {
                if (responseData.toLowerCase() === 'ok') {
                    return {
                        success: true,
                        url: `/storage/logos/clinic_${clinicId}.png`,
                        message: 'Logo loaded successfully'
                    };
                }
                if (responseData.includes('/storage/')) {
                    return {
                        success: true,
                        url: responseData,
                        message: 'Logo loaded successfully'
                    };
                }
            }

            // 🔥 XỬ LÝ CÁC FORMAT KHÁC
            if (responseData && responseData.success !== undefined) {
                return responseData;
            }

            if (responseData && responseData.url) {
                return {
                    success: true,
                    url: responseData.url,
                    message: 'Logo loaded successfully'
                };
            }

            // 🔥 KHÔNG CÓ LOGO
            return {
                success: false,
                url: '',
                message: 'No logo found'
            };

        } catch (error) {
            console.error('❌ Load logo error:', error);

            if (error.response?.status === 404) {
                return {
                    success: false,
                    message: 'Không tìm thấy logo',
                    url: ''
                };
            }

            const errorMessage = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Lỗi khi tải logo';

            throw new Error(errorMessage);
        }
    },

    // 🔥 API Xóa Logo khỏi Server
    deleteLogo: async (clinicId = 1) => {
        try {
            console.log('🗑️ Deleting logo from server, clinic_id:', clinicId);

            const response = await axios.delete('/api/print/logo/delete', {
                data: { clinic_id: clinicId }
            });

            console.log('✅ Logo deleted raw response:', response);
            console.log('✅ Logo deleted data:', response.data);

            const responseData = response.data;

            // 🔥 XỬ LÝ RESPONSE LÀ STRING "OK"
            if (typeof responseData === 'string') {
                if (responseData.toLowerCase() === 'ok' || responseData.toLowerCase() === 'success') {
                    return {
                        success: true,
                        message: 'Logo deleted successfully'
                    };
                }
            }

            // 🔥 XỬ LÝ CÁC FORMAT KHÁC
            if (responseData && responseData.success !== undefined) {
                return responseData;
            }

            if (responseData && responseData.message) {
                return {
                    success: true,
                    message: responseData.message
                };
            }

            // 🔥 MẶC ĐỊNH
            console.warn('⚠️ Unknown delete response format, assuming success');
            return {
                success: true,
                message: 'Logo deleted successfully (assumed)'
            };

        } catch (error) {
            console.error('❌ Delete logo error:', error);

            const errorMessage = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Lỗi khi xóa logo';

            throw new Error(errorMessage);
        }
    },

    // 🔥 API Preview HTML (nếu có)
    previewHTML: async (data) => {
        try {
            console.log('👀 Preview HTML request:', {
                type: data.type,
                patient_name: data.patient_name
            });

            const response = await axios.post('/api/print/preview-html', data);

            console.log('✅ HTML preview generated successfully');
            return response.data;

        } catch (error) {
            console.error('❌ Preview HTML error:', error);

            // Fallback: trả về data gốc nếu API không tồn tại
            if (error.response?.status === 404) {
                console.warn('⚠️ Preview HTML API not found, returning original data');
                return { html: '', data: data };
            }

            throw new Error(error.response?.data?.message || 'Lỗi khi tạo preview HTML');
        }
    },

    // 🔥 API Health Check (kiểm tra kết nối)
    healthCheck: async () => {
        try {
            const response = await axios.get('/api/print/health');
            return response.data;
        } catch (error) {
            console.error('❌ Health check failed:', error);
            throw new Error('Không thể kết nối đến server PDF');
        }
    },

    // 🔥 API Get Template Settings (lấy cài đặt mẫu)
    getTemplateSettings: async (templateType) => {
        try {
            const response = await axios.get(`/api/print/templates/${templateType}/settings`);
            return response.data;
        } catch (error) {
            console.warn('⚠️ Template settings API not available, using defaults');
            // Trả về settings mặc định nếu API không tồn tại
            return getDefaultTemplateSettings(templateType);
        }
    }
};

// 🔥 Hàm helper: Settings mặc định cho các template
const getDefaultTemplateSettings = (templateType) => {
    const defaults = {
        prescription: {
            customTitle: 'TOA THUỐC',
            showDoctorSignature: true,
            showClinicInfo: true
        },
        service: {
            customTitle: 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
            showDoctorSignature: true,
            showInstructions: true
        },
        payment: {
            customTitle: 'HÓA ĐƠN THANH TOÁN',
            showPaymentDetails: true,
            showTaxInfo: true
        },
        test_result: {
            customTitle: 'PHIẾU KẾT QUẢ XÉT NGHIỆM',
            showReferenceRanges: true,
            showTestMethod: true
        }
    };

    return {
        success: true,
        settings: defaults[templateType] || defaults.prescription
    };
};

export { printPdfService };