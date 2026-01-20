I will implement the following changes to address the user's UI feedback:

1.  **Menu Inferior (Bottom Menu/Sidebar)**:
    *   Although the app uses a Sidebar/Drawer structure, I will treat the request as referring to the main navigation menu.
    *   I will modify the Sidebar (`aside`) in `App.tsx` to use a distinct **light theme** (`bg-white/80` or `bg-white` with shadow) instead of `bg-transparent`. This ensures consistent light theming as requested.
    *   I will also ensure the Drawer (mobile menu) maintains its `bg-white` style.

2.  **Calendário**:
    *   I will update the `Calendar` component in `App.tsx` to explicitly use **high-contrast dark colors** for text.
    *   Change day numbers from `text-gray-700` to `text-gray-900`.
    *   Change the month header from default (inherited) to `text-gray-900`.
    *   Change the weekday headers from `text-gray-500` to `text-gray-700`.
    *   Ensure the "disabled" state uses `text-gray-400` instead of `text-gray-300` for better visibility on white.

3.  **General Fonts**:
    *   I will scan `App.tsx` for `text-white` usage and replace it with `text-gray-800` or `text-pink-900` where it appears on light backgrounds (e.g., inside white cards or modals where the header background might have been removed or modified).
    *   I will verify that buttons intended to be white-on-pink (`bg-pink-600 text-white`) remain unchanged.

This approach covers all three points by enforcing high contrast and consistent light theming.