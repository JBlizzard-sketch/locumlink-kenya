import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useGetMyLocum } from "@workspace/api-client-react";
import { FileText, Upload, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL as string;

const DOCUMENT_TYPES = [
  {
    key: "medical_license",
    label: "Medical/Nursing License",
    description: "Valid practice certificate from your licensing body (KMPDC, NCK, COAK, etc.)",
    required: true,
  },
  {
    key: "national_id",
    label: "National ID / Passport",
    description: "Clear copy of Kenya National ID (front & back) or valid passport",
    required: true,
  },
  {
    key: "academic_certificate",
    label: "Academic Certificates",
    description: "Degree/diploma certificate from a recognised medical institution",
    required: true,
  },
  {
    key: "good_standing",
    label: "Certificate of Good Standing",
    description: "Issued by your regulatory body confirming active registration",
    required: false,
  },
  {
    key: "indemnity_insurance",
    label: "Professional Indemnity",
    description: "Proof of current professional indemnity insurance",
    required: false,
  },
  {
    key: "other",
    label: "Other Supporting Document",
    description: "Any additional credential or supporting document",
    required: false,
  },
] as const;

type DocKey = (typeof DOCUMENT_TYPES)[number]["key"];

interface UploadedDoc {
  key: DocKey;
  fileName: string;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  url?: string;
}

function StatusBadge({ status }: { status: UploadedDoc["status"] }) {
  if (status === "approved") return <Badge className="bg-emerald-500 text-white"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
  return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Under Review</Badge>;
}

export default function LocumDocuments() {
  const { data: locum, isLoading } = useGetMyLocum();
  const { toast } = useToast();
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([]);

  async function handleUpload(docKey: DocKey, file: File) {
    if (!locum) return;
    setUploading(docKey);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docKey);
      formData.append("locumId", String(locum.id));

      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}api/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Upload failed");
      }

      const result = await res.json() as { fileUrl: string };

      setUploaded(prev => [
        ...prev.filter(d => d.key !== docKey),
        {
          key: docKey,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          status: "pending",
          url: result.fileUrl,
        },
      ]);

      toast({
        title: "Document uploaded",
        description: `${file.name} has been submitted for verification.`,
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  }

  function triggerFilePicker(docKey: DocKey) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUpload(docKey, file);
    };
    input.click();
  }

  const verificationStatus = locum?.verificationStatus || "unverified";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Documents</h1>
        <p className="text-muted-foreground mt-1">
          Upload your credentials for verification. LocumLink Kenya verifies all locum professionals before they can accept shifts.
        </p>
      </div>

      {/* Verification status banner */}
      <Card className={
        verificationStatus === "verified" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" :
        verificationStatus === "rejected" ? "border-red-500 bg-red-50 dark:bg-red-950" :
        verificationStatus === "under_review" ? "border-amber-500 bg-amber-50 dark:bg-amber-950" :
        "border-gray-300"
      }>
        <CardContent className="pt-5 flex items-center gap-4">
          {verificationStatus === "verified" && <CheckCircle className="h-8 w-8 text-emerald-600 shrink-0" />}
          {verificationStatus === "rejected" && <XCircle className="h-8 w-8 text-red-600 shrink-0" />}
          {verificationStatus === "under_review" && <Clock className="h-8 w-8 text-amber-600 shrink-0" />}
          {verificationStatus === "unverified" && <AlertCircle className="h-8 w-8 text-gray-500 shrink-0" />}
          <div>
            <p className="font-semibold text-base">
              {verificationStatus === "verified" && "Account Verified"}
              {verificationStatus === "rejected" && "Verification Rejected"}
              {verificationStatus === "under_review" && "Under Review"}
              {verificationStatus === "unverified" && "Not Yet Verified"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {verificationStatus === "verified" && "Your credentials have been reviewed and approved. You can now apply for shifts."}
              {verificationStatus === "rejected" && "Your verification was not approved. Please re-upload the required documents."}
              {verificationStatus === "under_review" && "Our team is reviewing your documents. This usually takes 1–2 business days."}
              {verificationStatus === "unverified" && "Please upload all required documents below to start the verification process."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Document list */}
      <Card>
        <CardHeader>
          <CardTitle>Credential Documents</CardTitle>
          <CardDescription>
            Accepted formats: PDF, JPG, PNG. Maximum file size: 10 MB per document.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {DOCUMENT_TYPES.map((doc, idx) => {
            const existing = uploaded.find(u => u.key === doc.key);
            const isUploading = uploading === doc.key;
            return (
              <div key={doc.key} className={`flex items-start justify-between gap-4 py-5 ${idx === 0 ? "pt-0" : ""}`}>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{doc.label}</p>
                      {doc.required && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">Required</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                    {existing && (
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={existing.status} />
                        <span className="text-xs text-muted-foreground">{existing.fileName}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(existing.uploadedAt).toLocaleDateString("en-KE")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={existing ? "outline" : "default"}
                  onClick={() => triggerFilePicker(doc.key)}
                  disabled={isUploading}
                  className="shrink-0"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {isUploading ? "Uploading..." : existing ? "Re-upload" : "Upload"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Verification info */}
      <Card>
        <CardContent className="pt-5 space-y-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">What happens after you upload?</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Our compliance team verifies your documents against regulatory databases (KMPDC, NCK, COAK).</li>
            <li>Verification typically takes 1–2 business days.</li>
            <li>You'll receive an SMS and email notification once your status changes.</li>
            <li>Approved locums can immediately apply for shifts and be matched automatically.</li>
          </ul>
          <Separator />
          <p>
            Questions? Email <a href="mailto:verify@locumlink.co.ke" className="text-emerald-600 underline underline-offset-2">verify@locumlink.co.ke</a> or call <span className="font-medium">+254 700 000 000</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
