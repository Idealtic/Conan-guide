# Conan Guide

## 1. Thông tin về dự án
**Conan Guide** là công cụ tra cứu thông tin về các tập phim của anime **Thám Tử Lừng Danh Conan**. Dự án được xây dựng nhằm mục đích giúp khán giả dễ dàng tìm kiếm các tập phim muốn xem, lọc ra các tập quan trọng hay các tập có nội dung, nhân vật yêu thích.

## 2. Nguồn dữ liệu & Bản quyền
- Dữ liệu thông tin tập phim, phân loại Canon/Filler, nhân vật và manh mối cốt truyện được tổng hợp và tham khảo từ **[Detective Conan Wiki](https://www.detectiveconanworld.com/wiki/Main_Page)**.
- Tất cả link xem phim trên trang đều là link bản quyền chính thức từ kênh YouTube **[POPS Anime](https://www.youtube.com/@POPSAnime)** (đơn vị nắm giữ bản quyền phát sóng tại Việt Nam).
- **Disclaimer:** Đây là một dự án cá nhân phi lợi nhuận. Mọi quyền tác giả, hình ảnh và tên gọi thuộc về tác giả Gosho Aoyama, Shogakukan, Yomiuri Telecasting Corporation (YTV) và TMS Entertainment.

## 3. Kiến trúc & Hướng dẫn chạy cục bộ

### Kiến trúc & Công nghệ
- **Mô hình:** Website tĩnh (**Static Site**), không sử dụng backend server hay cơ sở dữ liệu động. Dữ liệu tập phim được đồng bộ từ `data/episode_info_full.json` sang tệp JSON tĩnh qua `scripts/build-data.js`, toàn bộ thao tác tìm kiếm, lọc và phân trang chạy hoàn toàn phía trình duyệt (client-side).
- **Framework & Giao diện:** **Astro 7** (`@astrojs/mdx` cho các trang nội dung tĩnh) kết hợp **Preact 11** (`@astrojs/preact` Islands cho phần tra cứu tương tác).
- **Styling & Font:** **Tailwind CSS v4** (`@tailwindcss/vite`, `@tailwindcss/typography`) và font **Inter** được đóng gói cục bộ (`@fontsource/inter`).
- **Triển khai (Hosting):** Cấu hình cho **Cloudflare Pages** (tệp `web/public/_headers` và `.node-version`).

### Cài đặt & chạy trên máy cá nhân
**Yêu cầu:** Đã cài đặt **Node.js `>= 22.23.4`** (khuyến nghị bản `24.x`).

```bash
# 1. Clone mã nguồn về máy
git clone https://github.com/Idealtic/Conan-guide.git
cd Conan-guide/web

# 2. Cài đặt thư viện
npm install

# 3. Khởi động môi trường phát triển (tự động tạo data/episodes.json qua hook predev)
npm run dev
```

Sau khi chạy, truy cập trình duyệt tại `http://localhost:4321`.

Để build bản tĩnh và xem thử bản production:
```bash
npm run build
npm run preview
```
