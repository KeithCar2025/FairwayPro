import { useState, useEffect, useRef } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { DashboardModal } from "@uppy/react";
import { Button } from "@/components/ui/button";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}) {
  const [showModal, setShowModal] = useState(false);
  const uppyRef = useRef(null);

  // Create Uppy instance ONCE
  if (!uppyRef.current) {
    uppyRef.current = new Uppy({
      restrictions: { maxNumberOfFiles, maxFileSize },
      autoProceed: true,
    }).use(AwsS3, {
      shouldUseMultipart: false,
      getUploadParameters: onGetUploadParameters,
    });
  }

useEffect(() => {
  const uppy = uppyRef.current;
  if (!uppy) return;

  uppy.off("complete");

  const handleComplete = async (result) => {
    console.log("Uppy complete event fired", result); // <-- LOG HERE
    if (onComplete) {
      try {
        await onComplete(result);
      } catch (e) {
        // swallow errors so modal always closes
        console.error("onComplete error", e);
      }
    }
    setShowModal(false);
    setTimeout(() => uppy.reset(), 250);
  };

  uppy.on("complete", handleComplete);

  return () => {
    uppy.off("complete", handleComplete);
  };
}, [onComplete]);
  return (
    <div>
      <Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setShowModal(true);
        }}
        className={buttonClassName}
      >
        {children}
      </Button>
      {uppyRef.current && (
        <DashboardModal
          uppy={uppyRef.current}
          open={showModal}
          onRequestClose={() => setShowModal(false)}
          proudlyDisplayPoweredByUppy={false}
        />
      )}
    </div>
  );
}