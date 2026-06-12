# NutriBlend Product Image & Asset Guidelines

To maintain a consistent, high-performance shopping interface across all device screen sizes, please follow these asset guidelines when adding or modifying product and plan images.

---

## Technical Specifications

### 1. Recommended Dimensions
- **Standard Ratio**: `1:1` (Square aspect ratio).
- **Target Resolution**: `800 × 800 pixels` (Minimum: `400 × 400 pixels` for thumbnails).
- **Why**: Keeps product grid lists aligned without page layout shifting.

### 2. File Format & Compression
- **Preferred Format**: `.webp`
- **Fallback Format**: `.png` (Use transparent background where appropriate) or `.jpg` / `.jpeg`.
- **Target Size**: Under **100 KB** per product image.
- **Optimization Tools**: Use tools like [Squoosh](https://squoosh.app/) or `cwebp` command line to compress images while maintaining high visual quality.

### 3. File Naming Conventions
- Always use **camelCase** or **kebab-case** matching the product identifier.
- Do not use spaces or special characters in filenames.
- Examples:
  - `20gWhey.webp`
  - `10gNatural.webp`
  - `BasicPre.webp`
  - `40gProShake.webp`

---

## Image Fallback Policy

If a product image fails to load or is not yet uploaded to the directory:
1. The app utilizes a helper mapping module located at `src/utils/productImages.js`.
2. If the product name matches a known key, it maps to the correct public URL.
3. If no image matches or if a network error occurs, the frontend displays a default vector placeholder SVG featuring the NutriBlend brand branding so that the page layout never crashes or displays a broken image icon.

---

## Directory Structure
Save all store product images under:
```text
public/
  products/
    10gNatural.webp
    20gNaturalShake.webp
    20gWhey.webp
    30gNatural.webp
    30gWhey.webp
    40gProShake.webp
    50gPro.webp
    BasicPre.webp
    PremiumWork.webp
    StandardPre.webp
    WheyShake.webp
```
