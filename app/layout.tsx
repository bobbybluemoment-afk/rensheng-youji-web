import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人生有迹免费卡片｜找到你的人生主线",
  description: "在浏览器本地生成包含人生主线、20年人生K线和当前课题的免费卡片。",
  other: { "codex-preview": "development" },
  icons: { icon: "/logo.png", shortcut: "/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
