import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ObjectUploader({
  maxFileSize = 5242880, // 5MB default
  onComplete,
  buttonClassName,
  children,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxFileSize / 1024 / 1024}MB`,
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      
      // Upload the file
      const response = await fetch("/api/direct-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Upload result:", result);
      
      if (!result.success || !result.path) {
        throw new Error("Upload failed: Invalid server response");
      }
      
      // Call onComplete with the path
      if (onComplete) {
        onComplete({
          successful: [{ meta: { objectPath: result.path } }]
        });
      }
      
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded."
      });
      
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  return (
    <div>
      <input
        type="file"
        id="file-upload"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        ref={fileInputRef}
        accept="image/*"
      />
      <Button
        type="button"
        disabled={isUploading}
        onClick={() => document.getElementById('file-upload').click()}
        className={buttonClassName}
      >
        {isUploading ? (
          <span>Uploading...</span>
        ) : (
          <span>
            <Upload className="w-4 h-4 mr-2" />
            {children}
          </span>
        )}
      </Button>
    </div>
  );
}