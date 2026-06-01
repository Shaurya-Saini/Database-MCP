import React, { useState } from 'react';
import {
    Button,
    Input,
    Select,
    Textarea,
    Card,
    CardHeader,
    CardBody,
    Modal,
    ModalFooter,
    Dropdown,
    LoadingSpinner,
    ErrorMessage,
    SuccessMessage,
    Table,
    TablePagination,
    CodeBlock,
    InlineCode,
} from './index';

/**
 * Component Demo - Showcases all reusable UI components
 * This component is for testing and demonstration purposes
 */
export const ComponentDemo: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const selectOptions = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
    ];

    const dropdownItems = [
        { label: 'Edit', value: 'edit', icon: '✏️' },
        { label: 'Delete', value: 'delete', icon: '🗑️', danger: true },
        { label: 'Disabled', value: 'disabled', disabled: true },
    ];

    const tableColumns = [
        { key: 'id', label: 'ID', width: '80px' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'status', label: 'Status', align: 'center' as const },
    ];

    const tableData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
    ];

    const sampleCode = `SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.status = 'completed'
ORDER BY orders.total DESC
LIMIT 10;`;

    return (
        <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                UI Components Demo
            </h1>

            {/* Buttons */}
            <Card>
                <CardHeader title="Buttons" subtitle="Various button styles and states" />
                <CardBody>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="primary">Primary</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="danger">Danger</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="outline">Outline</Button>
                        <Button size="sm">Small</Button>
                        <Button size="lg">Large</Button>
                        <Button isLoading>Loading</Button>
                        <Button disabled>Disabled</Button>
                    </div>
                </CardBody>
            </Card>

            {/* Form Inputs */}
            <Card>
                <CardHeader title="Form Inputs" subtitle="Input fields with various configurations" />
                <CardBody>
                    <div className="space-y-4 max-w-md">
                        <Input label="Email" type="email" placeholder="Enter your email" />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Enter password"
                            helperText="Must be at least 8 characters"
                        />
                        <Input
                            label="Error Example"
                            error="This field is required"
                            placeholder="Invalid input"
                        />
                        <Select
                            label="Select Option"
                            options={selectOptions}
                            placeholder="Choose an option"
                        />
                        <Textarea
                            label="Description"
                            placeholder="Enter description"
                            rows={4}
                            helperText="Maximum 500 characters"
                        />
                    </div>
                </CardBody>
            </Card>

            {/* Modal */}
            <Card>
                <CardHeader title="Modal" subtitle="Dialog component" />
                <CardBody>
                    <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        title="Example Modal"
                        size="md"
                    >
                        <p className="text-gray-700 dark:text-gray-300">
                            This is a modal dialog. You can put any content here.
                        </p>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
                        </ModalFooter>
                    </Modal>
                </CardBody>
            </Card>

            {/* Dropdown */}
            <Card>
                <CardHeader title="Dropdown" subtitle="Dropdown menu component" />
                <CardBody>
                    <Dropdown
                        trigger={<Button variant="outline">Actions</Button>}
                        items={dropdownItems}
                        onSelect={(value) => console.log('Selected:', value)}
                    />
                </CardBody>
            </Card>

            {/* Loading Spinner */}
            <Card>
                <CardHeader title="Loading Spinner" subtitle="Loading indicators" />
                <CardBody>
                    <div className="flex gap-8 items-center">
                        <LoadingSpinner size="sm" />
                        <LoadingSpinner size="md" />
                        <LoadingSpinner size="lg" />
                        <LoadingSpinner size="md" text="Loading..." />
                    </div>
                </CardBody>
            </Card>

            {/* Messages */}
            <Card>
                <CardHeader title="Messages" subtitle="Error and success messages" />
                <CardBody>
                    <div className="space-y-4">
                        <ErrorMessage
                            message="An error occurred while processing your request"
                            details={['Check your internet connection', 'Verify your credentials']}
                        />
                        <SuccessMessage
                            message="Operation completed successfully"
                            details={['Database connection established', 'Query executed in 0.5s']}
                        />
                    </div>
                </CardBody>
            </Card>

            {/* Table */}
            <Card padding="none">
                <div className="p-4">
                    <CardHeader title="Table" subtitle="Data table with pagination" />
                </div>
                <Table columns={tableColumns} data={tableData} />
                <TablePagination
                    currentPage={currentPage}
                    totalPages={5}
                    pageSize={pageSize}
                    totalItems={50}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                />
            </Card>

            {/* Code Block */}
            <Card>
                <CardHeader title="Code Block" subtitle="Syntax-highlighted code display" />
                <CardBody>
                    <CodeBlock code={sampleCode} language="sql" title="Sample Query" />
                    <div className="mt-4">
                        <p className="text-gray-700 dark:text-gray-300">
                            You can also use <InlineCode>inline code</InlineCode> within text.
                        </p>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};
