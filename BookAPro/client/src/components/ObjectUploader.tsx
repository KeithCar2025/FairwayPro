import { useState, useEffect, useRef } from "react";
import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { DashboardModal } from "@uppy/react";
import { Button } from "@/components/ui/button";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB
  onComplete,
  buttonClassName,
  children,
}) {
  const [showModal, setShowModal] = useState(false);
  const uppyRef = useRef(null);

  if (!uppyRef.current) {
    uppyRef.current = new Uppy({
      restrictions: { maxNumberOfFiles, maxFileSize },
      autoProceed: true,
    }).use(XHRUpload, {
      endpoint: "/api/objects/upload", // <-- your Express upload route
      fieldName: "file",
      method: "POST",
      responseType: "json",
    });
  }

useEffect(() => {
  const uppy = uppyRef.current;
  if (!uppy) return;

  uppy.off("complete");

  const handleComplete = (result) => {
    setShowModal(false);
    setTimeout(() => {
      if (uppy && typeof uppy.reset === "function") {
        uppy.reset();
      }
    }, 250);

    if (onComplete) {
      Promise.resolve(onComplete(result)).catch((e) =>
        console.error("onComplete error", e)
      );
    }
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