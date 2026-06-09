import React, {useState} from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronUp,
  Bookmark,
  Share2,
  Ticket,
  X,
  Minus,
  Plus,
  CheckCircle2,
} from "lucide-react";

const EventDetailPage = () => {
  // Trạng thái điều khiển luồng Modal: 'none', 'select', 'confirm', 'otp_ticket'
  const [modalView, setModalView] = useState("none");

  // States quản lý số lượng vé
  const [studentTickets, setStudentTickets] = useState(0);
  const [teamTickets, setTeamTickets] = useState(0);

  // State lưu trữ mã OTP 6 số được sinh ra
  const [generatedOTP, setGeneratedOTP] = useState("");

  const totalTickets = studentTickets + teamTickets;

  // Hàm sinh ngẫu nhiên mã OTP 6 chữ số khi người dùng bấm Confirm
  const handleConfirmRegistration = () => {
    const randomOTP = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(randomOTP);
    setModalView("otp_ticket"); // Chuyển sang màn hình hiển thị OTP Ticket
  };

  // Reset lại mọi thứ khi bấm Done kết thúc luồng
  const handleCloseAll = () => {
    setModalView("none");
    setStudentTickets(0);
    setTeamTickets(0);
    setGeneratedOTP("");
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-20 relative">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-blue-900/10 z-40 relative">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center shrink-0">
                <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
              </div>
              <span className="font-extrabold text-xl text-blue-700 tracking-tight">
                EMS
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
              <a
                href="/HomePage"
                className="text-slate-600 hover:text-blue-700"
              >
                Home
              </a>
              <a
                href="#"
                className="text-blue-700 border-b-2 border-blue-700 py-5"
              >
                Events
              </a>
              <a href="#" className="text-slate-600 hover:text-blue-700">
                My Calendar
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="font-semibold text-blue-700 text-sm px-4 py-2 hover:bg-blue-50 rounded-xl">
              Log In
            </button>
            <button className="font-semibold text-white bg-blue-700 px-5 py-2 rounded-xl shadow-sm hover:bg-blue-800">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative w-full h-80 bg-slate-100">
        <img
          src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Annual Hackathon"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/80 via-[#0F1B3D]/30 to-transparent"></div>

        {/* Badges */}
        <div className="absolute bottom-6 left-6 md:left-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] flex gap-3">
          <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
            Technology
          </span>
          <span className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
            Free
          </span>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-6 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
        {/* CỘT TRÁI (2/3) */}
        <div className="lg:col-span-2 space-y-12">
          {/* Tiêu đề & Lưới thông tin */}
          <div>
            <h1 className="text-4xl font-extrabold text-[#0F1B3D] leading-tight mb-8">
              Annual Hackathon 2025: Build for Tomorrow
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="w-12 h-12 bg-blue-100/50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Date</p>
                  <p className="text-sm font-bold text-[#0F1B3D]">
                    June 14, 2025
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="w-12 h-12 bg-blue-100/50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Time</p>
                  <p className="text-sm font-bold text-[#0F1B3D]">9:00 AM</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="w-12 h-12 bg-blue-100/50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Location
                  </p>
                  <p className="text-sm font-bold text-[#0F1B3D]">
                    Engineering Building, Room 101
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="w-12 h-12 bg-blue-100/50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Organizer
                  </p>
                  <p className="text-sm font-bold text-[#0F1B3D]">
                    CS Student Society
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div>
            <h2 className="text-2xl font-extrabold text-[#0F1B3D] mb-4">
              About This Event
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Join 250 of the brightest students for a 24-hour coding marathon.
              Form teams, tackle real-world challenges posed by industry
              partners, and compete for prizes exceeding $10,000. Whether you're
              a seasoned developer or a curious beginner, this event has a track
              for you.
            </p>
            <div className="flex gap-3">
              <span className="px-4 py-1.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full">
                #Coding
              </span>
              <span className="px-4 py-1.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full">
                #Competition
              </span>
              <span className="px-4 py-1.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full">
                #Free
              </span>
            </div>
          </div>

          {/* Agenda Section */}
          <div className="border border-blue-900/10 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 cursor-pointer">
              <h2 className="text-xl font-extrabold text-[#0F1B3D]">Agenda</h2>
              <ChevronUp className="text-slate-400" />
            </div>

            <div className="space-y-6">
              {[
                {
                  time: "9:00 AM",
                  title: "Opening Ceremony & Team Formation",
                  desc: "",
                },
                {time: "10:00 AM", title: "Hacking Begins", desc: ""},
                {
                  time: "2:00 PM",
                  title: "Mentor Check-ins",
                  desc: "Dr. Sarah Chen",
                },
                {time: "9:00 AM+1", title: "Submission Deadline", desc: ""},
                {time: "11:00 AM+1", title: "Demo & Judging", desc: ""},
                {time: "2:00 PM+1", title: "Awards Ceremony", desc: ""},
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="w-24 shrink-0">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg text-center w-full">
                      {item.time}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F1B3D] text-sm">
                      {item.title}
                    </h4>
                    {item.desc && (
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Speakers Section */}
          <div>
            <h2 className="text-2xl font-extrabold text-[#0F1B3D] mb-6">
              Speakers & Guests
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  init: "SC",
                  name: "Dr. Sarah Chen",
                  role: "Professor, Computer Science",
                },
                {init: "MW", name: "Marcus Webb", role: "CTO, TechVentures"},
                {init: "PN", name: "Priya Nair", role: "Lead Engineer, Google"},
              ].map((speaker, idx) => (
                <div
                  key={idx}
                  className="border border-blue-900/10 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm"
                >
                  <div className="w-16 h-16 bg-blue-700 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4 shadow-md shrink-0">
                    {speaker.init}
                  </div>
                  <h4 className="font-bold text-[#0F1B3D]">{speaker.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{speaker.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (1/3) - PANEL ĐĂNG KÝ */}
        <div className="lg:col-span-1">
          <div className="border border-blue-900/10 rounded-2xl p-6 shadow-sm sticky top-6">
            <h2 className="text-4xl font-extrabold text-green-600 mb-4">
              Free
            </h2>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-[#0F1B3D]">187 registered</span>
                <span className="text-slate-500">63 seats left</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{width: "75%"}}
                ></div>
              </div>
              <p className="text-xs text-slate-500">75% capacity filled</p>
            </div>

            {/* Ticket Types Overview */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-sm text-[#0F1B3D]">
                    Student Hacker
                  </h4>
                  <p className="text-xs text-slate-500">63 available</p>
                </div>
                <span className="font-bold text-blue-700 text-sm">Free</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-sm text-[#0F1B3D]">
                    Team Registration (4 members)
                  </h4>
                  <p className="text-xs text-slate-500">15 available</p>
                </div>
                <span className="font-bold text-blue-700 text-sm">Free</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => setModalView("select")}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2"
              >
                <Ticket size={18} />
                Register Now
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl font-semibold text-sm text-[#0F1B3D] hover:bg-slate-50 transition-colors">
                  <Bookmark size={16} /> Save
                </button>
                <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl font-semibold text-sm text-[#0F1B3D] hover:bg-slate-50 transition-colors">
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          DƯỚI ĐÂY LÀ MODAL ĐIỀU KHIỂN TOÀN BỘ LUỒNG ĐĂNG KÝ VÉ/OTP 
          ======================================================== */}
      {modalView !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay nền tối mờ */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={
              modalView === "otp_ticket"
                ? handleCloseAll
                : () => setModalView("none")
            }
          ></div>

          {/* BƯỚC 1: CHỌN SỐ LƯỢNG VÉ (SELECT TICKETS) */}
          {modalView === "select" && (
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F1B3D]">
                    Select Tickets
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Annual Hackathon 2025: Build for Tomorrow
                  </p>
                </div>
                <button
                  onClick={() => setModalView("none")}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm font-semibold text-[#0F1B3D]">
                  Choose your ticket type and quantity.
                </p>

                {/* Vé cá nhân */}
                <div
                  className={`border-2 rounded-xl p-3 ${studentTickets > 0 ? "border-blue-600 bg-blue-50/30" : "border-slate-200"}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#0F1B3D]">
                        Student Hacker
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        63 remaining
                      </p>
                    </div>
                    <span className="font-bold text-sm text-blue-700">
                      Free
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setStudentTickets(Math.max(0, studentTickets - 1))
                      }
                      className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-4 text-center font-bold text-sm text-[#0F1B3D]">
                      {studentTickets}
                    </span>
                    <button
                      onClick={() => setStudentTickets(studentTickets + 1)}
                      className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white hover:bg-blue-800 shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Vé nhóm */}
                <div
                  className={`border-2 rounded-xl p-3 ${teamTickets > 0 ? "border-blue-600 bg-blue-50/30" : "border-slate-200"}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#0F1B3D]">
                        Team Registration (4 members)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        15 remaining
                      </p>
                    </div>
                    <span className="font-bold text-sm text-blue-700">
                      Free
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setTeamTickets(Math.max(0, teamTickets - 1))
                      }
                      className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-4 text-center font-bold text-sm text-[#0F1B3D]">
                      {teamTickets}
                    </span>
                    <button
                      onClick={() => setTeamTickets(teamTickets + 1)}
                      className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white hover:bg-blue-800 shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-[#0F1B3D]">
                    Total ({totalTickets} tickets)
                  </span>
                  <span className="font-extrabold text-sm text-blue-700">
                    Free
                  </span>
                </div>
                <button
                  onClick={() => setModalView("confirm")}
                  disabled={totalTickets === 0}
                  className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-md transition-colors text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* BƯỚC 2: XÁC NHẬN LẠI THÔNG TIN ĐĂNG KÝ (CONFIRM REGISTRATION) */}
          {modalView === "confirm" && (
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F1B3D]">
                    Confirm Registration
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Annual Hackathon 2025: Build for Tomorrow
                  </p>
                </div>
                <button
                  onClick={() => setModalView("none")}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <div className="bg-blue-50/50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-sm text-slate-500 shrink-0">
                      Event
                    </span>
                    <span className="text-sm font-semibold text-[#0F1B3D] text-right">
                      Annual Hackathon 2025: Build for Tomorrow
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-500">Date</span>
                    <span className="text-sm font-semibold text-[#0F1B3D]">
                      June 14, 2025
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-500">Location</span>
                    <span className="text-sm font-semibold text-[#0F1B3D] text-right">
                      Engineering Building, Room 101
                    </span>
                  </div>

                  {studentTickets > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-slate-500">
                        Student Hacker × {studentTickets}
                      </span>
                      <span className="text-sm font-semibold text-[#0F1B3D]">
                        Free
                      </span>
                    </div>
                  )}
                  {teamTickets > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-slate-500">
                        Team Registration (4 members) × {teamTickets}
                      </span>
                      <span className="text-sm font-semibold text-[#0F1B3D]">
                        Free
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-blue-900/10">
                    <span className="font-bold text-[#0F1B3D]">Total</span>
                    <span className="font-extrabold text-blue-700">Free</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setModalView("select")}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-semibold text-sm text-[#0F1B3D] hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmRegistration}
                  className="flex-[2] bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl shadow-md transition-colors text-sm"
                >
                  Confirm Registration
                </button>
              </div>
            </div>
          )}

          {/* BƯỚC 3: MÀN HÌNH THÀNH CÔNG - SINH VÀ HIỂN THỊ MÃ SỐ OTP TICKET */}
          {modalView === "otp_ticket" && (
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
              {/* Icon thành công */}
              <div className="text-green-500 mb-4 animate-bounce">
                <CheckCircle2 size={56} className="stroke-[2.5]" />
              </div>

              <h2 className="text-2xl font-extrabold text-[#0F1B3D]">
                You're registered!
              </h2>
              <p className="text-sm text-slate-500 mt-2 px-2">
                Show this 6-digit OTP code at the event entrance to check in.
              </p>

              {/* Hộp lớn hiển thị Mã số OTP thay thế cho QR Code */}
              <div className="w-full my-6 bg-slate-50 rounded-2xl border-2 border-dashed border-blue-200 p-6 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-1">
                  Your Check-in OTP
                </span>
                <span className="text-4xl font-black text-[#0F1B3D] tracking-[6px] font-mono select-all bg-white px-6 py-2 rounded-xl shadow-sm border border-slate-100">
                  {generatedOTP}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-3 uppercase tracking-wider">
                  EMS - 2025 - {Math.floor(1000 + Math.random() * 9000)}
                </span>
              </div>

              
              

              {/* Nút Hoàn Tất để đóng luồng */}
              <button
                onClick={handleCloseAll}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;
