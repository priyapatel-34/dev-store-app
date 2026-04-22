import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const initialCategories = [
    {
        id: "category-001",
        name: "Outdoor Apparel",
        store_id: "1",
        status: "Active",
    },
    {
        id: "category-002",
        name: "Travel Bags",
        store_id: "1",
        status: "Active",
    },
    {
        id: "category-003",
        name: "Legacy Footwear",
        store_id: "2",
        status: "Inactive",
    },
    {
        id: "category-004",
        name: "Hydration",
        store_id: "2",
        status: "Active",
    },
    {
        id: "category-005",
        name: "Retail Displays",
        store_id: "1",
        status: "Inactive",
    },
];

const fields = ["id", "name", "store_id", "status"];

const defaultCategory = (nextNumber) => ({
    id: `category-${String(nextNumber).padStart(3, "0")}`,
    name: "",
    store: '',
    status: "Active",
});

const fieldLabel = (field) =>
    field
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const statusTone = (status) => (status === "Active" ? "success" : "critical");

const Categories = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState(initialCategories);
    const [page, setPage] = useState(1);
    const [editingCategory, setEditingCategory] = useState(null);
    const [deletingCategory, setDeletingCategory] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const pageSize = 4;

    const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
    const paginatedCategories = useMemo(
        () => categories.slice((page - 1) * pageSize, page * pageSize),
        [categories, page],
    );

    const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
        useIndexResourceState(paginatedCategories);

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

    const saveCategory = () => {
        if (!editingCategory) return;

        setCategories((current) =>
            isCreating
                ? [editingCategory, ...current]
                : current.map((category) => (category.id === editingCategory.id ? editingCategory : category)),
        );
        closeCategoryModal();
        setPage(1);
    };

    const deleteCategory = () => {
        if (!deletingCategory) return;

        setCategories((current) => current.filter((category) => category.id !== deletingCategory.id));
        setDeletingCategory(null);
        clearSelection();
        setPage((currentPage) => Math.min(currentPage, Math.max(1, Math.ceil((categories.length - 1) / pageSize))));
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
                                <TextField label="Store ID" value={editingCategory.id} onChange={(value) => updateEditingCategory("id", value)} autoComplete="off" disabled={!isCreating} />
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
