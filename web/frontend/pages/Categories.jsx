import { useMemo, useState, useEffect, useCallback } from "react";
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

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editingCategory, setEditingCategory] = useState(null);
    const [deleteContext, setDeleteContext] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [errors, setErrors] = useState({});
    const pageSize = 10;

    const validateCategory = () => {
        const newErrors = {};

        if (!editingCategory?.name || editingCategory.name.trim() === "") {
            newErrors.name = "Category name is required";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);

            const res = await fetch("/app/categories");

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || "Failed to fetch categories");
            }

            setCategories(data.data || []);
        } catch (err) {
            console.error("Fetch Categories Error:", err);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
    const paginatedCategories = useMemo(
        () => categories.slice((page - 1) * pageSize, page * pageSize),
        [categories, page],
    );

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(paginatedCategories);

    const createCategory = async (categoryData) => {
        try {
            const res = await fetch("/app/categories", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: categoryData.name,
                    is_active: categoryData.status === "Active",
                }),
            });

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.message || "Failed to create category");
            }

            return data;

        } catch (err) {
            console.error("Create Category Error:", err);
            throw err;
        }
    };

    const updateCategory = async (categoryData) => {
        try {
            const res = await fetch(`/app/categories/${categoryData.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: categoryData.name,
                    is_active: categoryData.status === "Active",
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to update category");
            }

            return data;

        } catch (err) {
            console.error("Update Category Error:", err);
            throw err;
        }
    };

    const saveCategory = async () => {
        if (!editingCategory) return;

        // ✅ VALIDATION CHECK
        if (!validateCategory()) return;

        try {
            if (isCreating) {
                await createCategory(editingCategory);
            } else {
                await updateCategory(editingCategory);
            }

            await fetchCategories();
            closeCategoryModal();
            setErrors({}); // clear errors after success

        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            setIsDeleting(true);

            if (deleteContext.type === "single") {
                const id = Number(deleteContext.items[0].id);
                await fetch(`/app/categories/${id}`, { method: "DELETE" });
            } else {
                await Promise.all(
                    deleteContext.items.map((id) =>
                        fetch(`/app/categories/${Number(id)}`, { method: "DELETE" })
                    )
                );
            }

            await fetchCategories();
            setDeleteContext(null);
            handleSelectionChange([]);

        } catch (err) {
            console.error("Delete Category Error:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const openCreateCategory = () => {
        setIsCreating(true);
        setEditingCategory(defaultCategory(categories.length + 1));
        setErrors({});
    };

    const closeCategoryModal = () => {
        setEditingCategory(null);
        setIsCreating(false);
        setErrors({});
    };

    const updateEditingCategory = (field, value) => {
        setEditingCategory((current) => ({ ...current, [field]: value }));
    };

    const rowMarkup = paginatedCategories.map((category, index) => {
        const status = category.is_active ? "Active" : "Inactive";

        return (
            <IndexTable.Row
                id={String(category.id)}
                key={category.id}
                selected={selectedResources.includes(category.id)}
                position={index}
            >
                {/* Category ID */}
                <IndexTable.Cell>
                    {category.id}
                </IndexTable.Cell>

                {/* Name */}
                <IndexTable.Cell>
                    {category.name || "—"}
                </IndexTable.Cell>

                {/* Status */}
                <IndexTable.Cell>
                    <Badge tone={status === "Active" ? "success" : "critical"}>
                        {status}
                    </Badge>
                </IndexTable.Cell>

                {/* Actions */}
                <IndexTable.Cell>
                    <ButtonGroup>
                        <Button
                            size="slim"
                            onClick={() => {
                                setEditingCategory({
                                    ...category,
                                    status
                                });
                                setErrors({}); // ✅ clear errors
                            }}
                        >
                            Edit
                        </Button>

                        <Button
                            size="slim"
                            tone="critical"
                            onClick={() =>
                                setDeleteContext({ type: "single", items: [category] })
                            }
                        >
                            Delete
                        </Button>
                    </ButtonGroup>
                </IndexTable.Cell>
            </IndexTable.Row>
        );
    });

    return (
        <Page
            title="Categories"
            subtitle="Manage category records for your Shopify extension app."
            titleMetadata={<Badge tone="info">{`${categories.length} total`}</Badge>}
            primaryAction={{ content: "Create category", onAction: openCreateCategory }}
            fullWidth
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {selectedResources.length > 0 && (
                    <Banner tone="info">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Text as="p">
                                {selectedResources.length} categor{selectedResources.length > 1 ? "ies" : "y"} selected
                            </Text>

                            <Button
                                tone="critical"
                                onClick={() =>
                                    setDeleteContext({
                                        type: "bulk",
                                        items: selectedResources,
                                    })
                                }
                            >
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
                    ) : categories.length === 0 ? (
                        <EmptyState heading="No categories available" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                            <p>Create a category to start organizing retailer data.</p>
                        </EmptyState>
                    ) : (
                        <>
                            <Box overflowX="auto">
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
                        </>
                    )}
                </Card>
            </div>

            <Modal
                open={Boolean(editingCategory)}
                onClose={closeCategoryModal}
                title={
                    isCreating
                        ? "Create Category"
                        : editingCategory
                            ? `Edit ${editingCategory.name}`
                            : "Edit Category"
                }
                primaryAction={{
                    content: isCreating ? "Create" : "Save",
                    onAction: saveCategory,
                }}
                secondaryActions={[
                    { content: "Cancel", onAction: closeCategoryModal },
                ]}
            >
                <Modal.Section>
                    {editingCategory && (
                        <FormLayout>

                            {/* Header Note */}
                            <Text as="p" tone="subdued">
                                {isCreating
                                    ? "Add a new category for organizing your retailers."
                                    : "Update category details below."}
                            </Text>

                            {/* Name Field */}
                            <TextField
                                label="Category Name"
                                value={editingCategory.name}
                                onChange={(value) => {
                                    updateEditingCategory("name", value);

                                    // ✅ clear error while typing
                                    if (errors.name) {
                                        setErrors((prev) => ({ ...prev, name: "" }));
                                    }
                                }}
                                autoComplete="off"
                                placeholder="e.g. Headphones"
                                error={errors.name}
                            />

                            {/* Status Dropdown */}
                            <Select
                                label="Status"
                                options={[
                                    { label: "Active", value: "Active" },
                                    { label: "Inactive", value: "Inactive" },
                                ]}
                                value={editingCategory.status}
                                onChange={(value) =>
                                    updateEditingCategory("status", value)
                                }
                            />

                            <div style={{ marginTop: "8px" }} />

                        </FormLayout>
                    )}
                </Modal.Section>
            </Modal>

            <Modal
                open={Boolean(deleteContext)}
                onClose={() => setDeleteContext(null)}
                title="Delete Category"
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
                                {deleteContext.items[0]?.name} ?
                            </Text>
                        </Text>
                    ) : (
                        <Text as="p">
                            Are you sure you want to delete{" "}
                            <Text as="span" fontWeight="semibold">
                                {deleteContext?.items.length} categories ?
                            </Text>
                        </Text>
                    )}
                </Modal.Section>
            </Modal>
        </Page>
    );
};

export default Categories;
