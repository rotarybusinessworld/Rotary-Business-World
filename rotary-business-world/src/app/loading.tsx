import { PageLoader } from "@/frontend/ui/page-loader";

/** Global fallback loader for routes without a closer loading.tsx. */
export default function Loading() {
  return <PageLoader />;
}
