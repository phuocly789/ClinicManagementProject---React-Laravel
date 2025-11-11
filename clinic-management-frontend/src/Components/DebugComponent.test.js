import { render } from '@testing-library/react';

function multiply(x, y) {
    const result = x * y; // Đặt breakpoint ở đây
    return result;
}

test('simple multiplication', () => {
    const product = multiply(3, 4);
    expect(product).toBe(12);
});

test('renders without crash', () => {
    render(<div>Test</div>);
});