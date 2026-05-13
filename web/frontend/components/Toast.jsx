import { Toast as PolarisToast } from "@shopify/polaris";

export default function CommonToast({
  active,
  message,
  error = false,
  onDismiss,
}) {
  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        width: "fit-content",
        maxWidth: "420px",
      }}
    >
      <PolarisToast
        content={message}
        error={error}
        onDismiss={onDismiss}
      />
    </div>
  );
}