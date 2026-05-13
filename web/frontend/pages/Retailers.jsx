import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Badge,
  Banner,
  Box,
  Button,
  ButtonGroup,
  Card,
  DropZone,
  EmptyState,
  FormLayout,
  IndexTable,
  List,
  Modal,
  Page,
  Pagination,
  ProgressBar,
  Select,
  Text,
  TextField,
  useIndexResourceState,
  Spinner,
  Autocomplete,
} from "@shopify/polaris";
import { handleApiResponse } from "../utils/apiHandler";
import CommonToast from "../components/Toast";

// Polaris v10 compat shims for BlockStack / InlineStack (added in v11)
const GAP_MAP = { "0": "0px", "100": "4px", "200": "8px", "300": "12px", "400": "16px", "500": "20px", "600": "24px", "800": "32px", "1600": "64px" };
const gapPx = (g) => GAP_MAP[String(g)] ?? "0px";

const BlockStack = ({ children, gap = "0" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: gapPx(gap) }}>{children}</div>
);

const InlineStack = ({ children, align, gap = "0" }) => {
  const justifyMap = { "space-between": "space-between", end: "flex-end", start: "flex-start", center: "center" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: gapPx(gap), justifyContent: justifyMap[align] || "flex-start" }}>
      {children}
    </div>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const RETAILER_TYPE_OPTIONS = [
  { label: "Select type…", value: "" },
  { label: "Online", value: "online" },
  { label: "Offline", value: "offline" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const EMPTY_RETAILER = {
  name: "",
  retailer_type: "",
  status: "active",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  website_url: "",
  google_maps_link: "",
  opening_hours: "",
  category_ids: [],
  notes: "",
};

const TABLE_HEADINGS = [
  "ID", "Name", "Type", "Status",
  "Address 1", "Address 2", "City", "State", "Country", "Postal Code",
  "Latitude", "Longitude", "Phone", "Email", "Website", "Google Maps",
  "Opening Hours", "Categories", "Notes", "Actions",
].map((title) => ({ title }));

const CSV_TEMPLATE_HEADERS = [
  "name", "retailer_type", "status", "address_line1", "address_line2",
  "city", "state", "Country", "postal_code", "latitude", "longitude",
  "phone", "email", "website_url", "google_maps_link", "opening_hours",
  "categories", "notes",
];

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{7,15}$/;

const validateRetailerData = (data) => {
  const errors = {};
  const required = (key, label) => {
    if (!data[key]?.trim()) errors[key] = `${label} is required`;
  };

  required("name", "Retailer name");
  required("status", "Status");
  required("country", "Country");
  required("address_line1", "Address Line 1");
  required("city", "City");
  required("state", "State");
  required("postal_code", "Postal code");
  required("opening_hours", "Opening hours");
  required("google_maps_link", "Google Maps link");

  if (!data.phone?.trim()) {
    errors.phone = "Phone is required";
  } else if (!PHONE_REGEX.test(data.phone)) {
    errors.phone = "Invalid phone number (7–15 digits)";
  }

  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.email = "Invalid email address";
  }

  if (data.google_maps_link && !/^https?:\/\/(www\.)?google\./.test(data.google_maps_link)) {
    errors.google_maps_link = "Invalid Google Maps link";
  }

  if (!data.category_ids?.length) {
    errors.category_ids = "At least one category is required";
  }

  if (!data.latitude?.trim()) {
    errors.latitude = "Latitude is required";
  } else {
    const lat = Number(data.latitude);
    if (isNaN(lat)) errors.latitude = "Latitude must be a number";
    else if (lat < -90 || lat > 90) errors.latitude = "Latitude must be between -90 and 90";
  }

  if (!data.longitude?.trim()) {
    errors.longitude = "Longitude is required";
  } else {
    const lng = Number(data.longitude);
    if (isNaN(lng)) errors.longitude = "Longitude must be a number";
    else if (lng < -180 || lng > 180) errors.longitude = "Longitude must be between -180 and 180";
  }

  if (Number(data.latitude) === 0 && Number(data.longitude) === 0) {
    errors.latitude = "Invalid location (0,0 not allowed)";
    errors.longitude = "Invalid location (0,0 not allowed)";
  }

  return errors;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const downloadCSVTemplate = () => {
  const exampleRow = [
    "Sample Store", "India", "offline", "active", "123 Main St",
    "Suite 4", "Mumbai", "Maharashtra", "India", "400001",
    "19.076090", "72.877426", "9876543210", "store@example.com",
    "https://example.com", "https://maps.google.com/?q=...",
    "Mon-Sat 9am-6pm", "Near city center", "Electronics,Clothing",
  ];
  const csv = [CSV_TEMPLATE_HEADERS.join(","), exampleRow.join(",")].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  Object.assign(document.createElement("a"), { href: url, download: "retailers_import_template.csv" }).click();
  URL.revokeObjectURL(url);
};

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);
  return { res, ok: res.ok };
};

