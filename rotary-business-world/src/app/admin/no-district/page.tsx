import { AlertTriangle } from "lucide-react";

export const metadata = { title: "District not assigned" };

export default function NoDistrictPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <AlertTriangle className="h-10 w-10 text-yellow-500" />
      <h1 className="text-xl font-semibold text-foreground">No district assigned</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Your account is a district admin but is not assigned to any district — this can
        happen if the district was removed. Contact management to resolve this.
      </p>
    </div>
  );
}
