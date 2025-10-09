import React, { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";


const PrescriptionModalContent = ({ onSubmit, onClose, defaultData = null }) => {
  const [medicine, setMedicine] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dosage, setDosage] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // 🔹 Khi sửa thuốc, tự động điền dữ liệu vào form
  useEffect(() => {
    if (defaultData) {
      setMedicine(defaultData.medicine || "");
      setQuantity(defaultData.quantity || "");
      setDosage(defaultData.dosage || "");
    } else {
      // Reset khi thêm mới
      setMedicine("");
      setQuantity("");
      setDosage("");
    }
    setIsDirty(false);
  }, [defaultData]);

  // Theo dõi thay đổi form
  const handleInputChange = (setter, value) => {
    setter(value);
    if (!isDirty) {
      setIsDirty(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!medicine || !quantity || !dosage) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin!",
        text: "Vui lòng điền đầy đủ thông tin thuốc trước khi lưu.",
        confirmButtonText: "Đã hiểu",
        confirmButtonColor: "#0d6efd",
      });
      return;
    }

    const isEditing = !!defaultData;

    // ✅ Hộp thoại xác nhận thêm hoặc sửa thuốc
    const result = await Swal.fire({
      title: isEditing ? "Xác nhận cập nhật thuốc?" : "Xác nhận thêm thuốc?",
      text: isEditing
        ? `Bạn có chắc chắn muốn cập nhật thông tin cho "${medicine}" không?`
        : `Bạn có chắc chắn muốn thêm "${medicine}" vào đơn không?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: isEditing ? "Cập nhật" : "Thêm thuốc",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#0d6efd",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
      customClass: {
        popup: "rounded-4 shadow",
      },
    });

    if (result.isConfirmed) {
      onSubmit({ medicine, quantity, dosage });

      // ✅ Hiện thông báo kết quả
      Swal.fire({
        icon: "success",
        title: isEditing ? "Đã cập nhật thuốc!" : "Đã thêm thuốc!",
        text: isEditing
          ? `${medicine} đã được cập nhật thành công.`
          : `${medicine} đã được thêm vào đơn.`,
        timer: 1500,
        showConfirmButton: false,
      });

      // reset chỉ khi thêm thuốc mới
      if (!isEditing) {
        setMedicine("");
        setQuantity("");
        setDosage("");
      }
      setIsDirty(false);
      onClose(); // Close modal sau khi submit thành công
    }
  };

  // Xử lý hủy với confirm nếu có thay đổi
  const handleCancel = async () => {
    if (isDirty) {
      const result = await Swal.fire({
        title: 'Xác nhận hủy?',
        text: 'Các thay đổi bạn đã thực hiện sẽ bị mất. Bạn có chắc chắn muốn hủy?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Có, hủy!',
        cancelButtonText: 'Giữ lại'
      });

      if (result.isConfirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3 text-start">
        <Form.Label>Tên thuốc</Form.Label>
        <Form.Control
          type="text"
          value={medicine}
          onChange={(e) => handleInputChange(setMedicine, e.target.value)}
          placeholder="Nhập tên thuốc"
        />
      </Form.Group>

      <Form.Group className="mb-3 text-start">
        <Form.Label>Số lượng</Form.Label>
        <Form.Control
          type="text"
          value={quantity}
          onChange={(e) => handleInputChange(setQuantity, e.target.value)}
          placeholder="Nhập số lượng"
        />
      </Form.Group>

      <Form.Group className="mb-3 text-start">
        <Form.Label>Liều dùng</Form.Label>
        <Form.Control
          type="text"
          value={dosage}
          onChange={(e) => handleInputChange(setDosage, e.target.value)}
          placeholder="Nhập liều dùng (ví dụ: 1 viên x 2 lần/ngày)"
        />
      </Form.Group>

      <div className="d-flex justify-content-end gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>
          Hủy
        </Button>
        <Button variant="primary" type="submit">
          {defaultData ? "Cập nhật thuốc" : "Lưu thuốc"}
        </Button>
      </div>
    </Form>
  );
};

export default PrescriptionModalContent;