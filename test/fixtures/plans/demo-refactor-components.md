# Refactor Button Components

## Goal

Consolidate 5 different button implementations into a single reusable `Button` component.

## Current State

- `PrimaryButton.tsx` - Blue background, white text
- `SecondaryButton.tsx` - Gray outline
- `DangerButton.tsx` - Red background
- `IconButton.tsx` - Icon only, no text
- `LinkButton.tsx` - Looks like a link

## New Component API

```tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  onClick?: () => void;
}

<Button variant="primary" size="md" icon={<SaveIcon />}>
  Save Changes
</Button>;
```

## Files to Create

1. `src/components/Button/Button.tsx` - Main component
2. `src/components/Button/Button.css` - Styles
3. `src/components/Button/index.ts` - Export

## Files to Delete

- `src/components/PrimaryButton.tsx`
- `src/components/SecondaryButton.tsx`
- `src/components/DangerButton.tsx`
- `src/components/IconButton.tsx`
- `src/components/LinkButton.tsx`

## Migration Steps

1. Create new Button component
2. Update imports in 23 files
3. Delete old components
4. Update tests
