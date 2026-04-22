import { useMemo, useState } from "react";
import {
  Badge,
  Banner,
  Box,
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  FormLayout,
  IndexTable,
  Modal,
  Page,
  Pagination,
  Select,
  Text,
  TextField,
  useIndexResourceState,
} from "@shopify/polaris";

const initialRetailers = [
  {
    id: "retailer-001",
    store_id: "STR-1001",
    country_id: "US",
    name: "North Loop Outfitters",
    retailer_type: "Flagship",
    status: "Active",
    address_line1: "212 Market Street",
    address_line2: "Suite 4B",
    city: "Minneapolis",
    state: "MN",
    postal_code: "55401",
    latitude: "44.9841",
    longitude: "-93.2719",
    phone: "+1 612 555 0148",
    email: "northloop@example.com",
    website_url: "https://northloop.example.com",
    google_maps_link: "https://maps.google.com/?q=North+Loop+Outfitters",
    opening_hours: "Mon-Fri 9:00-18:00, Sat 10:00-16:00",
    notes: "Top-performing metro retailer with seasonal display space.",
  },
  {
    id: "retailer-002",
    store_id: "STR-1002",
    country_id: "CA",
    name: "Harbour Goods Co.",
    retailer_type: "Distributor",
    status: "Active",
    address_line1: "80 Water Street",
    address_line2: "",
    city: "Vancouver",
    state: "BC",
    postal_code: "V6B 1A4",
    latitude: "49.2847",
    longitude: "-123.1087",
    phone: "+1 604 555 0180",
    email: "ops@harbourgoods.example",
    website_url: "https://harbourgoods.example",
    google_maps_link: "https://maps.google.com/?q=Harbour+Goods+Co",
    opening_hours: "Daily 10:00-19:00",
    notes: "Requires bilingual shelf cards for campaigns.",
  },
  {
    id: "retailer-003",
    store_id: "STR-1003",
    country_id: "GB",
    name: "Shoreditch Supply",
    retailer_type: "Boutique",
    status: "Active",
    address_line1: "14 Redchurch Street",
    address_line2: "Unit 2",
    city: "London",
    state: "England",
    postal_code: "E2 7DD",
    latitude: "51.5246",
    longitude: "-0.0752",
    phone: "+44 20 7946 0123",
    email: "buyer@shoreditchsupply.example",
    website_url: "https://shoreditchsupply.example",
    google_maps_link: "https://maps.google.com/?q=Shoreditch+Supply",
    opening_hours: "Tue-Sun 11:00-18:00",
    notes: "Awaiting contract approval.",
  },
  {
    id: "retailer-004",
    store_id: "STR-1004",
    country_id: "AU",
    name: "Surry Hills Market",
    retailer_type: "Marketplace",
    status: "Inactive",
    address_line1: "51 Crown Street",
    address_line2: "",
    city: "Sydney",
    state: "NSW",
    postal_code: "2010",
    latitude: "-33.8846",
    longitude: "151.2153",
    phone: "+61 2 5550 0185",
    email: "hello@surryhills.example",
    website_url: "https://surryhills.example",
    google_maps_link: "https://maps.google.com/?q=Surry+Hills+Market",
    opening_hours: "Temporarily closed",
    notes: "Pause outreach until renovation completes.",
  },
  {
    id: "retailer-005",
    store_id: "STR-1005",
    country_id: "DE",
    name: "Mitte Concept Store",
    retailer_type: "Concept",
    status: "Active",
    address_line1: "Torstraße 68",
    address_line2: "",
    city: "Berlin",
    state: "Berlin",
    postal_code: "10119",
    latitude: "52.5306",
    longitude: "13.4055",
    phone: "+49 30 5557 0221",
    email: "team@mitteconcept.example",
    website_url: "https://mitteconcept.example",
    google_maps_link: "https://maps.google.com/?q=Mitte+Concept+Store",
    opening_hours: "Mon-Sat 10:00-20:00",
    notes: "Premium placement available in front window.",
  },
  {
    id: "retailer-006",
    store_id: "STR-1006",
    country_id: "FR",
    name: "Canal Saint-Martin Retail",
    retailer_type: "Boutique",
    status: "Active",
    address_line1: "36 Quai de Jemmapes",
    address_line2: "",
    city: "Paris",
    state: "Île-de-France",
    postal_code: "75010",
    latitude: "48.8718",
    longitude: "2.3652",
    phone: "+33 1 55 50 01 86",
    email: "retail@canalstmartin.example",
    website_url: "https://canalstmartin.example",
    google_maps_link: "https://maps.google.com/?q=Canal+Saint-Martin+Retail",
    opening_hours: "Wed-Sun 12:00-19:00",
    notes: "Prefers limited-edition inventory drops.",
  },
];

