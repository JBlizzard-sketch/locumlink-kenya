import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useGetMyLocum } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { FileText, Upload, CheckCircle, Clock, XCircle, AlertCircle, ExternalLink } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL as string;

const DOCUMENT_CONFIGS = [
  {
    key: "practicingCertUrl" as const,
    label: "Medical / Nursing License",
    description: "Valid practice certificate from your licensing body (KMPDC, NCK, COAK, etc.)",
    required: true,
  },
  {
    key: "idDocumentUrl" as const,
    label: "National ID / Passport",
    description: "Clear copy of Kenya National ID (front & back) or valid passport",
    required: true,
  },
  {
    key: "registrationCertUrl" as const,
    label: "Academic / Registration Certificate",
    description: "Degree, diploma, or registration certificate from a recognised medical institution",
    required: true,
  },
] as const;

type DocFieldKey = (typeof DOCUMENT_CONFIGS)[number]["key"];

interface PendingUpload {
  fieldKey: DocFieldKey;
  fileName: string;
  objectPath: string;
}

function StatusBadge({ status }: { status: "approved" | "pending" | "none" }) {
  if (status === "approved") return <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle className="h-3 w-3" /> Uploaded</Badge>;
  if (status === "pending") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Under Review</Badge>;
  return null;
}

export default function LocumDocuments() {
  const { data: locum, isLoading, refetch } = useGetMyLocum();
  const { toast } = useToast();
  const [uploadingKey, setUploadingKey] = useState<DocFieldKey | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const { uploadFile, progress } = useUpload({
    basePath: `${BASE_URL}api/storage`,
    onError: (err) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  async function handleUpload(fieldKey: DocFieldKey, file: File) {
    if (!locum) return;
    setUploadingKey(fieldKey);

    try {
      const result = await uploadFile(file);
      if (!result) return;

      const token = localStorage.getItem("token");
      const patchRes = await fetch(`${BASE_URL}api/locums/${locum.id}/documents`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [fieldKey]: result.objectPath }),
      });

      if (!patchRes.ok) {
        throw new Error("Failed to save document reference");
      }

      setPendingUploads(prev => [
        ...prev.filter(p => p.fieldKey !== fieldKey),
        { fieldKey, fileName: file.name, objectPath: result.objectPath },
      ]);
      await refetch();

      toast({
        title: "Document uploaded",
        description: `${file.name} submitted for verification. Our team will review within 1–2 business days.`,
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingKey(null);
    }
  }

  function triggerFilePicker(fieldKey: DocFieldKey) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUpload(fieldKey, file);
    };
    input.click();
  }

  const verificationStatus = locum?.verificationStatus || "unverified";

  const getDocStatus = (fieldKey: DocFieldKey): "approved" | "pending" | "none" => {
    const existingUrl = locum?.[fieldKey as keyof typeof locum] as string | null | undefined;
    if (existingUrl) return verificationStatus === "verified" ? "approved" : "pending";
    const pending = pendingUploads.find(p => p.fieldKey === fieldKey);
    if (pending) return "pending";
    return "none";
  };

  const getDocUrl = (fieldKey: DocFieldKey): string | null => {
    const existingUrl = locum?.[fieldKey as keyof typeof locum] as string | null | undefined;
    if (existingUrl) return `${BASE_URL}api/storage${existingUrl}`;
    const pending = pendingUploads.find(p => p.fieldKey === fieldKey);
    if (pending) return `${BASE_URL}api/storage${pending.objectPath}`;
    return null;
  };

  const uploadedCount = DOCUMENT_CONFIGS.filter(d => getDocStatus(d.key) !== "none").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Documents</h1>
        <p className="text-muted-foreground mt-1">
          Upload your credentials for verification. LocumLink Kenya verifies all locum professionals before they can accept shifts.
        </p>
      </div>

      <Card className={
        verificationStatus === "verified" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" :
        verificationStatus === "rejected" ? "border-red-500 bg-red-50 dark:bg-red-950" :
        verificationStatus === "pending" ? "border-amber-500 bg-amber-50 dark:bg-amber-950" :
        "border-gray-300"
      }>
        <CardContent className="pt-5 flex items-start gap-4">
          {verificationStatus === "verified" && <CheckCircle className="h-8 w-8 text-emerald-600 shrink-0 mt-0.5" />}
          {verificationStatus === "rejected" && <XCircle className="h-8 w-8 text-red-600 shrink-0 mt-0.5" />}
          {verificationStatus === "pending" && <Clock className="h-8 w-8 text-amber-600 shrink-0 mt-0.5" />}
          {(verificationStatus === "unverified" || verificationStatus === "not_submitted") && <AlertCircle className="h-8 w-8 text-gray-500 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-semibold text-base">
              {verificationStatus === "verified" && "Account Verified"}
              {verificationStatus === "rejected" && "Verification Rejected"}
              {verificationStatus === "pending" && "Under Review"}
              {(verificationStatus === "unverified" || verificationStatus === "not_submitted") && "Not Yet Verified"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {verificationStatus === "verified" && "Your credentials have been reviewed and approved. You can now apply for shifts."}
              {verificationStatus === "rejected" && "Your verification was not approved. Please re-upload the required documents."}
              {verificationStatus === "pending" && "Our team is reviewing your documents. This usually takes 1–2 business days."}
              {(verificationStatus === "unverified" || verificationStatus === "not_submitted") && "Please upload all required documents below to start the verification process."}
            </p>
            {uploadedCount > 0 && verificationStatus !== "verified" && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{uploadedCount} of {DOCUMENT_CONFIGS.length} documents uploaded</span>
                  <span>{Math.round((uploadedCount / DOCUMENT_CONFIGS.length) * 100)}%</span>
                </div>
                <Progress value={(uploadedCount / DOCUMENT_CONFIGS.length) * 100} className="h-1.5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credential Documents</CardTitle>
          <CardDescription>
            Accepted formats: PDF, JPG, PNG. Maximum file size: 10 MB per document.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {DOCUMENT_CONFIGS.map((doc, idx) => {
            const status = getDocStatus(doc.key);
            const docUrl = getDocUrl(doc.key);
            const isUploading = uploadingKey === doc.key;
            return (
              <div key={doc.key} className={`flex items-start justify-between gap-4 py-5 ${idx === 0 ? "pt-0" : ""}`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className={`h-5 w-5 shrink-0 mt-0.5 ${status === "approved" ? "text-emerald-600" : status === "pending" ? "text-amber-600" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{doc.label}</p>
                      {doc.required && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">Required</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                    {status !== "none" && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge status={status} />
                        {docUrl && (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View document
                          </a>
                        )}
                      </div>
                    )}
                    {isUploading && progress > 0 && progress < 100 && (
                      <div className="mt-2 space-y-1">
                        <Progress value={progress} className="h-1 w-40" />
                        <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={status !== "none" ? "outline" : "default"}
                  onClick={() => triggerFilePicker(doc.key)}
                  disabled={isUploading || !!uploadingKey}
                  className="shrink-0"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {isUploading ? "Uploading..." : status !== "none" ? "Re-upload" : "Upload"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">What happens after you upload?</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Our compliance team verifies your documents against regulatory databases (KMPDC, NCK, COAK).</li>
            <li>Verification typically takes 1–2 business days.</li>
            <li>You'll receive an SMS and in-app notification once your status changes.</li>
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
