import { React, useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Spinner } from 'react-bootstrap';
import Taskbar from '../Components/Taskbar';
import Pagination from '../Components/Pagination/Pagination';
const API_BASE_URL = 'http://localhost:8000';

const AdminMedicine = () => {
    const [medicines, setMedicines] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const cache = useRef(new Map()); // Cache dữ liệu theo page
    const debounceRef = useRef(null); // Debounce API calls

    const fetchMedicines = useCallback(async (page = 1) => {
        // Kiểm tra cache
        if (cache.current.has(page)) {
            const { data, last_page } = cache.current.get(page);
            setMedicines(data);
            setPageCount(last_page);
            setCurrentPage(page - 1);
            return;
        }

        // Debounce fetch
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/medicines?page=${page}`);
                if (!response.ok) throw new Error('Failed to fetch');
                const paginator = await response.json();
                cache.current.set(page, { data: paginator.data, last_page: paginator.last_page });
                setMedicines(paginator.data);
                setPageCount(paginator.last_page);
                setCurrentPage(page - 1);
            } catch (error) {
                console.error('Error fetching medicines:', error);
                // Có thể thêm toast notification
            } finally {
                setIsLoading(false);
            }
        }, 300); // Debounce 300ms
    }, []);

    useEffect(() => {
        fetchMedicines(1);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current); // Cleanup
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
                                                <span><a className="text-danger" href="#">Xóa</a></span>
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
                            isLoading={isLoading} // Truyền isLoading để disable nút khi đang fetch
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminMedicine;