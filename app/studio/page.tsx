import { WorkspaceSkeleton } from "@/components/workspace-loading";
import { Suspense } from "react";
import Studio from "@/components/studio";
export const metadata = { title: "Design studio" };
export default function StudioPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton studio />}>
      <Studio />
    </Suspense>
  );
}
