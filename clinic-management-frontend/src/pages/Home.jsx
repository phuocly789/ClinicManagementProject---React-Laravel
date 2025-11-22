import React, { useEffect } from "react";
import { Container, Nav, Navbar, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { path } from "../utils/constant";
const Home = () => {
  const services = [
    {
      // Thay icon FontAwesome bằng Bootstrap Icon
      icon: "bi-clipboard2-pulse-fill",
      title: "Khám Tổng Quát",
      description:
        "Kiểm tra sức khỏe định kỳ, tầm soát bệnh lý để bảo vệ sức khỏe toàn diện.",
    },
    {
      icon: "bi-heart-pulse-fill",
      title: "Khám Tim Mạch",
      description:
        "Chẩn đoán và điều trị bệnh lý tim mạch với chuyên gia hàng đầu.",
    },
    {
      icon: "bi-emoji-smile-fill",
      title: "Răng - Hàm - Mặt",
      description:
        "Dịch vụ nha khoa từ cơ bản đến chuyên sâu, thẩm mỹ nụ cười.",
    },
  ];

  const doctors = [
    // Cập nhật ảnh placeholder
    {
      name: "BS. Trần Thị B",
      specialty: "Chuyên khoa Nội tổng quát",
      image: "https://placehold.co/150x150/e9ecef/333333?text=BS.+B",
    },
    {
      name: "BS. Lê Văn C",
      specialty: "Chuyên khoa Răng - Hàm - Mặt",
      image: "https://placehold.co/150x150/e9ecef/333333?text=BS.+C",
    },
    {
      name: "BS. Phạm Anh D",
      specialty: "Chuyên khoa Tim Mạch",
      image: "https://placehold.co/150x150/e9ecef/333333?text=BS.+D",
    },
  ];

  return (
    <>
      {/* Header: Nâng cấp lên Navbar của react-bootstrap */}
      <Navbar
        bg="white"
        shadow-sm="true"
        sticky="top"
        expand="lg"
        className="shadow-sm"
      >
        <Container>
          {/* Sử dụng Link của react-router-dom để không tải lại trang */}
          <Navbar.Brand
            as={Link}
            to="/"
            className="d-flex align-items-center gap-2"
          >
            <img
              src="/logo.png"
              alt="VitaCare Logo"
              style={{ width: "50px", height: "50px", objectFit: "cover" }}
            />
            <span className="fs-4 fw-bold text-primary">
              Phòng Khám VitaCare
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              {/* Sử dụng Nav.Link as={Link} và Button */}
              <Nav.Item className="me-lg-2 mb-2 mb-lg-0">
                <Button
                  as={Link}
                  to={"/booking"}
                  variant="primary"
                  className="w-100"
                >
                  Đặt Lịch Hẹn
                </Button>
              </Nav.Item>
              <Nav.Item>
                <Button
                  as={Link}
                  to={path.LOGIN}
                  variant="outline-secondary"
                  className="w-100"
                >
                  Đăng Nhập
                </Button>
              </Nav.Item>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <section
        className="text-center text-white py-5"
        style={{
          // Cập nhật ảnh placeholder
          background:
            "linear-gradient(rgba(0,91,179,.7), rgba(0,91,179,.7)), url('bg.png') center/cover no-repeat",
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container className="py-5">
          <h1 className="display-4 fw-bold">
            Chăm Sóc Sức Khỏe Tận Tâm & Chuyên Nghiệp
          </h1>
          <p className="lead mb-4">
            Dịch vụ y tế chất lượng cao, đội ngũ bác sĩ giàu kinh nghiệm, trang
            thiết bị hiện đại.
          </p>
          {/* Sử dụng Button as={Link} */}
          <Button as={Link} to={"/booking"} variant="light" size="lg">
            Đặt Lịch Khám Ngay
          </Button>
        </Container>
      </section>

      {/* Services */}
      <section id="services" className="py-5 text-center bg-light">
        <Container>
          <h2 className="mb-4 fw-bold">Dịch Vụ Của Chúng Tôi</h2>
          <div className="row g-4">
            {services.map((sv, index) => (
              <div className="col-md-4" key={index}>
                {/* Thêm class rounded-3 */}
                <div className="card shadow-sm h-100 p-4 border-0 rounded-3">
                  {/* Cập nhật class icon */}
                  <i
                    className={`bi ${sv.icon} display-3 text-primary mb-3`}
                  ></i>
                  <h3>{sv.title}</h3>
                  <p className="mb-0">{sv.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Doctors */}
      <section id="doctors" className="py-5 text-center">
        <Container>
          <h2 className="mb-4 fw-bold">Đội Ngũ Bác Sĩ Tận Tâm</h2>
          <div className="row g-4 justify-content-center">
            {doctors.map((doc, index) => (
              <div className="col-md-3" key={index}>
                {/* Thêm class rounded-3 */}
                <div className="card shadow-sm p-3 border-0 rounded-3 h-100">
                  <img
                    src={doc.image}
                    alt={doc.name}
                    className="rounded-circle mx-auto d-block mb-3 border border-4 border-info-subtle"
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "cover",
                    }}
                  />
                  <h5 className="mb-1">{doc.name}</h5>
                  <p className="text-muted fst-italic">{doc.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-5 text-center">
        <Container>
          {/* Thêm icon Mạng xã hội */}
          <div className="d-flex justify-content-center fs-3 gap-4 mb-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-decoration-none"
            >
              <i className="bi bi-facebook"></i>
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-decoration-none"
            >
              <i className="bi bi-youtube"></i>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-decoration-none"
            >
              <i className="bi bi-instagram"></i>
            </a>
          </div>

          <h4 className="fw-bold">Phòng Khám Đa Khoa VitaCare</h4>
          <p className="mb-1">
            Địa chỉ: 123 Đường Sức Khỏe, Phường An Lành, Quận Bình Yên, TP. Hồ
            Chí Minh
          </p>
          <p className="mb-1">Điện thoại: (028) 3812 3456</p>
          <p>
            Email:{" "}
            <a
              href="mailto:info@phongkhamvitacare.com"
              className="text-info text-decoration-none"
            >
              info@phongkhamvitacare.com
            </a>
          </p>
          <hr
            className="my-4"
            style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
          />
          <p className="mb-0">
            &copy; 2025 Phòng khám VitaCare. Đã đăng ký bản quyền.
          </p>
        </Container>
      </footer>
    </>
  );
};

export default Home;
