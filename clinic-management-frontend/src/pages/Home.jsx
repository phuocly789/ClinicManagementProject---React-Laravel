import React from "react";

const Home = () => {
    const services = [
        {
            icon: "fa-stethoscope",
            title: "Khám Tổng Quát",
            description: "Kiểm tra sức khỏe định kỳ, tầm soát bệnh lý để bảo vệ sức khỏe toàn diện."
        },
        {
            icon: "fa-heart",
            title: "Khám Tim Mạch",
            description: "Chẩn đoán và điều trị bệnh lý tim mạch với chuyên gia hàng đầu."
        },
        {
            icon: "fa-tooth",
            title: "Răng - Hàm - Mặt",
            description: "Dịch vụ nha khoa từ cơ bản đến chuyên sâu, thẩm mỹ nụ cười."
        },
    ];

    const doctors = [
        { name: "BS. Trần Thị B", specialty: "Chuyên khoa Nội tổng quát", image: "https://via.placeholder.com/150" },
        { name: "BS. Lê Văn C", specialty: "Chuyên khoa Răng - Hàm - Mặt", image: "https://via.placeholder.com/150" },
        { name: "BS. Phạm Anh D", specialty: "Chuyên khoa Tim Mạch", image: "https://via.placeholder.com/150" },
    ];

    return (
        <>
            {/* Header */}
            <header className="bg-white shadow-sm sticky-top">
                <div className="container d-flex justify-content-between align-items-center py-3">
                    <a href="/" className="fs-4 fw-bold text-primary text-decoration-none">
                        Phòng Khám VitaCare
                    </a>
                    <div>
                        <a href="/booking" className="btn btn-primary">Đặt Lịch Hẹn</a>
                        <a href="/login" className="btn btn-outline-secondary ms-2">Đăng Nhập</a>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section
                className="text-center text-white py-5"
                style={{
                    background: "linear-gradient(rgba(0,91,179,.7), rgba(0,91,179,.7)), url('https://via.placeholder.com/1500x600.png?text=Clinic+Background') center/cover no-repeat",
                    minHeight: "60vh",
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <div className="container py-5">
                    <h1 className="display-4 fw-bold">Chăm Sóc Sức Khỏe Tận Tâm & Chuyên Nghiệp</h1>
                    <p className="lead mb-4">
                        Dịch vụ y tế chất lượng cao, đội ngũ bác sĩ giàu kinh nghiệm, trang thiết bị hiện đại.
                    </p>
                    <a href="/booking" className="btn btn-lg btn-light">Đặt Lịch Khám Ngay</a>
                </div>
            </section>

            {/* Services */}
            <section id="services" className="py-5 text-center bg-light">
                <div className="container">
                    <h2 className="mb-4 fw-bold">Dịch Vụ Của Chúng Tôi</h2>
                    <div className="row g-4">
                        {services.map((sv, index) => (
                            <div className="col-md-4" key={index}>
                                <div className="card shadow-sm h-100 p-4 border-0">
                                    <i className={`fas ${sv.icon} display-3 text-primary mb-3`}></i>
                                    <h3>{sv.title}</h3>
                                    <p>{sv.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Doctors */}
            <section id="doctors" className="py-5 text-center">
                <div className="container">
                    <h2 className="mb-4 fw-bold">Đội Ngũ Bác Sĩ Tận Tâm</h2>
                    <div className="row g-4 justify-content-center">
                        {doctors.map((doc, index) => (
                            <div className="col-md-3" key={index}>
                                <div className="card shadow-sm p-3 border-0">
                                    <img src={doc.image} alt={doc.name} className="rounded-circle mx-auto d-block mb-3 border border-4 border-info-subtle"
                                        style={{ width: "150px", height: "150px", objectFit: "cover" }} />
                                    <h5>{doc.name}</h5>
                                    <p className="text-muted fst-italic">{doc.specialty}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-dark text-white py-5 text-center">
                <div className="container">
                    <h4>Phòng Khám Đa Khoa VitaCare</h4>
                    <p>Địa chỉ: 123 Đường Sức Khỏe, Phường An Lành, Quận Bình Yên, TP. Hồ Chí Minh</p>
                    <p>Điện thoại: (028) 3812 3456</p>
                    <p>
                        Email:{" "}
                        <a href="mailto:info@phongkhamvitacare.com" className="text-info text-decoration-none">
                            info@phongkhamvitacare.com
                        </a>
                    </p>
                    <hr className="border-secondary my-4" />
                    <p className="mb-0">&copy; 2025 Phòng khám VitaCare. Đã đăng ký bản quyền.</p>
                </div>
            </footer>
        </>
    );
};

export default Home;
