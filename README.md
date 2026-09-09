# file-manager-web

React/Vite UI cho `file-manager-api`.

Stack: React Router, Tailwind CSS, shadcn-style UI primitives, TanStack Query, Zustand, Axios, React Hook Form, Zod, Vitest và Playwright.

## Chạy local

```bash
npm install
npm run dev
```

```bash
npm run test
npm run test:e2e
npm run build
```

Copy `.env.example` thành `.env` nếu API không chạy ở `http://localhost:8080`.

Các thao tác hiện có: upload file, tạo folder, mở folder, tìm kiếm, preview qua `/view/{id}`, download và xóa file.
