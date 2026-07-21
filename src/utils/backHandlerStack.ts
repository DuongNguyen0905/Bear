// Ngăn xếp các "trình xử lý back" — mỗi modal/lớp đang mở (Cài đặt, lịch,
// mục tiêu, ảnh...) tự đăng ký một hàm đóng chính nó vào đây khi mở.
// Khi người dùng bấm nút back / vuốt cạnh màn hình, ta đóng lớp trên cùng
// thay vì để hệ điều hành thoát thẳng ra ngoài app.
type BackHandler = () => void;

const stack: BackHandler[] = [];

export function pushBackHandler(handler: BackHandler): void {
  stack.push(handler);
}

export function popBackHandler(handler: BackHandler): void {
  const idx = stack.lastIndexOf(handler);
  if (idx !== -1) stack.splice(idx, 1);
}

// true nếu đã có lớp nào đó xử lý (đóng lại); false nếu ngăn xếp rỗng,
// tức là không còn gì để đóng và nên áp dụng hành vi back mặc định.
export function handleBackPress(): boolean {
  if (stack.length === 0) return false;
  const top = stack[stack.length - 1];
  top();
  return true;
}
