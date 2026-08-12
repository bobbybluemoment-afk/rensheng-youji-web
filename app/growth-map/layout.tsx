import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "人生有迹｜成长地图",
  description: "在浏览器本地整理出生资料与排盘，生成可交给本地 AI 的六维成长地图请求。",
};

export default function GrowthMapLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
