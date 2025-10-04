import React from 'react';
import { Table, Button } from 'react-bootstrap';
import Taskbar from '../Components/Taskbar';

const AdminMedicine = () => {
    const medicines = [
        { id: 1, name: 'Paracetamol 500mg', supplier: 'Giám đốc', unit: 'Viên', price: '1,000 VND', quantity: 1500, note: 'Thuốc giảm đau, hạ sốt', status: 'Sửa Xóa' },
        { id: 2, name: 'Amoxicillin 250mg', supplier: 'Khánh sinh', unit: 'Viên', price: '2,500 VND', quantity: 870, note: 'Kháng sinh điều trị nhiễm khuẩn', status: 'Sửa Xóa' },
    ];

    return (
        <div className="d-flex">
            <Taskbar />
            <div className="position-relative w-100 flex-grow-1 ml-5 p-5">
                <h1 className="mb-4">Quản Lý Thuốc</h1>
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3>Danh Sách Thuốc</h3>
                        <Button variant="primary">Thêm Thuốc Mới</Button>
                    </div>
                    <Table striped bordered hover responsive>
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
                            {medicines.map((medicine) => (
                                <tr key={medicine.id}>
                                    <td>{medicine.id}</td>
                                    <td>{medicine.name}</td>
                                    <td>{medicine.supplier}</td>
                                    <td>{medicine.unit}</td>
                                    <td>{medicine.price}</td>
                                    <td>{medicine.quantity}</td>
                                    <td>{medicine.note}</td>
                                    <td>
                                        <span className="text-success">{medicine.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default AdminMedicine;