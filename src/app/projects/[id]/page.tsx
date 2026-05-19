import { defaultProjects } from "@/lib/study-data-server";
import ProjectDetailClient from "./client";

export function generateStaticParams() {
  return defaultProjects.map((p) => ({ id: p.id }));
}

export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}
