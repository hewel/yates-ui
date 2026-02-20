---
name: gtk-vanilla-extract
description: Use this skill when you are asked to write, edit, or generate styles, components, or themes for a GTK 4 application using the vanilla-extract styling library. It provides the necessary rules for formatting GTK-specific CSS properties, vendor prefixes, and custom properties in TypeScript.
license: MIT
compatibility: opencode
metadata:
  framework: vanilla-extract
  target: gtk-4.0
---

# GTK Vanilla Extract Styling Skill

## What I do

I provide instructions and rules for writing GTK 4.0 CSS properties within `vanilla-extract` style objects. I bridge the gap between GTK's specific CSS engine and Vanilla Extract's TypeScript-based styling API.

## When to use me

Use this skill when asked to write styles, components, or themes for a GTK 4 application using the `vanilla-extract` library.

## Rules for GTK in Vanilla Extract

1. **Vendor Prefixes for GTK properties:**
   [cite_start]All GTK-specific properties have a `-gtk` prefix[cite: 146]. [cite_start]If you want to target a vendor specific property, you can do so using PascalCase and removing the beginning `-`[cite: 14].
   - [cite_start]`-gtk-dpi` becomes `GtkDpi` [cite: 14, 150, 184]
   - [cite_start]`-gtk-icon-source` becomes `GtkIconSource` [cite: 14, 186]
   - [cite_start]`-gtk-icon-palette` becomes `GtkIconPalette` [cite: 14, 186]

2. **Standard CSS Properties:**
   [cite_start]CSS properties can be set just like when writing a regular CSS class, but all properties use camelCase rather than kebab-case[cite: 5, 6].
   - [cite_start]`min-width` becomes `minWidth` [cite: 6]
   - [cite_start]`border-radius` becomes `borderRadius` [cite: 6]

3. **Custom Properties (Variables):**
   [cite_start]GTK supports custom properties defined as `--prop: red;`[cite: 156, 157]. [cite_start]In Vanilla Extract, CSS variables must be nested within the `vars` key[cite: 17]. 

4. **Selectors (Pseudo & Complex):**
   - [cite_start]**Simple Pseudo Selectors:** Simple pseudo selectors that don't take any parameters can be used at the top level alongside the other CSS properties[cite: 32, 33]. 
   - [cite_start]**Complex Selectors:** More complex rules can be written using the `selectors` key[cite: 36]. [cite_start]All selectors must target the `&` character which is a reference to the current element[cite: 38].

5. **Media Queries (GTK 4.20+):**
   [cite_start]Vanilla Extract lets you embed media queries within your style definitions using the `'@media'` key[cite: 23]. [cite_start]Since GTK 4.20, CSS Media Queries are supported, including features like `prefers-color-scheme`, `prefers-contrast`, and `prefers-reduced-motion`[cite: 193, 194].

6. **Colors & Functions:**
   - [cite_start]Colors can be expressed in numerous ways in CSS, and GTK supports `hwb()`, `oklab()`, `oklch()`, `color()`, `color-mix()`, relative colors, and `calc()`[cite: 151, 159].
   - [cite_start]Non-CSS GTK color extensions like `shade()`, `lighter()`, `darker()`, `alpha()`, and `mix()` are deprecated and should be replaced by the equivalent standard CSS notions[cite: 160, 161, 168, 169, 170].

7. **Fallback Styles:**
   [cite_start]GTK supports custom properties with fallbacks, such as `color: var(--prop, green);`[cite: 158]. [cite_start]In Vanilla Extract, when using CSS property values that don't exist in some browsers, you use an array to define fallback values[cite: 75, 77].

## Example Usage

```typescript
import { style } from '@vanilla-extract/css';

export const gtkCard = style({
  // Standard properties in camelCase
  minWidth: '200px',
  padding: '12px',
  backgroundColor: 'white',
  borderRadius: '8px',

  // GTK specific properties in PascalCase
  GtkDpi: 96,
  GtkIconShadow: '0 1px 2px rgba(0,0,0,0.2)',

  // Simple pseudo-classes at top level
  ':hover': {
    backgroundColor: 'oklab(0.9 0 0)' // Modern CSS colors are supported in GTK
  },

  // Complex selectors using '&'
  selectors: {
    '&:focus:not(:active)': {
      outlineStyle: 'solid'
    }
  },

  // Nested custom properties
  vars: {
    '--card-accent-color': 'blue'
  },
  
  // GTK 4.20+ Media queries embedded directly
  '@media': {
    '(prefers-color-scheme: dark)': {
      backgroundColor: '#333'
    }
  }
});