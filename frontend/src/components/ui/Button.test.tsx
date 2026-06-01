import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
    it('renders with children text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies primary variant styles by default', () => {
        render(<Button>Primary</Button>);
        const button = screen.getByText('Primary');
        expect(button).toHaveClass('bg-blue-600');
    });

    it('applies secondary variant styles when specified', () => {
        render(<Button variant="secondary">Secondary</Button>);
        const button = screen.getByText('Secondary');
        expect(button).toHaveClass('bg-gray-200');
    });

    it('applies danger variant styles when specified', () => {
        render(<Button variant="danger">Delete</Button>);
        const button = screen.getByText('Delete');
        expect(button).toHaveClass('bg-red-600');
    });

    it('handles click events', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click</Button>);

        const button = screen.getByText('Click');
        fireEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByText('Disabled');
        expect(button).toBeDisabled();
    });

    it('disables button when isLoading is true', () => {
        render(<Button isLoading>Loading</Button>);
        const button = screen.getByText('Loading');
        expect(button).toBeDisabled();
    });

    it('shows loading spinner when isLoading is true', () => {
        render(<Button isLoading>Loading</Button>);
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('applies small size styles', () => {
        render(<Button size="sm">Small</Button>);
        const button = screen.getByText('Small');
        expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('applies large size styles', () => {
        render(<Button size="lg">Large</Button>);
        const button = screen.getByText('Large');
        expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    it('renders left icon when provided', () => {
        const LeftIcon = () => <span data-testid="left-icon">←</span>;
        render(
            <Button leftIcon={<LeftIcon />}>
                With Icon
            </Button>
        );
        expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon when provided', () => {
        const RightIcon = () => <span data-testid="right-icon">→</span>;
        render(
            <Button rightIcon={<RightIcon />}>
                With Icon
            </Button>
        );
        expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('does not render icons when isLoading is true', () => {
        const LeftIcon = () => <span data-testid="left-icon">←</span>;
        const RightIcon = () => <span data-testid="right-icon">→</span>;
        render(
            <Button isLoading leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
                Loading
            </Button>
        );
        expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<Button className="custom-class">Custom</Button>);
        const button = screen.getByText('Custom');
        expect(button).toHaveClass('custom-class');
    });

    it('forwards additional HTML button attributes', () => {
        render(<Button type="submit" data-testid="submit-btn">Submit</Button>);
        const button = screen.getByTestId('submit-btn');
        expect(button).toHaveAttribute('type', 'submit');
    });
});
