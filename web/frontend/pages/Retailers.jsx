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
  Toast,
  useIndexResourceState,
  Spinner,
  Autocomplete
} from "@shopify/polaris";

const PAGE_SIZE = 6;

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
  { title: "ID" },
  { title: "Name" },
  { title: "Type" },
  { title: "Status" },
  { title: "Address 1" },
  { title: "Address 2" },
  { title: "City" },
  { title: "State" },
  { title: "Country" },
  { title: "Postal Code" },
  { title: "Latitude" },
  { title: "Longitude" },
  { title: "Phone" },
  { title: "Email" },
  { title: "Website" },
  { title: "Google Maps" },
  { title: "Opening Hours" },
  { title: "Categories" },
  { title: "Notes" },
  { title: "Actions" },
];

const CSV_TEMPLATE_HEADERS = [
  "name",
  "retailer_type",
  "status",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "Country",
  "postal_code",
  "latitude",
  "longitude",
  "phone",
  "email",
  "website_url",
  "google_maps_link",
  "opening_hours",
  "categories",
  "notes",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{7,15}$/;

const validateRetailerData = (data) => {
  const errors = {};

  // ✅ Retailer Name
  if (!data.name?.trim()) {
    errors.name = "Retailer name is required";
  }

  // ✅ Status
  if (!data.status?.trim()) {
    errors.status = "Status is required";
  }

  // ✅ Country
  if (!data.country?.trim()) {
    errors.country = "Country is required";
  }

  // ✅ Address Line 1
  if (!data.address_line1?.trim()) {
    errors.address_line1 = "Address Line 1 is required";
  }

  // ✅ City
  if (!data.city?.trim()) {
    errors.city = "City is required";
  }

  // ✅ State
  if (!data.state?.trim()) {
    errors.state = "State is required";
  }

  // ✅ Postal Code
  if (!data.postal_code?.trim()) {
    errors.postal_code = "Postal code is required";
  }

  // ✅ Phone
  if (!data.phone?.trim()) {
    errors.phone = "Phone is required";
  } else if (!PHONE_REGEX.test(data.phone)) {
    errors.phone = "Invalid phone number (7–15 digits)";
  }

  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.email = "Invalid email address";
  }

  // ✅ Google Maps Link
  if (!data.google_maps_link?.trim()) {
    errors.google_maps_link = "Google Maps link is required";
  } else if (!/^https?:\/\/(www\.)?google\./.test(data.google_maps_link)) {
    errors.google_maps_link = "Invalid Google Maps link";
  }

  // ✅ Categories (FIXED)
  if (!data.category_ids || data.category_ids.length === 0) {
    errors.category_ids = "At least one category is required";
  }

  // ✅ Opening Hours
  if (!data.opening_hours?.trim()) {
    errors.opening_hours = "Opening hours are required";
  }

  // ✅ Latitude
  if (!data.latitude?.trim()) {
    errors.latitude = "Latitude is required";
  } else {
    const lat = Number(data.latitude);
    if (isNaN(lat)) {
      errors.latitude = "Latitude must be a number";
    } else if (lat < -90 || lat > 90) {
      errors.latitude = "Latitude must be between -90 and 90";
    }
  }

  // ✅ Longitude
  if (!data.longitude?.trim()) {
    errors.longitude = "Longitude is required";
  } else {
    const lng = Number(data.longitude);
    if (isNaN(lng)) {
      errors.longitude = "Longitude must be a number";
    } else if (lng < -180 || lng > 180) {
      errors.longitude = "Longitude must be between -180 and 180";
    }
  }

  // ❌ Prevent fake location
  if (
    Number(data.latitude) === 0 &&
    Number(data.longitude) === 0
  ) {
    errors.latitude = "Invalid location (0,0 not allowed)";
    errors.longitude = "Invalid location (0,0 not allowed)";
  }

  return errors;
};

const downloadCSVTemplate = () => {
  const exampleRow = [
    "Sample Store",
    "India",
    "offline",
    "active",
    "123 Main St",
    "Suite 4",
    "Mumbai",
    "Maharashtra",
    "India",
    "400001",
    "19.076090",
    "72.877426",
    "9876543210",
    "store@example.com",
    "https://example.com",
    "https://maps.google.com/?q=...",
    "Mon-Sat 9am-6pm",
    "Near city center",
    "Electronics,Clothing",
  ];

  const csvContent = [CSV_TEMPLATE_HEADERS.join(","), exampleRow.join(",")].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "retailers_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
};