// ─── Common Components ────────────────────────────────────────────────────────

/**
 * Reusable toggle row used in the settings card.
 */
const ToggleRow = ({ label, description, enabled, onToggle, disabled, borderBottom }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "18px 20px",
      background: "#ffffff",
      ...(borderBottom && { borderBottom: "1px solid #e1e3e5" }),
    }}
  >
    <div>
      <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "13px", color: "#6b7280" }}>{description}</div>
    </div>
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={`Toggle ${label}`}
      style={{
        position: "relative",
        width: "46px",
        height: "26px",
        background: enabled ? "#008060" : "#d1d5db",
        borderRadius: "999px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.25s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: enabled ? "23px" : "3px",
          width: "20px",
          height: "20px",
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.25s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  </div>
);

/**
 * Confirm delete modal shared for single and bulk deletions.
 */
const DeleteModal = ({ context, onClose, onConfirm, isDeleting }) => (
  <Modal
    open={Boolean(context)}
    onClose={onClose}
    title="Delete Retailer"
    primaryAction={{ content: "Delete", destructive: true, onAction: onConfirm, loading: isDeleting }}
    secondaryActions={[{ content: "Cancel", onAction: onClose }]}
  >
    <Modal.Section>
      <Text as="p">
        Are you sure you want to delete{" "}
        <Text as="span" fontWeight="semibold">
          {context?.type === "single"
            ? `${context.items[0]?.name}?`
            : `${context?.items.length} retailers?`}
        </Text>{" "}
        This action will deactivate the retailer{context?.type !== "single" ? "s" : ""}.
      </Text>
    </Modal.Section>
  </Modal>
);

// ─── Retailer Form ────────────────────────────────────────────────────────────

const RetailerForm = ({ retailer, onChange, errors = {}, allCategories = [], countryOptions = [] }) => (
  <FormLayout>
    <Text variant="headingSm" as="h3">Basic Information</Text>
    <FormLayout.Group condensed>
      <TextField
        label="Retailer Name"
        value={retailer.name}
        onChange={(v) => onChange("name", v)}
        error={errors.name}
        autoComplete="organization"
      />
      <Select
        label="Type"
        options={RETAILER_TYPE_OPTIONS}
        value={retailer.retailer_type}
        onChange={(v) => onChange("retailer_type", v)}
        error={errors.retailer_type}
      />
    </FormLayout.Group>

    <FormLayout.Group condensed>
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        value={retailer.status}
        onChange={(v) => onChange("status", v)}
      />
      <Autocomplete
        allowMultiple
        options={allCategories.map((c) => ({ value: String(c.id), label: c.name }))}
        selected={retailer.category_ids || []}
        onSelect={(selected) => onChange("category_ids", selected)}
        textField={
          <Autocomplete.TextField
            label="Categories"
            placeholder="Select categories"
            autoComplete="off"
            error={errors.category_ids}
            value={
              (retailer.category_ids || [])
                .map((id) => allCategories.find((c) => String(c.id) === String(id))?.name)
                .filter(Boolean)
                .join(", ")
            }
          />
        }
      />
    </FormLayout.Group>

    <Text variant="headingSm" as="h3">Location</Text>
    <TextField label="Address Line 1" value={retailer.address_line1} onChange={(v) => onChange("address_line1", v)} error={errors.address_line1} autoComplete="address-line1" />
    <TextField label="Address Line 2" value={retailer.address_line2} onChange={(v) => onChange("address_line2", v)} autoComplete="address-line2" />
    <FormLayout.Group condensed>
      <TextField label="City" value={retailer.city} onChange={(v) => onChange("city", v)} error={errors.city} autoComplete="address-level2" />
      <TextField label="State" value={retailer.state} onChange={(v) => onChange("state", v)} error={errors.state} autoComplete="address-level1" />
    </FormLayout.Group>
    <FormLayout.Group condensed>
      <TextField label="Postal Code" value={retailer.postal_code} onChange={(v) => onChange("postal_code", v)} error={errors.postal_code} autoComplete="postal-code" />
      <Select label="Country" options={countryOptions} value={retailer.country} onChange={(v) => onChange("country", v)} error={errors.country} />
    </FormLayout.Group>

    <Text variant="headingSm" as="h3">Coordinates</Text>
    <FormLayout.Group condensed>
      <TextField label="Latitude" value={retailer.latitude} onChange={(v) => onChange("latitude", v)} error={errors.latitude} autoComplete="off" inputMode="decimal" placeholder="-90 to 90" />
      <TextField label="Longitude" value={retailer.longitude} onChange={(v) => onChange("longitude", v)} error={errors.longitude} autoComplete="off" inputMode="decimal" placeholder="-180 to 180" />
    </FormLayout.Group>

    <Text variant="headingSm" as="h3">Contact</Text>
    <FormLayout.Group condensed>
      <TextField label="Phone" value={retailer.phone} onChange={(v) => onChange("phone", v)} error={errors.phone} autoComplete="tel" type="tel" />
      <TextField label="Email" value={retailer.email} onChange={(v) => onChange("email", v)} error={errors.email} autoComplete="email" type="email" />
    </FormLayout.Group>

    <Text variant="headingSm" as="h3">Links</Text>
    <TextField label="Website URL" value={retailer.website_url} onChange={(v) => onChange("website_url", v)} autoComplete="url" type="url" />
    <TextField label="Google Maps Link" value={retailer.google_maps_link} onChange={(v) => onChange("google_maps_link", v)} autoComplete="off" type="url" error={errors.google_maps_link} />

    <Text variant="headingSm" as="h3">Additional Info</Text>
    <TextField label="Opening Hours" value={retailer.opening_hours} onChange={(v) => onChange("opening_hours", v)} autoComplete="off" error={errors.opening_hours} placeholder="e.g. Mon–Fri 9am–6pm" />
    <TextField label="Notes" value={retailer.notes} onChange={(v) => onChange("notes", v)} multiline={3} autoComplete="off" />
  </FormLayout>
);

// ─── Import CSV Modal ─────────────────────────────────────────────────────────

const ImportCSVModal = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dropError, setDropError] = useState(null);

  const reset = () => { setFile(null); setResult(null); setDropError(null); };
  const handleClose = () => { reset(); onClose(); };

  const handleDrop = useCallback((_dropped, accepted, rejected) => {
    setDropError(null);
    setResult(null);
    if (rejected.length > 0) return setDropError("Only .csv files are accepted.");
    const picked = accepted[0];
    if (picked?.size > 5 * 1024 * 1024) return setDropError("File exceeds 5 MB limit.");
    setFile(picked);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/app/retailers/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setResult({ apiError: data.error || `Server error: ${res.status}` }); return; }
      setResult(data);
      if (data.inserted > 0) onSuccess();
    } catch {
      setResult({ apiError: "Network error — please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const successPct = result ? Math.round((result.inserted / result.total) * 100) : 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Retailers via CSV"
      primaryAction={
        result
          ? { content: "Done", onAction: handleClose }
          : { content: "Import", onAction: handleImport, loading: isUploading, disabled: !file || isUploading }
      }
      secondaryActions={
        result
          ? [{ content: "Import Another", onAction: reset }]
          : [{ content: "Cancel", onAction: handleClose }]
      }
      large
    >
      <Modal.Section>
        {!result && (
          <BlockStack gap="400">
            <Banner tone="info">
              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">CSV format requirements</Text>
                <Text as="p">Your CSV must include a header row with these columns:</Text>
                <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    <code style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {CSV_TEMPLATE_HEADERS.join(", ")}
                    </code>
                  </Text>
                </Box>
              </BlockStack>
            </Banner>

            <InlineStack align="end">
              <Button variant="plain" onClick={downloadCSVTemplate}>
                Download CSV Template
              </Button>
            </InlineStack>

            <DropZone accept=".csv" type="file" onDrop={handleDrop} allowMultiple={false} label="Upload CSV file">
              {file ? (
                <Box padding="400">
                  <InlineStack gap="300" align="center" blockAlign="center">
                    <Text fontWeight="semibold">{file.name}</Text>
                    <Text tone="subdued" variant="bodySm">{(file.size / 1024).toFixed(1)} KB</Text>
                    <Button variant="plain" tone="critical" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                      Remove
                    </Button>
                  </InlineStack>
                </Box>
              ) : (
                <DropZone.FileUpload actionTitle="Choose CSV file" actionHint="or drag and drop here. Max 5 MB." />
              )}
            </DropZone>

            {dropError && <Banner tone="critical"><Text as="p">{dropError}</Text></Banner>}

            {isUploading && (
              <Box paddingBlockStart="200">
                <BlockStack gap="200">
                  <Text as="p" tone="subdued">Uploading and processing…</Text>
                  <ProgressBar progress={50} animated />
                </BlockStack>
              </Box>
            )}
          </BlockStack>
        )}

        {result && (
          <BlockStack gap="400">
            {result.apiError ? (
              <Banner tone="critical" title="Import failed">
                <Text as="p">{result.apiError}</Text>
              </Banner>
            ) : (
              <>
                <Banner
                  tone={result.failed === 0 ? "success" : result.inserted > 0 ? "warning" : "critical"}
                  title={
                    result.failed === 0
                      ? "Import completed successfully"
                      : result.inserted > 0
                      ? "Import completed with some errors"
                      : "Import failed — no rows were inserted"
                  }
                >
                  <BlockStack gap="100">
                    <Text as="p">Total rows in CSV: <strong>{result.total}</strong></Text>
                    <Text as="p">Successfully inserted: <strong>{result.inserted}</strong></Text>
                    <Text as="p">Failed / skipped: <strong>{result.failed}</strong></Text>
                  </BlockStack>
                </Banner>

                {result.inserted > 0 && (
                  <ProgressBar progress={successPct} tone={result.failed === 0 ? "success" : "highlight"} />
                )}

                {result.errors?.length > 0 && (
                  <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                    <BlockStack gap="200">
                      <Text fontWeight="semibold" tone="critical">
                        Row errors ({result.errors.length}):
                      </Text>
                      <div style={{ maxHeight: 220, overflowY: "auto" }}>
                        <List type="bullet">
                          {result.errors.map((e, idx) => (
                            <List.Item key={idx}>
                              <Text variant="bodySm">
                                <Text as="span" fontWeight="semibold">Row {e.row}:</Text> {e.error}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </div>
                    </BlockStack>
                  </Box>
                )}
              </>
            )}
          </BlockStack>
        )}
      </Modal.Section>
    </Modal>
  );
};

// ─── Retailers Manager (Main) ─────────────────────────────────────────────────

const RetailersManager = () => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [allCategories, setAllCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [showGlobalRetailers, setShowGlobalRetailers] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState(null);
  const [deleteContext, setDeleteContext] = useState(null);
  const [newRetailer, setNewRetailer] = useState(EMPTY_RETAILER);
  const [newRetailerErrors, setNewRetailerErrors] = useState({});
  const [editRetailerErrors, setEditRetailerErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [toast, setToast] = useState({ active: false, message: "", error: false });

  const showToast = useCallback((message, isError = false) => {
    setToast({ active: true, message, error: isError });
  }, []);

  const totalPages = Math.max(1, Math.ceil(retailers.length / PAGE_SIZE));
  const paginatedRetailers = useMemo(
    () => retailers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, retailers]
  );

  const countryOptions = useMemo(() => [
    { label: "Select country", value: "" },
    ...countries.map((c) => ({ label: c.name, value: c.name })),
  ], [countries]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(paginatedRetailers);

  // ── Data fetchers ──

  const fetchData = useCallback(async (url, setter, errorMsg) => {
    try {
      const res = await fetch(url);
      const data = await handleApiResponse(res, showToast);
      if (data) setter(data.data);
    } catch {
      showToast(errorMsg, true);
    }
  }, [showToast]);

  const fetchRetailers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchValue.trim()) params.append("search", searchValue);
      const res = await fetch(`/app/retailers?${params}`);
      const data = await handleApiResponse(res, showToast);
      if (data) setRetailers(data.data);
    } catch {
      showToast("Failed to fetch retailers", true);
    } finally {
      setLoading(false);
    }
  }, [searchValue, showToast]);

  useEffect(() => { fetchData("/app/categories", setAllCategories, "Failed to fetch categories"); }, [fetchData]);
  useEffect(() => { fetchData("/app/countries", setCountries, "Failed to fetch countries"); }, [fetchData]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/app/settings");
        const data = await handleApiResponse(res, showToast);
        if (!data) return;
        setFilterEnabled(data.data?.filter_enabled ?? false);
        setShowGlobalRetailers(data.data?.show_global_retailers ?? false);
      } catch {
        showToast("Failed to fetch settings", true);
      }
    })();
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(fetchRetailers, 500);
    return () => clearTimeout(timer);
  }, [fetchRetailers]);

  useEffect(() => { setPage(1); }, [retailers.length]);

  // ── Settings toggle (merged) ──

  const updateSetting = useCallback(async (filterVal, globalVal, successMsg) => {
    setIsUpdatingSettings(true);
    try {
      const res = await fetch("/app/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter_enabled: filterVal, show_global_retailers: globalVal }),
      });
      const data = await handleApiResponse(res, showToast, successMsg);
      if (!data) return false;
      return true;
    } catch (err) {
      showToast(err.message || "Failed to update settings", true);
      return false;
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [showToast]);

  const handleFilterToggle = async () => {
    const next = !filterEnabled;
    const ok = await updateSetting(next, showGlobalRetailers, `Filter ${next ? "enabled" : "disabled"} successfully`);
    if (ok) setFilterEnabled(next);
  };

  const handleGlobalToggle = async () => {
    const next = !showGlobalRetailers;
    const ok = await updateSetting(filterEnabled, next, next ? "Global retailers enabled" : "Country-wise retailers enabled");
    if (ok) setShowGlobalRetailers(next);
  };

  // ── CRUD ──

  const handleCreate = async () => {
    const errors = validateRetailerData(newRetailer);
    if (Object.keys(errors).length) { setNewRetailerErrors(errors); return; }
    setIsCreating(true);
    try {
      const res = await fetch("/app/retailers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRetailer),
      });
      const data = await handleApiResponse(res, showToast, "Retailer created successfully");
      if (!data) return;
      await fetchRetailers();
      setIsCreateOpen(false);
      setNewRetailer(EMPTY_RETAILER);
      setNewRetailerErrors({});
    } catch {
      showToast("Failed to create retailer", true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    const errors = validateRetailerData(editingRetailer);
    if (Object.keys(errors).length) { setEditRetailerErrors(errors); return; }
    setIsSaving(true);
    try {
      const res = await fetch(`/app/retailers/${editingRetailer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRetailer),
      });
      const data = await handleApiResponse(res, showToast, "Retailer updated successfully");
      if (!data) return;
      await fetchRetailers();
      setEditingRetailer(null);
      setEditRetailerErrors({});
    } catch {
      showToast("Failed to update retailer", true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteContext.type === "single") {
        const res = await fetch(`/app/retailers/${deleteContext.items[0].id}`, { method: "DELETE" });
        await handleApiResponse(res, showToast, "Retailer deleted successfully");
      } else {
        await Promise.all(
          deleteContext.items.map((id) =>
            fetch(`/app/retailers/${id}`, { method: "DELETE" }).then((r) => handleApiResponse(r, showToast))
          )
        );
      }
      await fetchRetailers();
      setDeleteContext(null);
      handleSelectionChange([]);
    } catch {
      showToast("Failed to delete retailer", true);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (r) =>
    setEditingRetailer({
      ...r,
      country: r.country?.trim() ?? "",
      category_ids: r.categories
        ? r.categories.split(",").map((name) => {
            const cat = allCategories.find(
              (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
            return cat ? String(cat.id) : null;
          }).filter(Boolean)
        : [],
    });

  // ── Row markup ──

  const rowMarkup = paginatedRetailers.map((r, index) => (
    <IndexTable.Row
      key={r.id}
      id={String(r.id)}
      selected={selectedResources.includes(r.id) || selectedResources.includes(String(r.id))}
      position={index}
    >
      <IndexTable.Cell><Text fontWeight="semibold">{r.id}</Text></IndexTable.Cell>
      <IndexTable.Cell><Text fontWeight="semibold">{r.name}</Text></IndexTable.Cell>
      <IndexTable.Cell>{r.retailer_type || "—"}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={r.status === "active" ? "active" : "inactive"}>{r.status}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>{r.address_line1 || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.address_line2 || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.city || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.state || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.country || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.postal_code || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.latitude || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.longitude || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.phone || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.email || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.website_url || "—"}</IndexTable.Cell>
      <IndexTable.Cell>
        {r.google_maps_link ? (
          <a href={r.google_maps_link} target="_blank" rel="noopener noreferrer">
            {r.google_maps_link.length > 30 ? `${r.google_maps_link.slice(0, 30)}…` : r.google_maps_link}
          </a>
        ) : "—"}
      </IndexTable.Cell>
      <IndexTable.Cell>{r.opening_hours || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.categories || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{r.notes || "—"}</IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup variant="segmented">
          <Button size="slim" onClick={() => openEditModal(r)}>Edit</Button>
          <Button size="slim" tone="critical" onClick={() => setDeleteContext({ type: "single", items: [r] })}>
            Delete
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  // ── Render ──

  return (
    <Page
      title="Retailers"
      subtitle="Manage retailer locations for your Shopify extension app."
      fullWidth
      primaryAction={{ content: "Add Retailer", onAction: () => setIsCreateOpen(true) }}
      secondaryActions={[{ content: "Import CSV", onAction: () => setIsImportOpen(true) }]}
      titleMetadata={<Badge tone="info">{`${retailers.length} total`}</Badge>}
    >
      {/* Settings Card */}
      <Box paddingBlockEnd="500">
        <Card padding="0">
          <ToggleRow
            label="Global Retailers"
            description="Show retailers from all countries on storefront"
            enabled={showGlobalRetailers}
            onToggle={handleGlobalToggle}
            disabled={isUpdatingSettings}
            borderBottom
          />
          <ToggleRow
            label="Filter Settings"
            description="Enable category and location filters on storefront"
            enabled={filterEnabled}
            onToggle={handleFilterToggle}
            disabled={isUpdatingSettings}
          />
        </Card>
      </Box>

      {/* Table Card */}
      <BlockStack gap="400">
        {selectedResources.length > 0 && (
          <Banner tone="info">
            <InlineStack align="space-between">
              <Text as="p">
                {selectedResources.length} retailer{selectedResources.length > 1 ? "s" : ""} selected
              </Text>
              <Button tone="critical" onClick={() => setDeleteContext({ type: "bulk", items: selectedResources })}>
                Delete Selected
              </Button>
            </InlineStack>
          </Banner>
        )}

        <Card padding="0">
          <Box padding="400" background="bg-surface-secondary" borderBlockEndWidth="025" borderColor="border">
            <TextField
              label=""
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search retailers..."
              autoComplete="off"
              clearButton
              onClearButtonClick={() => setSearchValue("")}
            />
          </Box>

          {loading ? (
            <Box padding="1600" as="div" style={{ textAlign: "center" }}>
              <Spinner accessibilityLabel="Loading retailers" size="large" />
            </Box>
          ) : retailers.length === 0 ? (
            <EmptyState
              heading="No retailers found"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            />
          ) : (
            <>
              <IndexTable
                resourceName={{ singular: "retailer", plural: "retailers" }}
                itemCount={paginatedRetailers.length}
                selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                headings={TABLE_HEADINGS}
              >
                {rowMarkup}
              </IndexTable>

              <Box padding="400">
                <InlineStack align="space-between">
                  <Text as="p" tone="subdued">Page {page} of {totalPages}</Text>
                  <Pagination
                    hasPrevious={page > 1}
                    onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                    hasNext={page < totalPages}
                    onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </InlineStack>
              </Box>
            </>
          )}
        </Card>
      </BlockStack>

      {/* Modals */}
      <ImportCSVModal open={isImportOpen} onClose={() => setIsImportOpen(false)} onSuccess={fetchRetailers} />

      <Modal
        open={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setNewRetailer(EMPTY_RETAILER); setNewRetailerErrors({}); }}
        title="Add Retailer"
        primaryAction={{ content: "Create", onAction: handleCreate, loading: isCreating }}
        secondaryActions={[{ content: "Cancel", onAction: () => { setIsCreateOpen(false); setNewRetailer(EMPTY_RETAILER); setNewRetailerErrors({}); } }]}
        large
      >
        <Modal.Section>
          <RetailerForm
            retailer={newRetailer}
            onChange={(field, value) => setNewRetailer((prev) => ({ ...prev, [field]: value }))}
            errors={newRetailerErrors}
            allCategories={allCategories}
            countryOptions={countryOptions}
          />
        </Modal.Section>
      </Modal>

      <Modal
        open={Boolean(editingRetailer)}
        onClose={() => { setEditingRetailer(null); setEditRetailerErrors({}); }}
        title={editingRetailer ? `Edit: ${editingRetailer.name}` : "Edit Retailer"}
        primaryAction={{ content: "Save", onAction: handleSave, loading: isSaving }}
        secondaryActions={[{ content: "Cancel", onAction: () => { setEditingRetailer(null); setEditRetailerErrors({}); } }]}
        large
      >
        <Modal.Section>
          {editingRetailer && (
            <BlockStack gap="400">
              <TextField label="Retailer ID" value={String(editingRetailer.id)} disabled autoComplete="off" />
              <RetailerForm
                retailer={editingRetailer}
                onChange={(field, value) => setEditingRetailer((prev) => ({ ...prev, [field]: value }))}
                errors={editRetailerErrors}
                allCategories={allCategories}
                countryOptions={countryOptions}
              />
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>

      <DeleteModal
        context={deleteContext}
        onClose={() => setDeleteContext(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <CommonToast
        active={toast.active}
        message={toast.message}
        error={toast.error}
        onDismiss={() => setToast({ active: false, message: "", error: false })}
      />
    </Page>
  );
};

export default RetailersManager;