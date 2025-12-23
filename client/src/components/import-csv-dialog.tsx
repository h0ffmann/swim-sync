import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/use-activities";
import { Upload, Loader2 } from "lucide-react";

export function ImportCSVDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refetch } = useActivities();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileContent = await file.text();
      const response = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: fileContent }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Import Failed",
          description: error.message || "Failed to import CSV",
          variant: "destructive",
        });
        return;
      }

      const result = await response.json();
      toast({
        title: "Import Successful",
        description: result.message,
      });

      refetch();
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to read file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-import-csv">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from Garmin</DialogTitle>
          <DialogDescription>
            Upload a CSV file exported from Garmin Connect to import all your swimming activities.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={loading}
              className="w-full h-full opacity-0 cursor-pointer absolute inset-0"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Export activities from Garmin Connect as CSV and upload here. All activities will be automatically parsed and added to your profile.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
