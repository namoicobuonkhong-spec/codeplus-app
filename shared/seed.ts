/* Dữ liệu mẫu: dùng cho chế độ thử trong app và cho script nạp vào Firebase thật (tools/seed-firebase.ts). */
import { KeyedQuestion, UserDoc } from './logic';

export const DEMO_PASSWORD = 'demo1234';

export const STAFF: (UserDoc & { username: string })[] = [
  { uid: 'u-admin', role: 'staff', name: 'Quản trị hệ thống', username: 'admin', staffRoles: ['admin'], position: 'Quản trị' },
  { uid: 'u-ht', role: 'staff', name: 'Nguyễn Thành', username: 'hieutruong', staffRoles: ['bgh'], position: 'Hiệu trưởng' },
  { uid: 'u-hp', role: 'staff', name: 'Phạm Thu Hương', username: 'hieupho', staffRoles: ['bgh'], position: 'Phó hiệu trưởng' },
  { uid: 'u-toan', role: 'staff', name: 'Nguyễn Thị Lan', username: 'toan', staffRoles: ['quanli', 'coithi'], position: 'Tổ trưởng Toán' },
  { uid: 'u-gt1', role: 'staff', name: 'Đỗ Thanh Bình', username: 'giamthi1', staffRoles: ['coithi'], position: 'Giáo viên' },
  { uid: 'u-gt2', role: 'staff', name: 'Trần Văn Minh', username: 'giamthi2', staffRoles: ['coithi'], position: 'Giáo viên' },
  { uid: 'u-gt3', role: 'staff', name: 'Lê Thu Hà', username: 'giamthi3', staffRoles: ['coithi'], position: 'Giáo viên' },
  { uid: 'u-gt4', role: 'staff', name: 'Ngô Bảo Trâm', username: 'giamthi4', staffRoles: ['coithi'], position: 'Giáo viên' },
  { uid: 'u-kt', role: 'staff', name: 'Đỗ Tuấn', username: 'kythuat', staffRoles: ['kythuat'], position: 'Kĩ thuật viên' }
];

const NAMES_A = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Minh Châu', 'Phạm Gia Duy', 'Hoàng Thu Giang', 'Vũ Đức Hải', 'Đặng Ngọc Khánh', 'Bùi Quang Huy', 'Mai Anh Thư', 'Đỗ Hoàng Long', 'Phan Thảo My', 'Trịnh Bảo Ngọc'];
const NAMES_B = ['Lương Tuấn Kiệt', 'Hà Minh Phương', 'Đinh Gia Bảo', 'Tạ Thanh Tâm', 'Cao Đức Mạnh', 'Lý Khánh Linh', 'Kiều Văn Nam', 'Quách Ngọc Ánh', 'Chu Hải Đăng', 'Vương Thùy Dung', 'Lò Văn Sơn', 'Hà Thị Yến'];
export const STUDENTS: (UserDoc & { username: string })[] = [
  ...NAMES_A.map((name, i) => ({ uid: 'hs' + String(i + 1).padStart(3, '0'), role: 'student' as const, name, className: '12A1', username: 'hs' + String(i + 1).padStart(3, '0') })),
  ...NAMES_B.map((name, i) => ({ uid: 'hs' + String(i + 13).padStart(3, '0'), role: 'student' as const, name, className: '12A2', username: 'hs' + String(i + 13).padStart(3, '0') }))
];

