import { useMemo, useState, useEffect } from "react";
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
    Spinner
} from "@shopify/polaris";

const fields = ["category_id", "name", "status"];

const defaultCategory = (nextNumber) => ({
    id: `category-${String(nextNumber).padStart(3, "0")}`,
    name: "",
    status: "Active",
});

const fieldLabel = (field) =>
    field
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const statusTone = (status) => (status === "Active" ? "success" : "critical");

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editingCategory, setEditingCategory] = useState(null);
    const [deletingCategory, setDeletingCategory] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const pageSize = 6;

    const fetchCategories = async () => {
        try {
            setLoading(true);

            const res = await fetch("/api/categories");
            const data = await res.json();

            if (data.success) {
                setCategories(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
    const paginatedCategories = useMemo(
        () => categories.slice((page - 1) * pageSize, page * pageSize),
        [categories, page],
    );

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(paginatedCategories);

    const createCategory = async () => {
            try {
              const res = await fetch("/api/retailers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRetailer),
              });
        
              const data = await res.json();
        
              if (data.success) {
                fetchRetailers();
                setIsCreateOpen(false);
                setNewRetailer(emptyRetailer);
              }
            } catch (err) {
              console.error(err);
            }
          };

    const saveCategory = async () => {
        if (!editingCategory) return;

        try {
            if (isCreating) {
                // CREATE
                await fetch("/api/categories", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: editingCategory.name,
                    }),
                });
            } else {
                // UPDATE
                await fetch(`/api/categories/${editingCategory.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: editingCategory.name,
                        is_active: editingCategory.status === "Active",
                    }),
                });
            }

            await fetchCategories();
            closeCategoryModal();

        } catch (err) {
            console.error(err);
        }
    };

    const deleteCategory = async () => {
        if (!deletingCategory) return;

        try {
            await fetch(`/api/categories/${deletingCategory.id}`, {
                method: "DELETE",
            });

            await fetchCategories();
            setDeletingCategory(null);

        } catch (err) {
            console.error(err);
        }
    };

    const openCreateCategory = () => {
        setIsCreating(true);
        setEditingCategory(defaultCategory(categories.length + 1));
    };

    const closeCategoryModal = () => {
        setEditingCategory(null);
        setIsCreating(false);
    };

    const updateEditingCategory = (field, value) => {
        setEditingCategory((current) => ({ ...current, [field]: value }));
    };

    const rowMarkup = paginatedCategories.map((category, index) => (
        <IndexTable.Row id={category.id} key={category.id} selected={selectedResources.includes(category.id)} position={index}>
            {fields.map((field) => (
                <IndexTable.Cell key={field}>
                    {field === "status" ? <Badge tone={statusTone(category.status)}>{category.status}</Badge> : category[field] || "—"}
                </IndexTable.Cell>
            ))}
            <IndexTable.Cell>
                <ButtonGroup variant="segmented">
                    <Button size="slim" onClick={() => setEditingCategory(category)}>
                        Edit
                    </Button>
                    <Button size="slim" tone="critical" onClick={() => setDeletingCategory(category)}>
                        Delete
                    </Button>
                </ButtonGroup>
            </IndexTable.Cell>
        </IndexTable.Row>
    ));

    return (
        <Page
            title="Categories"
            subtitle="Manage category records for your Shopify extension app."
            titleMetadata={<Badge tone="info">{`${categories.length} total`}</Badge>}
            primaryAction={{ content: "Create category", onAction: openCreateCategory }}
            fullWidth
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <Banner tone="info">
                    <Text as="p">
                        {selectedResources.length} categor{selectedResources.length === 1 ? "y" : "ies"} selected on this page.
                    </Text>
                </Banner>

                <Card padding="0">
                    {categories.length === 0 ? (
                        <EmptyState heading="No categories available" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                            <p>Create a category to start organizing retailer data.</p>
                        </EmptyState>
                    ) : (
                        <Box overflowX="scroll">
                            <IndexTable
                                resourceName={{ singular: "category", plural: "categories" }}
                                itemCount={paginatedCategories.length}
                                selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                                onSelectionChange={handleSelectionChange}
                                headings={[...fields.map((field) => ({ title: fieldLabel(field) })), { title: "Actions" }]}
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
                open={Boolean(editingCategory)}
                onClose={closeCategoryModal}
                title={isCreating ? "Create category" : editingCategory ? `Edit ${editingCategory.name}` : "Edit category"}
                primaryAction={{ content: isCreating ? "Create category" : "Save category", onAction: saveCategory }}
                secondaryActions={[{ content: "Cancel", onAction: closeCategoryModal }]}
            >
                <Modal.Section>
                    {editingCategory && (
                        <FormLayout>
                            <TextField label="Category ID" value={editingCategory.id} onChange={(value) => updateEditingCategory("id", value)} autoComplete="off" disabled={!isCreating} />
                            <FormLayout.Group condensed>
                                <TextField label="Name" value={editingCategory.name} onChange={(value) => updateEditingCategory("name", value)} autoComplete="off" />
                                <Select label="Status" options={["Active", "Inactive"]} value={editingCategory.status} onChange={(value) => updateEditingCategory("status", value)} />
                            </FormLayout.Group>
                        </FormLayout>
                    )}
                </Modal.Section>
            </Modal>

            <Modal
                open={Boolean(deletingCategory)}
                onClose={() => setDeletingCategory(null)}
                title="Delete category"
                primaryAction={{ content: "Delete category", destructive: true, onAction: deleteCategory }}
                secondaryActions={[{ content: "Cancel", onAction: () => setDeletingCategory(null) }]}
            >
                <Modal.Section>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Text as="p">
                            Are you sure you want to delete <Text as="span" fontWeight="semibold">{deletingCategory?.name}</Text>? This removes the category from the current table.
                        </Text>
                        <Text as="p" tone="subdued">
                            Category ID: {deletingCategory?.id}
                        </Text>
                    </div>
                </Modal.Section>
            </Modal>
        </Page>
    );
};

export default Categories;