const fields = [
  "store_id",
  "country_id",
  "name",
  "retailer_type",
  "status",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "postal_code",
  "latitude",
  "longitude",
  "phone",
  "email",
  "website_url",
  "google_maps_link",
  "opening_hours",
  "notes",
];

const emptyRetailer = {
  store_id: "",
  country_id: "",
  name: "",
  retailer_type: "",
  status: "Active",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  website_url: "",
  google_maps_link: "",
  opening_hours: "",
  notes: "",
};

const fieldLabel = (field) =>
  field
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const statusTone = (status) => {
  if (status === "Active") return "Active";
  if (status === "Deactive") return "Deactive";
  return "critical";
};

const handleCSVUpload = async () => {
  if (!csvFile) return;

  const formData = new FormData();
  formData.append("file", csvFile);

  try {
    setIsUploading(true);

    const response = await fetch("YOUR_API_URL/import-retailers", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ Imported ${data.inserted} retailers`);
      setIsImportOpen(false);

      // OPTIONAL: reload data from API
      // fetchRetailers();
    } else {
      alert("Import failed");
    }
  } catch (err) {
    console.error(err);
    alert("Error uploading file");
  } finally {
    setIsUploading(false);
  }
};

const RetailersManager = () => {
  const [retailers, setRetailers] = useState(initialRetailers);
  const [page, setPage] = useState(1);
  const [editingRetailer, setEditingRetailer] = useState(null);
  const [deletingRetailer, setDeletingRetailer] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRetailer, setNewRetailer] = useState(emptyRetailer);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const pageSize = 4;

  const totalPages = Math.max(1, Math.ceil(retailers.length / pageSize));
  const paginatedRetailers = useMemo(
    () => retailers.slice((page - 1) * pageSize, page * pageSize),
    [page, retailers],
  );

  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(paginatedRetailers);

  const saveRetailer = () => {
    if (!editingRetailer) return;
    setRetailers((current) =>
      current.map((retailer) => (retailer.id === editingRetailer.id ? editingRetailer : retailer)),
    );
    setEditingRetailer(null);
  };

  const deleteRetailer = () => {
    if (!deletingRetailer) return;
    setRetailers((current) => current.filter((retailer) => retailer.id !== deletingRetailer.id));
    setDeletingRetailer(null);
    clearSelection();
    setPage((currentPage) => Math.min(currentPage, Math.max(1, Math.ceil((retailers.length - 1) / pageSize))));
  };

  const createRetailer = () => {
    const newItem = {
      ...newRetailer,
      id: `retailer-${Date.now()}`,
    };

    setRetailers((prev) => [newItem, ...prev]);
    setIsCreateOpen(false);
    setNewRetailer(emptyRetailer);
  };

  const rowMarkup = paginatedRetailers.map((retailer, index) => (
    <IndexTable.Row id={retailer.id} key={retailer.id} selected={selectedResources.includes(retailer.id)} position={index}>
      <IndexTable.Cell>
        <Text fontWeight="semibold">
          {retailer.store_id}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{retailer.country_id}</IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {retailer.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{retailer.retailer_type}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={statusTone(retailer.status)}>{retailer.status}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>{retailer.address_line1}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.address_line2 || "—"}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.city}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.state}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.postal_code}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.latitude}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.longitude}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.phone}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.email}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.website_url}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.google_maps_link}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.opening_hours}</IndexTable.Cell>
      <IndexTable.Cell>{retailer.notes}</IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup variant="segmented">
          <Button size="slim" onClick={() => setEditingRetailer(retailer)}>
            Edit
          </Button>
          <Button size="slim" tone="critical" onClick={() => setDeletingRetailer(retailer)}>
            Delete
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Retailers"
      subtitle="Manage retailer locations for your Shopify extension app."
      fullWidth
      primaryAction={{
        content: "Add Retailer",
        onAction: () => setIsCreateOpen(true),
      }}
      secondaryActions={[
        {
          content: "Import CSV",
          onAction: () => setIsImportOpen(true),
        },
      ]}
      titleMetadata={<Badge tone="info">{`${retailers.length} total`}</Badge>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Banner tone="info">
          <Text as="p">{selectedResources.length} retailer{selectedResources.length === 1 ? "" : "s"} selected on this page.</Text>
        </Banner>

        <Card padding="0">
          {retailers.length === 0 ? (
            <EmptyState heading="No retailers available" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
              <p>Add retailer data to start managing store locations.</p>
            </EmptyState>
          ) : (
            <Box overflowX="scroll">
              <IndexTable
                resourceName={{ singular: "retailer", plural: "retailers" }}
                itemCount={paginatedRetailers.length}
                selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: "Store ID" },
                  ...fields.slice(1).map((field) => ({ title: fieldLabel(field) })),
                  { title: "Actions" },
                ]}
              >
                {rowMarkup}
              </IndexTable>
            </Box>
          )}

          <Box padding="400">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginLeft: "25px" }}>
              <Text as="p" tone="subdued">
                Page {page} of {totalPages}
              </Text>
              <Pagination
                hasPrevious={page > 1}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                hasNext={page < totalPages}
                onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
              />
            </div>
          </Box>
        </Card>
      </div>

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Retailer"
        primaryAction={{ content: "Create", onAction: createRetailer }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setIsCreateOpen(false) },
        ]}
      >
        <Modal.Section>
          <FormLayout>

            {/* 🔹 BASIC INFO */}
            <Text variant="headingSm">Basic Information</Text>

            <FormLayout.Group condensed>
              <TextField
                label="Store ID"
                value={newRetailer.store_id}
                onChange={(v) => setNewRetailer({ ...newRetailer, store_id: v })}
                autoComplete="off"
              />

              <TextField
                label="Country"
                value={newRetailer.country_id}
                onChange={(v) => setNewRetailer({ ...newRetailer, country_id: v })}
                autoComplete="off"
              />
            </FormLayout.Group>

            <FormLayout.Group condensed>
              <TextField
                label="Retailer Name"
                value={newRetailer.name}
                onChange={(v) => setNewRetailer({ ...newRetailer, name: v })}
                autoComplete="off"
              />

              <TextField
                label="Type"
                value={newRetailer.retailer_type}
                onChange={(v) =>
                  setNewRetailer({ ...newRetailer, retailer_type: v })
                }
                autoComplete="off"
              />
            </FormLayout.Group>

            <Select
              label="Status"
              options={[
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
                { label: "Pending", value: "Pending" },
              ]}
              value={newRetailer.status}
              onChange={(value) =>
                setNewRetailer({ ...newRetailer, status: value })
              }
            />

            {/* 🔹 LOCATION */}
            <Text variant="headingSm">Location</Text>

            <TextField
              label="Address"
              value={newRetailer.address_line1}
              onChange={(v) =>
                setNewRetailer({ ...newRetailer, address_line1: v })
              }
              autoComplete="street-address"
            />

            <FormLayout.Group condensed>
              <TextField
                label="City"
                value={newRetailer.city}
                onChange={(v) => setNewRetailer({ ...newRetailer, city: v })}
                autoComplete="address-level2"
              />

              <TextField
                label="State"
                value={newRetailer.state}
                onChange={(v) => setNewRetailer({ ...newRetailer, state: v })}
                autoComplete="address-level1"
              />
            </FormLayout.Group>

            <TextField
              label="Postal Code"
              value={newRetailer.postal_code}
              onChange={(v) =>
                setNewRetailer({ ...newRetailer, postal_code: v })
              }
              autoComplete="postal-code"
            />

            {/* 🔹 CONTACT */}
            <Text variant="headingSm">Contact Details</Text>

            <FormLayout.Group condensed>
              <TextField
                label="Phone"
                value={newRetailer.phone}
                onChange={(v) =>
                  setNewRetailer({ ...newRetailer, phone: v })
                }
                autoComplete="tel"
              />

              <TextField
                label="Email"
                type="email"
                value={newRetailer.email}
                onChange={(v) =>
                  setNewRetailer({ ...newRetailer, email: v })
                }
                autoComplete="email"
              />
            </FormLayout.Group>

          </FormLayout>
        </Modal.Section>
      </Modal>

      <Modal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Retailers (CSV)"
        primaryAction={{
          content: isUploading ? "Uploading..." : "Upload",
          onAction: handleCSVUpload,
          disabled: !csvFile || isUploading,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setIsImportOpen(false) },
        ]}
      >
        <Modal.Section>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            <Banner tone="info">
              Upload CSV file with retailer data.
            </Banner>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
            />

            {csvFile && (
              <Text tone="subdued">
                Selected: {csvFile.name}
              </Text>
            )}

          </div>
        </Modal.Section>
      </Modal>

      <Modal
        open={Boolean(editingRetailer)}
        onClose={() => setEditingRetailer(null)}
        title={editingRetailer ? `Edit ${editingRetailer.name}` : "Edit retailer"}
        primaryAction={{ content: "Save retailer", onAction: saveRetailer }}
        secondaryActions={[{ content: "Cancel", onAction: () => setEditingRetailer(null) }]}
      >
        <Modal.Section>
          {editingRetailer && (
            <FormLayout>
              <FormLayout.Group condensed>
                <TextField label="Store ID" value={editingRetailer.store_id} onChange={(value) => setEditingRetailer({ ...editingRetailer, store_id: value })} autoComplete="off" />
                <TextField label="Country ID" value={editingRetailer.country_id} onChange={(value) => setEditingRetailer({ ...editingRetailer, country_id: value })} autoComplete="off" />
              </FormLayout.Group>
              <FormLayout.Group condensed>
                <TextField label="Name" value={editingRetailer.name} onChange={(value) => setEditingRetailer({ ...editingRetailer, name: value })} autoComplete="off" />
                <TextField label="Retailer type" value={editingRetailer.retailer_type} onChange={(value) => setEditingRetailer({ ...editingRetailer, retailer_type: value })} autoComplete="off" />
                <Select label="Status" options={["Active", "Inactive", "Pending"]} value={editingRetailer.status} onChange={(value) => setEditingRetailer({ ...editingRetailer, status: value })} />
              </FormLayout.Group>
              <TextField label="Address line 1" value={editingRetailer.address_line1} onChange={(value) => setEditingRetailer({ ...editingRetailer, address_line1: value })} autoComplete="street-address" />
              <TextField label="Address line 2" value={editingRetailer.address_line2} onChange={(value) => setEditingRetailer({ ...editingRetailer, address_line2: value })} autoComplete="address-line2" />
              <FormLayout.Group condensed>
                <TextField label="City" value={editingRetailer.city} onChange={(value) => setEditingRetailer({ ...editingRetailer, city: value })} autoComplete="address-level2" />
                <TextField label="State" value={editingRetailer.state} onChange={(value) => setEditingRetailer({ ...editingRetailer, state: value })} autoComplete="address-level1" />
                <TextField label="Postal code" value={editingRetailer.postal_code} onChange={(value) => setEditingRetailer({ ...editingRetailer, postal_code: value })} autoComplete="postal-code" />
              </FormLayout.Group>
              <FormLayout.Group condensed>
                <TextField label="Latitude" value={editingRetailer.latitude} onChange={(value) => setEditingRetailer({ ...editingRetailer, latitude: value })} autoComplete="off" />
                <TextField label="Longitude" value={editingRetailer.longitude} onChange={(value) => setEditingRetailer({ ...editingRetailer, longitude: value })} autoComplete="off" />
              </FormLayout.Group>
              <FormLayout.Group condensed>
                <TextField label="Phone" value={editingRetailer.phone} onChange={(value) => setEditingRetailer({ ...editingRetailer, phone: value })} autoComplete="tel" />
                <TextField label="Email" type="email" value={editingRetailer.email} onChange={(value) => setEditingRetailer({ ...editingRetailer, email: value })} autoComplete="email" />
              </FormLayout.Group>
              <TextField label="Website URL" value={editingRetailer.website_url} onChange={(value) => setEditingRetailer({ ...editingRetailer, website_url: value })} autoComplete="url" />
              <TextField label="Google Maps link" value={editingRetailer.google_maps_link} onChange={(value) => setEditingRetailer({ ...editingRetailer, google_maps_link: value })} autoComplete="url" />
              <TextField label="Opening hours" value={editingRetailer.opening_hours} onChange={(value) => setEditingRetailer({ ...editingRetailer, opening_hours: value })} autoComplete="off" />
              <TextField label="Notes" value={editingRetailer.notes} onChange={(value) => setEditingRetailer({ ...editingRetailer, notes: value })} multiline={4} autoComplete="off" />
            </FormLayout>
          )}
        </Modal.Section>
      </Modal>

      <Modal
        open={Boolean(deletingRetailer)}
        onClose={() => setDeletingRetailer(null)}
        title="Delete retailer"
        primaryAction={{ content: "Delete retailer", destructive: true, onAction: deleteRetailer }}
        secondaryActions={[{ content: "Cancel", onAction: () => setDeletingRetailer(null) }]}
      >
        <Modal.Section>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Text as="p">
              Are you sure you want to delete <Text as="span" fontWeight="semibold">{deletingRetailer?.name}</Text>? This removes the retailer from the current table.
            </Text>
            <Text as="p" tone="subdued">
              Store ID: {deletingRetailer?.store_id}
            </Text>
          </div>
        </Modal.Section>
      </Modal>
    </Page>
  );
};

const Index = () => {
  return (
    <RetailersManager />
  );
};

export default Index;