export const BANK: KeyedQuestion[] = [
  { id: 'q01', type: 'mcq', subject: 'Toán', chapter: 'Ứng dụng đạo hàm', level: 'biet', points: 0.25, text: 'Hàm số y = x³ − 3x² + 2 đạt cực tiểu tại điểm nào?', options: ['x = 0', 'x = 2', 'x = −2', 'x = 1'], answer: 'B' },
  { id: 'q02', type: 'mcq', subject: 'Toán', chapter: 'Ứng dụng đạo hàm', level: 'biet', points: 0.25, text: 'Hàm số y = −x⁴ + 2x² + 1 đồng biến trên khoảng nào?', options: ['(−∞; −1)', '(−1; 0)', '(0; 1)', '(1; +∞)'], answer: 'A' },
  { id: 'q03', type: 'mcq', subject: 'Toán', chapter: 'Ứng dụng đạo hàm', level: 'hieu', points: 0.25, text: 'Đồ thị hàm số y = (2x − 1)/(x + 1) có tiệm cận đứng là đường thẳng nào?', options: ['x = 1', 'x = −1', 'y = 2', 'y = −1'], answer: 'B' },
  { id: 'q04', type: 'mcq', subject: 'Toán', chapter: 'Ứng dụng đạo hàm', level: 'hieu', points: 0.25, text: 'Giá trị lớn nhất của hàm số y = x³ − 3x trên đoạn [0; 2] bằng', options: ['2', '0', '−2', '4'], answer: 'A' },
  { id: 'q05', type: 'mcq', subject: 'Toán', chapter: 'Hàm số mũ, lôgarit', level: 'biet', points: 0.25, text: 'Tập xác định của hàm số y = log₂(x − 3) là', options: ['(3; +∞)', '[3; +∞)', '(−∞; 3)', 'ℝ \\ {3}'], answer: 'A' },
  { id: 'q06', type: 'mcq', subject: 'Toán', chapter: 'Hàm số mũ, lôgarit', level: 'hieu', points: 0.25, text: 'Nghiệm của phương trình 2^(x+1) = 8 là', options: ['x = 1', 'x = 2', 'x = 3', 'x = 4'], answer: 'B' },
  { id: 'q07', type: 'mcq', subject: 'Toán', chapter: 'Khối đa diện', level: 'biet', points: 0.25, text: 'Thể tích khối lập phương cạnh 3a bằng', options: ['9a³', '27a³', '3a³', '81a³'], answer: 'B' },
  { id: 'q08', type: 'mcq', subject: 'Toán', chapter: 'Khối đa diện', level: 'hieu', points: 0.25, text: 'Khối chóp có diện tích đáy 6 và chiều cao 4 có thể tích bằng', options: ['24', '12', '8', '6'], answer: 'C' },
  { id: 'q09', type: 'mcq', subject: 'Toán', chapter: 'Nguyên hàm, tích phân', level: 'biet', points: 0.25, text: 'Một nguyên hàm của f(x) = 2x là', options: ['x²', '2x²', 'x² + 2x', '2'], answer: 'A' },
  { id: 'q10', type: 'mcq', subject: 'Toán', chapter: 'Nguyên hàm, tích phân', level: 'hieu', points: 0.25, text: 'Tích phân ∫₀¹ 3x² dx bằng', options: ['3', '1', '1/3', '0'], answer: 'B' },
  { id: 'q11', type: 'tf', subject: 'Toán', chapter: 'Ứng dụng đạo hàm', level: 'vandung', points: 1, text: 'Cho hàm số y = x³ − 3x + 1. Xét tính đúng/sai của các mệnh đề sau.', options: ['Hàm số đồng biến trên (1; +∞).', 'Hàm số có hai điểm cực trị.', 'Giá trị cực đại của hàm số bằng 3.', 'Đồ thị cắt trục hoành tại đúng một điểm.'], answer: 'DDDS' },
  { id: 'q12', type: 'tf', subject: 'Toán', chapter: 'Hàm số mũ, lôgarit', level: 'vandung', points: 1, text: 'Cho hàm số y = 2^x. Xét tính đúng/sai của các mệnh đề sau.', options: ['Hàm số đồng biến trên ℝ.', 'Đồ thị đi qua điểm (0; 1).', 'Hàm số có giá trị nhỏ nhất bằng 0.', 'Đồ thị nằm phía trên trục hoành.'], answer: 'DDSD' },
  { id: 'q13', type: 'short', subject: 'Toán', chapter: 'Nguyên hàm, tích phân', level: 'vandung', points: 0.5, text: 'Tính ∫₁³ (2x + 1) dx.', answer: '10' },
  { id: 'q14', type: 'short', subject: 'Toán', chapter: 'Khối đa diện', level: 'vandung', points: 0.5, text: 'Một bể nước hình hộp chữ nhật dài 2 m, rộng 1,5 m, cao 1 m. Thể tích bể là bao nhiêu mét khối?', answer: '3' },
  { id: 'q15', type: 'essay', subject: 'Toán', chapter: 'Ứng dụng đạo hàm', level: 'vandung', points: 1, text: 'Một tấm tôn hình vuông cạnh 12 cm, cắt ở bốn góc bốn hình vuông bằng nhau rồi gập thành hộp không nắp. Tìm cạnh hình vuông cắt đi để thể tích hộp lớn nhất. Trình bày lời giải.', answer: '' },
  { id: 'q16', type: 'mcq', subject: 'Tin học', chapter: 'Lập trình cơ bản', level: 'biet', points: 0.25, text: 'Trong Python, kết quả của biểu thức 7 // 2 là', options: ['3.5', '3', '4', '1'], answer: 'B' }
];

export const EXAMS = [
  { id: 'E1', title: 'Toán 12 — Kiểm tra giữa kì I', subject: 'Toán', durationMin: 60, questionIds: ['q01', 'q02', 'q03', 'q04', 'q05', 'q06', 'q07', 'q08', 'q09', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15'] },
  { id: 'E2', title: 'Toán 12 — Kiểm tra 15 phút', subject: 'Toán', durationMin: 15, questionIds: ['q01', 'q03', 'q05', 'q07', 'q09', 'q13'] }
];