const RetailerForm = ({ retailer, onChange, errors = {}, allCategories = [], countryOptions = [], }) => (
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
        options={allCategories.map((c) => ({
          value: String(c.id),
          label: c.name,
        }))}
        selected={retailer.category_ids || []}
        onSelect={(selected) => onChange("category_ids", selected)}
        textField={
          <Autocomplete.TextField
            label="Categories"
            placeholder="Select categories"
            autoComplete="off"
            error={errors.category_ids}
            value={
              retailer.category_ids && retailer.category_ids.length > 0
                ? retailer.category_ids
                  .map((id) => {
                    const cat = allCategories.find(
                      (c) => String(c.id) === String(id)
                    );
                    return cat?.name;
                  })
                  .filter(Boolean)
                  .join(", ")
                : ""
            }
          />
        }
      />
    </FormLayout.Group>

    <Text variant="headingSm" as="h3">Location</Text>

    <TextField
      label="Address Line 1"
      value={retailer.address_line1}
      onChange={(v) => onChange("address_line1", v)}
      autoComplete="address-line1"
    />
    <TextField
      label="Address Line 2"
      value={retailer.address_line2}
      onChange={(v) => onChange("address_line2", v)}
      autoComplete="address-line2"
    />

    <FormLayout.Group condensed>
      <TextField
        label="City"
        value={retailer.city}
        onChange={(v) => onChange("city", v)}
        error={errors.city}
        autoComplete="address-level2"
      />
      <TextField
        label="State"
        value={retailer.state}
        onChange={(v) => onChange("state", v)}
        error={errors.state}
        autoComplete="address-level1"
      />
    </FormLayout.Group>
    <FormLayout.Group condensed>
      <TextField
        label="Postal Code"
        value={retailer.postal_code}
        onChange={(v) => onChange("postal_code", v)}
        error={errors.postal_code}
        autoComplete="postal-code"
      />

      <Select
        label="Country"
        options={countryOptions}
        value={retailer.country}
        onChange={(v) => onChange("country", v)}
        error={errors.country}
      />
    </FormLayout.Group>
    <Text variant="headingSm" as="h3">Coordinates</Text>

    <FormLayout.Group condensed>
      <TextField
        label="Latitude"
        value={retailer.latitude}
        onChange={(v) => onChange("latitude", v)}
        error={errors.latitude}
        autoComplete="off"
        inputMode="decimal"
        placeholder="-90 to 90"
      />
      <TextField
        label="Longitude"
        value={retailer.longitude}
        onChange={(v) => onChange("longitude", v)}
        error={errors.longitude}
        autoComplete="off"
        inputMode="decimal"
        placeholder="-180 to 180"
      />
    </FormLayout.Group>

    <Text variant="headingSm" as="h3">Contact</Text>

    <FormLayout.Group condensed>
      <TextField
        label="Phone"
        value={retailer.phone}
        onChange={(v) => onChange("phone", v)}
        error={errors.phone}
        autoComplete="tel"
        type="tel"
      />
      <TextField
        label="Email"
        value={retailer.email}
        onChange={(v) => onChange("email", v)}
        autoComplete="email"
        type="email"
      />
    </FormLayout.Group>

    <Text variant="headingSm" as="h3">Links</Text>

    <TextField
      label="Website URL"
      value={retailer.website_url}
      onChange={(v) => onChange("website_url", v)}
      autoComplete="url"
      type="url"
    />
    <TextField
      label="Google Maps Link"
      value={retailer.google_maps_link}
      onChange={(v) => onChange("google_maps_link", v)}
      autoComplete="off"
      type="url"
      error={errors.google_maps_link}
    />

    <Text variant="headingSm" as="h3">Additional Info</Text>

    <TextField
      label="Opening Hours"
      value={retailer.opening_hours}
      onChange={(v) => onChange("opening_hours", v)}
      autoComplete="off"
      error={errors.opening_hours}
      placeholder="e.g. Mon–Fri 9am–6pm"
    />
    <TextField
      label="Notes"
      value={retailer.notes}
      onChange={(v) => onChange("notes", v)}
      multiline={3}
      autoComplete="off"
    />
  </FormLayout>
);

