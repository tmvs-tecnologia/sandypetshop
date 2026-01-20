I will implement the "Tabela de Preços" (Price Table) feature as follows:

1.  **Create `PriceTableModal.tsx`**:
    -   A new component that renders a modal using `createPortal` to `document.body`.
    -   **Features**:
        -   **Backdrop**: Blurred background (`backdrop-blur-sm`) with a semi-transparent dark overlay.
        -   **Content**: Displays the price table image (`https://i.imgur.com/j2PoC91.jpeg`) centered.
        -   **Close Actions**: Close button (X) in the top-right, click outside to close, and ESC key support.
        -   **Animations**: Smooth fade-in and scale-in effects using Tailwind CSS classes.
        -   **Responsiveness**: Adapts to different screen sizes (max-width, max-height).

2.  **Update `App.tsx`**:
    -   Import the `PriceTableModal` component.
    -   Add a state variable `isPriceModalOpen` to control the modal's visibility.
    -   **Add Button**: Insert a "Tabela de Preços" button in the main header, below the "Agendamento Online" text.
        -   **Style**: Consistent with the theme (white/pink), rounded, with an icon.
    -   **Render Modal**: Place the `<PriceTableModal />` component in the render tree, controlled by the state.

This approach ensures the feature is strategic, visible, and follows the requested design and behavior specifications.