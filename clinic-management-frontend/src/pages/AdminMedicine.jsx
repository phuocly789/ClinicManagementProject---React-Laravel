import { React, useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Spinner } from 'react-bootstrap';
import Taskbar from '../Components/Taskbar';
import Pagination from '../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../Components/CustomToast/DeleteConfirmModal';

const API_BASE_URL = 'http://localhost:8000/api';

const AdminMedicine = () => {
    const [medicines, setMedicines] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [medicineToDelete, setMedicineToDelete] = useState(null);
    const cache = useRef(new Map());
    const debounceRef = useRef(null);

    const fetchMedicines = useCallback(async (page = 1) => {
        if (cache.current.has(page)) {
            const { data, last_page } = cache.current.get(page);
            setMedicines(data);
            setPageCount(last_page);
            setCurrentPage(page - 1);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/medicines?page=${page}`, {
                    headers: {
                        'Accept': 'application/json',
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const paginator = await response.json();
                cache.current.set(page, { data: paginator.data, last_page: paginator.last_page });
                setMedicines(paginator.data);
                setPageCount(paginator.last_page);
                setCurrentPage(page - 1);
            } catch (error) {
                console.error('Error fetching medicines:', error);
                alert(`Lỗi khi tải danh sách thuốc: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        }, 300);
    }, []);

    const getCsrfToken = async () => {
        await fetch('http://localhost:8000/sanctum/csrf-cookie', {
            method: 'GET',
            credentials: 'include',
        });
    };

    const handleDelete = useCallback(async (medicineId) => {
        try {
            setIsLoading(true);
            await getCsrfToken(); // Lấy CSRF token trước khi gửi DELETE
            const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include', // Gửi cookie chứa CSRF token
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const result = await response.json();
            alert(result.message);

            cache.current.delete(currentPage + 1);
            await fetchMedicines(currentPage + 1);
        } catch (error) {
            console.error('Error deleting medicine:', error);
            alert(`Lỗi khi xóa thuốc: ${error.message}`);
        } finally {
            setIsLoading(false);
            setShowDeleteModal(false);
            setMedicineToDelete(null);
        }
    }, [currentPage, fetchMedicines]);

    const handleShowDeleteModal = (medicineId) => {
        setMedicineToDelete(medicineId);
        setShowDeleteModal(true);
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setMedicineToDelete(null);
    };

    useEffect(() => {
        fetchMedicines(1);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchMedicines]);

    const handlePageChange = ({ selected }) => {
        const nextPage = selected + 1;
        fetchMedicines(nextPage);
    };

    const formatVND = (price) => {
        return Number(price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    };

    return (
        <div className="d-flex">
            <Taskbar />
            <div className="position-relative w-100 flex-grow-1 ms-5 p-5">
                <h1 className="mb-4">Quản Lý Thuốc</h1>
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3>Danh Sách Thuốc</h3>
                        <Button variant="primary">Thêm Thuốc Mới</Button>
                    </div>
                    <div className="table-responsive" style={{ transition: 'opacity 0.3s ease' }}>
                        <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
                            <thead>
                                <tr>
                                    <th>Mã Thuốc</th>
                                    <th>Tên Thuốc</th>
                                    <th>Loại Thuốc</th>
                                    <th>Đơn Vị</th>
                                    <th>Giá Bán</th>
                                    <th>Tồn Kho</th>
                                    <th>Mô Tả</th>
                                    <th>Hành Động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <Spinner animation="border" variant="primary" />
                                        </td>
                                    </tr>
                                ) : medicines.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            Trống
                                        </td>
                                    </tr>
                                ) : (
                                    medicines.map((medicine) => (
                                        <tr key={medicine.MedicineId}>
                                            <td>{medicine.MedicineId}</td>
                                            <td>{medicine.MedicineName}</td>
                                            <td>{medicine.MedicineType}</td>
                                            <td>{medicine.Unit}</td>
                                            <td>{formatVND(medicine.Price)}</td>
                                            <td>{medicine.StockQuantity}</td>
                                            <td>{medicine.Description}</td>
                                            <td>
                                                <span><a className="text-success" href="#">Sửa</a></span>
                                                <span className="px-1">/</span>
                                                <span>
                                                    <a
                                                        className="text-danger"
                                                        href="#"
                                                        onClick={() => handleShowDeleteModal(medicine.MedicineId)}
                                                    >
                                                        Xóa
                                                    </a>
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {pageCount > 1 && (
                        <Pagination
                            pageCount={pageCount}
                            onPageChange={handlePageChange}
                            currentPage={currentPage}
                            isLoading={isLoading}
                        />
                    )}
                </div>
                <ConfirmDeleteModal
                    isOpen={showDeleteModal}
                    title="Xác nhận xóa"
                    message="Bạn có chắc chắn muốn xóa thuốc này?"
                    onConfirm={() => handleDelete(medicineToDelete)}
                    onCancel={handleCancelDelete}
                />
            </div>
        </div>
    );
};

export default AdminMedicine;