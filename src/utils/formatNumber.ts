// Định dạng số tiền theo kiểu Việt Nam khi đang gõ: tự chèn dấu chấm phân
// cách hàng nghìn (1000000 -> 1.000.000), giống các app/web tài chính VN.
export function formatThousands(raw: string | number): string {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Ngược lại: bỏ dấu chấm để lấy lại chuỗi số thuần dùng cho parseInt/lưu trữ.
export function stripThousands(formatted: string): string {
  return formatted.replace(/\D/g, '');
}
