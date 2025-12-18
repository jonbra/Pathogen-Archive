import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { useUploadSequences } from "@/hooks/use-sequences";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const [fastaFile, setFastaFile] = useState<File | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadataInputRef = useRef<HTMLInputElement>(null);
  
  const { mutate: upload, isPending } = useUploadSequences();
  const { toast } = useToast();

  const handleUpload = () => {
    if (!fastaFile) return;

    const formData = new FormData();
    formData.append("fasta", fastaFile);
    if (metadataFile) {
      formData.append("metadata", metadataFile);
    }

    upload(formData, {
      onSuccess: (data) => {
        toast({
          title: "Upload Successful",
          description: `${data.count} sequences imported successfully.`,
          variant: "default",
        });
        setFastaFile(null);
        setMetadataFile(null);
      },
      onError: (error) => {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Upload Sequences</h1>
        <p className="text-muted-foreground mt-2">Submit FASTA files and optional metadata for analysis.</p>
      </div>

      <div className="grid gap-6">
        {/* FASTA Upload Card */}
        <div className="glass-panel p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              <DnaIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Sequence File (FASTA)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: .fasta, .fa, .fna
              </p>
            </div>

            <input 
              type="file" 
              accept=".fasta,.fa,.fna" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => setFastaFile(e.target.files?.[0] || null)}
            />

            {!fastaFile ? (
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                Select File
              </Button>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl w-full max-w-sm mt-4">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 text-left truncate text-sm font-medium">
                  {fastaFile.name}
                </div>
                <button 
                  onClick={() => setFastaFile(null)}
                  className="p-1 hover:bg-background rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Upload Card */}
        <div className="glass-panel p-8 rounded-2xl border-2 border-dashed border-border hover:border-accent/50 transition-colors">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-accent/10 rounded-full text-accent">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Metadata File (Optional)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                CSV format matching accession IDs
              </p>
            </div>

            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={metadataInputRef}
              onChange={(e) => setMetadataFile(e.target.files?.[0] || null)}
            />

            {!metadataFile ? (
              <Button 
                variant="outline" 
                onClick={() => metadataInputRef.current?.click()}
                className="mt-4"
              >
                Select CSV
              </Button>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl w-full max-w-sm mt-4">
                <FileText className="w-5 h-5 text-accent" />
                <div className="flex-1 text-left truncate text-sm font-medium">
                  {metadataFile.name}
                </div>
                <button 
                  onClick={() => setMetadataFile(null)}
                  className="p-1 hover:bg-background rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleUpload} 
          disabled={!fastaFile || isPending}
          size="lg"
          className="w-full md:w-auto min-w-[200px]"
        >
          {isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5" />
              Upload & Process
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}

function DnaIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 15c6.667-6 13.333 0 20-6" />
      <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
      <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
      <path d="M17 6l-2.5-2.5" />
      <path d="M14 18l-2.5 2.5" />
      <path d="M9.5 10l-2.5 2.5" />
      <path d="M20 9l-2.5 2.5" />
    </svg>
  )
}
