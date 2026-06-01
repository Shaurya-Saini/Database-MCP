# UI Components Library

This directory contains reusable UI components for the Universal Database Chat Assistant frontend. All components are built with React, TypeScript, and Tailwind CSS.

## Components Overview

### Form Components

#### Button
A versatile button component with multiple variants and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `isLoading`: boolean
- `leftIcon`, `rightIcon`: React.ReactNode

**Example:**
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Submit
</Button>
```

#### Input
Text input field with label, error, and helper text support.

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `leftIcon`, `rightIcon`: React.ReactNode

**Example:**
```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
/>
```

#### Select
Dropdown select component with options.

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `options`: SelectOption[]
- `placeholder`: string

**Example:**
```tsx
<Select
  label="Database"
  options={databaseOptions}
  value={selectedDb}
  onChange={(e) => setSelectedDb(e.target.value)}
/>
```

#### Textarea
Multi-line text input with configurable resize behavior.

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `resize`: 'none' | 'vertical' | 'horizontal' | 'both'

**Example:**
```tsx
<Textarea
  label="Query"
  rows={4}
  placeholder="Enter your query"
/>
```

### Layout Components

#### Card
Container component with header, body, and footer sections.

**Components:**
- `Card`: Main container
- `CardHeader`: Header with title, subtitle, and action
- `CardBody`: Content area
- `CardFooter`: Footer with actions

**Props:**
- `variant`: 'default' | 'bordered' | 'elevated'
- `padding`: 'none' | 'sm' | 'md' | 'lg'

**Example:**
```tsx
<Card variant="elevated">
  <CardHeader title="Database Connection" subtitle="Configure your database" />
  <CardBody>
    {/* Content */}
  </CardBody>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

#### Modal
Dialog component with overlay and close functionality.

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `closeOnOverlayClick`: boolean
- `closeOnEscape`: boolean
- `showCloseButton`: boolean

**Example:**
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure?</p>
  <ModalFooter>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

#### Dropdown
Dropdown menu with customizable items.

**Props:**
- `trigger`: React.ReactNode
- `items`: DropdownItem[]
- `onSelect`: (value: string) => void
- `align`: 'left' | 'right'

**Example:**
```tsx
<Dropdown
  trigger={<Button>Actions</Button>}
  items={[
    { label: 'Edit', value: 'edit', icon: <EditIcon /> },
    { label: 'Delete', value: 'delete', danger: true },
  ]}
  onSelect={handleAction}
/>
```

### Feedback Components

#### LoadingSpinner
Animated loading indicator.

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `color`: 'primary' | 'secondary' | 'white'
- `text`: string
- `fullScreen`: boolean

**Example:**
```tsx
<LoadingSpinner size="md" text="Loading data..." />
```

#### ErrorMessage
Error display component with multiple variants.

**Props:**
- `title`: string
- `message`: string
- `details`: string[]
- `onRetry`: () => void
- `onDismiss`: () => void
- `variant`: 'inline' | 'card' | 'banner'

**Example:**
```tsx
<ErrorMessage
  title="Connection Failed"
  message="Unable to connect to database"
  details={['Check your credentials', 'Verify network connection']}
  onRetry={handleRetry}
/>
```

#### SuccessMessage
Success notification component.

**Props:**
- `title`: string
- `message`: string
- `details`: string[]
- `onDismiss`: () => void
- `variant`: 'inline' | 'card' | 'banner'

**Example:**
```tsx
<SuccessMessage
  message="Query executed successfully"
  details={['Returned 42 rows', 'Execution time: 0.5s']}
/>
```

### Data Display Components

#### Table
Data table with sorting and pagination support.

**Props:**
- `columns`: TableColumn[]
- `data`: any[]
- `emptyMessage`: string
- `striped`: boolean
- `hoverable`: boolean
- `bordered`: boolean
- `compact`: boolean
- `maxHeight`: string

**Example:**
```tsx
<Table
  columns={[
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ]}
  data={users}
  striped
  hoverable
/>
```

#### TablePagination
Pagination controls for tables.

**Props:**
- `currentPage`: number
- `totalPages`: number
- `pageSize`: number
- `totalItems`: number
- `onPageChange`: (page: number) => void
- `onPageSizeChange`: (pageSize: number) => void

**Example:**
```tsx
<TablePagination
  currentPage={page}
  totalPages={10}
  pageSize={25}
  totalItems={250}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>
```

#### CodeBlock
Syntax-highlighted code display with copy functionality.

**Props:**
- `code`: string
- `language`: string
- `title`: string
- `showLineNumbers`: boolean
- `maxHeight`: string
- `copyable`: boolean

**Example:**
```tsx
<CodeBlock
  code={sqlQuery}
  language="sql"
  title="Generated Query"
  showLineNumbers
  copyable
/>
```

#### InlineCode
Inline code snippet display.

**Example:**
```tsx
<p>Use the <InlineCode>SELECT</InlineCode> statement to query data.</p>
```

## Dark Mode Support

All components support dark mode through Tailwind's `dark:` variant. The theme is automatically detected from the user's system preferences or can be toggled programmatically.

## Accessibility

Components follow WCAG 2.1 guidelines:
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader compatibility

## Testing

To view all components in action, import and render the `ComponentDemo` component:

```tsx
import { ComponentDemo } from './components/ui/ComponentDemo';

function App() {
  return <ComponentDemo />;
}
```

## Requirements Validation

These components satisfy the following requirements:
- **7.11**: Frontend SHALL support dark mode and light mode themes
- **7.12**: Frontend SHALL be responsive and work on desktop and tablet devices
- **12.5**: System SHALL display loading indicators during long-running operations
- **12.7**: System SHALL validate user inputs and display validation errors inline
