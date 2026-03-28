import type { Metadata } from "next";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export const metadata: Metadata = {
  title: "Applications",
};

export default function ApplicationsPage() {
  return <KanbanBoard />;
}
