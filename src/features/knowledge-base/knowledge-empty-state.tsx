import { Database } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { MotionItem } from "@/components/ui/motion";

export function KnowledgeEmptyState({ canManage }: { canManage: boolean }) {
  return <MotionItem><Card className="border-dashed"><CardContent className="flex flex-col items-center px-6 py-12 text-center"><span className="flex size-12 items-center justify-center rounded-md bg-sidebar-active text-primary"><Database className="size-6" /></span><h2 className="mt-5 text-xl font-semibold">Nenhum documento enviado</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-strong">{canManage ? "Envie o primeiro TXT ou Markdown para iniciar a base semântica." : "A equipe ainda não enviou documentos para este workspace."}</p></CardContent></Card></MotionItem>;
}