const ImportCSVModal = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dropError, setDropError] = useState(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
    setDropError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDropZoneDrop = useCallback((_dropFiles, acceptedFiles, rejectedFiles) => {
    setDropError(null);
    setResult(null);

    if (rejectedFiles.length > 0) {
      setDropError("Only .csv files are accepted. Please choose a valid CSV file.");
      return;
    }
    if (acceptedFiles.length > 0) {
      const picked = acceptedFiles[0];
      if (picked.size > 5 * 1024 * 1024) {
        setDropError("File exceeds 5 MB limit. Please split the CSV and try again.");
        return;
      }
      setFile(picked);
    }
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/app/retailers/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ apiError: data.error || `Server error: ${res.status}` });
        return;
      }

      setResult(data);

      if (data.inserted > 0) {
        onSuccess();
      }
    } catch (err) {
      console.error("importCSV:", err);
      setResult({ apiError: "Network error — please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const successPct = result
    ? Math.round((result.inserted / result.total) * 100)
    : 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Retailers via CSV"
      primaryAction={
        result
          ? { content: "Done", onAction: handleClose }
          : {
            content: "Import",
            onAction: handleImport,
            loading: isUploading,
            disabled: !file || isUploading,
          }
      }
      secondaryActions={
        result
          ? [{ content: "Import Another", onAction: resetState }]
          : [{ content: "Cancel", onAction: handleClose }]
      }
      large
    >
      <Modal.Section>
        {!result && (
          <div gap="400">
            <Banner tone="info">
              <div gap="200">
                <Text as="p" fontWeight="semibold">
                  CSV format requirements
                </Text>
                <Text as="p">
                  Your CSV must include a header row with these columns:
                </Text>
                <Box
                  background="bg-surface-secondary"
                  padding="200"
                  borderRadius="200"
                >
                  <Text as="p" variant="bodySm" tone="subdued">
                    <code style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {CSV_TEMPLATE_HEADERS.join(", ")}
                    </code>
                  </Text>
                </Box>
              </div>
            </Banner>

            <div align="end">
              <Button
                variant="plain"
                icon={
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                    <path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" />
                  </svg>
                }
                onClick={downloadCSVTemplate}
              >
                Download CSV Template
              </Button>
            </div>

            <DropZone
              accept=".csv"
              type="file"
              onDrop={handleDropZoneDrop}
              allowMultiple={false}
              label="Upload CSV file"
            >
              {file ? (
                <Box padding="400">
                  <div gap="300" align="center" blockAlign="center">
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: "#f3f4f6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#6b7280">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                        <path d="M14 2v6h6M8 13h8M8 17h4" />
                      </svg>
                    </div>
                    <div gap="050">
                      <Text fontWeight="semibold">{file.name}</Text>
                      <Text tone="subdued" variant="bodySm">
                        {(file.size / 1024).toFixed(1)} KB
                      </Text>
                    </div>
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                </Box>
              ) : (
                <DropZone.FileUpload
                  actionTitle="Choose CSV file"
                  actionHint="or drag and drop here. Max 5 MB."
                />
              )}
            </DropZone>

            {dropError && (
              <Banner tone="critical">
                <Text as="p">{dropError}</Text>
              </Banner>
            )}

            {isUploading && (
              <Box paddingBlockStart="200">
                <div gap="200">
                  <Text as="p" tone="subdued">Uploading and processing…</Text>
                  <ProgressBar progress={50} animated />
                </div>
              </Box>
            )}
          </div>
        )}

        {result && (
          <div gap="400">
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
                  <div gap="100">
                    <Text as="p">Total rows in CSV: <strong>{result.total}</strong></Text>
                    <Text as="p">Successfully inserted: <strong>{result.inserted}</strong></Text>
                    <Text as="p">Failed / skipped: <strong>{result.failed}</strong></Text>
                  </div>
                </Banner>

                {result.inserted > 0 && (
                  <ProgressBar
                    progress={successPct}
                    tone={result.failed === 0 ? "success" : "highlight"}
                  />
                )}

                {result.errors?.length > 0 && (
                  <Box
                    background="bg-surface-secondary"
                    padding="300"
                    borderRadius="200"
                  >
                    <div gap="200">
                      <Text fontWeight="semibold" tone="critical">
                        Row errors ({result.errors.length}):
                      </Text>
                      <div style={{ maxHeight: 220, overflowY: "auto" }}>
                        <List type="bullet">
                          {result.errors.map((e, idx) => (
                            <List.Item key={idx}>
                              <Text variant="bodySm">
                                <Text as="span" fontWeight="semibold">Row {e.row}:</Text>{" "}
                                {e.error}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </div>
                    </div>
                  </Box>
                )}
              </>
            )}
          </div>
        )}
      </Modal.Section>
    </Modal>
  );
};


const RetailersManager = () => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [allCategories, setAllCategories] = useState([]);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState(null);
  const [deleteContext, setDeleteContext] = useState(null);
  const [newRetailer, setNewRetailer] = useState(EMPTY_RETAILER);
  const [newRetailerErrors, setNewRetailerErrors] = useState({});
  const [editRetailerErrors, setEditRetailerErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [countries, setCountries] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, isError = false) => setToast({ message, error: isError });
  const totalPages = Math.max(1, Math.ceil(retailers.length / PAGE_SIZE));
  const paginatedRetailers = useMemo(
    () => retailers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, retailers]
  );

  useEffect(() => {
    setPage(1);
  }, [retailers.length]);

  const countryOptions = [
    { label: "Select country", value: "" },
    ...countries.map((c) => ({
      label: c.name,
      value: c.name,
    })),
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/app/settings");
        const data = await res.json();

        setFilterEnabled(data.data?.filter_enabled ?? false);

      } catch (err) {
        console.error(err);
      }
    };

    fetchSettings();
  }, []);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(paginatedRetailers);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/app/categories");
      const data = await res.json();
      if (data.success) setAllCategories(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCountries = async () => {
    try {
      const res = await fetch("/app/countries");
      const data = await res.json();
      if (data.success) {
        setCountries(data.data);
      }
    } catch (err) {
      console.error("fetchCountries:", err);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchRetailers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/app/retailers");
      const data = await res.json();
      if (data.success) setRetailers(data.data);
    } catch (err) {
      console.error("fetchRetailers:", err);
      showToast(err, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRetailers(); }, [fetchRetailers]);

  const handleCreate = async () => {
    const errors = validateRetailerData(newRetailer);
    if (Object.keys(errors).length > 0) { setNewRetailerErrors(errors); return; }
    try {
      setIsCreating(true);
      const res = await fetch("/app/retailers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRetailer),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await fetchRetailers();
      setIsCreateOpen(false);
      setNewRetailer(EMPTY_RETAILER);
      setNewRetailerErrors({});
      showToast("Retailer created successfully.");
    } catch (err) {
      console.error("createRetailer:", err);
      showToast("Failed to create retailer.", true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setNewRetailer(EMPTY_RETAILER);
    setNewRetailerErrors({});
  };

  const handleSave = async () => {
    const errors = validateRetailerData(editingRetailer);
    if (Object.keys(errors).length > 0) { setEditRetailerErrors(errors); return; }
    try {
      setIsSaving(true);
      const res = await fetch(`/app/retailers/${editingRetailer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRetailer),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await fetchRetailers();
      setEditingRetailer(null);
      setEditRetailerErrors({});
      showToast("Retailer updated successfully.");
    } catch (err) {
      console.error("saveRetailer:", err);
      showToast("Failed to update retailer.", true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseEdit = () => { setEditingRetailer(null); setEditRetailerErrors({}); };

  const handleToggle = async (value) => {
    setFilterEnabled(value);

    try {
      await fetch("/app/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter_enabled: value
        }),
      });

      showToast(`Filter ${value ? "enabled" : "disabled"} successfully`);
    } catch (err) {
      console.error(err);
      showToast("Failed to update setting", true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);

      if (deleteContext.type === "single") {
        const id = deleteContext.items[0].id;
        await fetch(`/app/retailers/${id}`, { method: "DELETE" });
      } else {
        await Promise.all(
          deleteContext.items.map((id) =>
            fetch(`/app/retailers/${id}`, { method: "DELETE" })
          )
        );
      }

      await fetchRetailers();
      showToast("Deleted successfully");
      setDeleteContext(null);
      handleSelectionChange([]);
    } catch (err) {
      console.error("delete error:", err);
      showToast("Failed to delete", true);
    } finally {
      setIsDeleting(false);
    }
  };


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
            {r.google_maps_link.length > 30
              ? r.google_maps_link.slice(0, 30) + "..."
              : r.google_maps_link}
          </a>
        ) : (
          "—"
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>{r.opening_hours || "—"}</IndexTable.Cell>
      <IndexTable.Cell>
        {r.categories ? r.categories : "—"}
      </IndexTable.Cell>
      <IndexTable.Cell>{r.notes || "—"}</IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup variant="segmented">
          <Button size="slim" onClick={() => setEditingRetailer({
            ...r,
            country: r.country ? r.country.trim() : "",
            category_ids: r.categories
              ? r.categories.split(",").map((name) => {
                const cat = allCategories.find(
                  (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
                );
                return cat ? String(cat.id) : null;
              }).filter(Boolean)
              : []
          })}>Edit</Button>
          <Button size="slim" tone="critical" onClick={() =>
            setDeleteContext({ type: "single", items: [r] })
          }>Delete</Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));
  return (
    <Page
      title="Retailers"
      subtitle="Manage retailer locations for your Shopify extension app."
      fullWidth
      primaryAction={{ content: "Add Retailer", onAction: () => setIsCreateOpen(true) }}
      secondaryActions={[
        { content: "Import CSV", onAction: () => setIsImportOpen(true) },
      ]}

      titleMetadata={<Badge tone="info">{`${retailers.length} total`}</Badge>}
    >
      <div style={{ marginBottom: "16px" }}>
        <Card>
          <Box padding="400">
            <div style={{
              display: "flex",
              padding: '10px',
              alignItems: "center",
              justifyContent: "space-between"
            }}>

              {/* LEFT SIDE */}
              <div>
                <Text variant="headingSm">Filter Settings</Text>
                <Text tone="subdued">
                  Show or hide filter options on the storefront
                </Text>
              </div>

              {/* RIGHT SIDE TOGGLE */}
              <button
                onClick={() => handleToggle(!filterEnabled)}
                style={{
                  position: "relative",
                  width: "48px",
                  height: "28px",
                  backgroundColor: filterEnabled ? "#008060" : "#c4cdd5",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: "0"
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: filterEnabled ? "24px" : "4px",
                    width: "20px",
                    height: "20px",
                    background: "#fff",
                    borderRadius: "50%",
                    transition: "all 0.3s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                  }}
                />
              </button>

            </div>
          </Box>
        </Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {selectedResources.length > 0 && (
          <Banner tone="info">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text as="p">
                {selectedResources.length} retailer{selectedResources.length > 1 ? "s" : ""} selected
              </Text>

              <Button tone="critical" onClick={() =>
                setDeleteContext({
                  type: "bulk",
                  items: selectedResources,
                })
              }>
                Delete Selected
              </Button>
            </div>
          </Banner>
        )}

        <Card padding="0">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <Spinner accessibilityLabel="Loading retailers" size="large" />
            </div>
          ) : retailers.length === 0 ? (
            <EmptyState
              heading="No retailers yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Add retailer data manually or import a CSV file to get started.</p>
            </EmptyState>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text as="p" tone="subdued" style={{ marginLeft: "15px" }}>
                    Page {page} of {totalPages}
                  </Text>
                  <Pagination
                    hasPrevious={page > 1}
                    onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                    hasNext={page < totalPages}
                    onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </div>
              </Box>
            </>
          )}
        </Card>
      </div>

      <ImportCSVModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchRetailers}
      />

      <Modal
        open={isCreateOpen}
        onClose={handleCloseCreate}
        title="Add Retailer"
        primaryAction={{ content: "Create", onAction: handleCreate, loading: isCreating }}
        secondaryActions={[{ content: "Cancel", onAction: handleCloseCreate }]}
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
        onClose={handleCloseEdit}
        title={editingRetailer ? `Edit: ${editingRetailer.name}` : "Edit Retailer"}
        primaryAction={{ content: "Save", onAction: handleSave, loading: isSaving }}
        secondaryActions={[{ content: "Cancel", onAction: handleCloseEdit }]}
        large
      >
        <Modal.Section>
          {editingRetailer && (
            <div gap="400">
              <TextField label="Retailer ID" value={String(editingRetailer.id)} disabled autoComplete="off" />
              <RetailerForm
                retailer={editingRetailer}
                onChange={(field, value) => setEditingRetailer((prev) => ({ ...prev, [field]: value }))}
                errors={editRetailerErrors}
                allCategories={allCategories}
                countryOptions={countryOptions}
              />
            </div>
          )}
        </Modal.Section>
      </Modal>

      <Modal
        open={Boolean(deleteContext)}
        onClose={() => setDeleteContext(null)}
        title="Delete Retailer"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleConfirmDelete,
          loading: isDeleting,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setDeleteContext(null) },
        ]}
      >
        <Modal.Section>
          {deleteContext?.type === "single" ? (
            <Text as="p">
              Are you sure you want to delete{" "}
              <Text as="span" fontWeight="semibold">
                {deleteContext.items[0]?.name} ? This activity deactive the Retailer.
              </Text>
            </Text>
          ) : (
            <Text as="p">
              Are you sure you want to delete{" "}
              <Text as="span" fontWeight="semibold">
                {deleteContext?.items.length} retailers ? This activity deactive the Retailers.
              </Text>
            </Text>
          )}
        </Modal.Section>
      </Modal>

      {toast && (
        <Toast content={toast.message} error={toast.error} onDismiss={() => setToast(null)} />
      )}
    </Page>
  );
};

export default RetailersManager;