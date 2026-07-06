# Product Linking & Variant System User Guide

## Complete Step-by-Step Manual for the Al-Nassim Product Catalog

---

# Table of Contents

1. [Introduction to Product Variants](#1-introduction-to-product-variants)
2. [Creating a Variant Group](#2-creating-a-variant-group)
3. [Linking Existing Products](#3-linking-existing-products)
4. [Adding Variants with the Same Barcode](#4-adding-variants-with-the-same-barcode)
5. [Different Barcode Variant Workflow](#5-different-barcode-variant-workflow)
6. [Editing Variants](#6-editing-variants)
7. [Removing Variants](#7-removing-variants)
8. [Viewing Variants on Product Pages](#8-viewing-variants-on-product-pages)
9. [Scanner Workflow with Variants](#9-scanner-workflow-with-variants)
10. [Quick Reference Navigation Paths](#10-quick-reference-navigation-paths)
11. [Troubleshooting](#11-troubleshooting)

---

# 1. Introduction to Product Variants

## What Are Product Variants?

Product variants allow you to link multiple products that represent different versions of the same item. For example, a cooking pot might come in Red, Blue, and Green colors. Instead of treating these as three completely separate products, you can link them together as variants.

### When to Use Variants

| Scenario | Example |
|----------|---------|
| Different colors of same product | Red pot, Blue pot, Green pot |
| Different sizes of same product | 20cm pan, 25cm pan, 30cm pan |
| Same product with different barcodes | Product imported twice with slightly different barcodes |
| Items sharing the same ND Number | Multiple items with identical ND Number should be grouped |

### Key Concepts

- **Variant Group**: A collection of linked products that represent different versions of the same item.
- **Primary Product**: The main product in the group (usually the first one added).
- **Member Product**: Any product that belongs to the variant group.
- **Variant-Specific Attributes**: Properties that differ between variants (like Color).

---

# 2. Creating a Variant Group

## Overview

Creating a variant group links two or more products together. The first product you start with becomes the "primary" product of the group.

## Complete Navigation Path

```
Dashboard → Products → Select Product → Click Edit → Expand Product Variants → Click Link as Variant → Search Product → Link Variant
```

## Step-by-Step Instructions

### Step 1: Navigate to Products List

1. Open the application and log in.
2. On the **Dashboard**, click the **"Browse All Products"** button or tap **"Products"** in the bottom navigation (mobile) or top navigation (desktop).

**Screen Displayed**: Product List page showing all products in a table format.

**Visible Elements**:
- Search bar at the top
- Filter dropdowns (Department, Category, Brand, etc.)
- Product table with columns: Sr, ND Number, Barcode, Name, etc.
- Each product row is clickable

### Step 2: Select the Primary Product

1. Click on any product row in the table to select it.
2. The product detail page will open showing full product information.

**Screen Displayed**: Product Detail page.

**Visible Elements**:
- Product name and badges (ND Number, Barcode)
- Image gallery
- Multiple information sections (Identity, Classification, Attributes, etc.)
- **Edit** button (top right)
- **Delete** button (top right)

### Step 3: Open Edit Mode

1. Click the **"Edit"** button in the top-right corner.

**Screen Displayed**: Edit Product form.

**Visible Elements**:
- Back button (top left)
- Product form with all editable fields
- **Product Variants** section (expandable card)

### Step 4: Expand Product Variants Section

1. Scroll down to find the **"Product Variants"** card.
2. Click the card header to expand it. A chevron icon (▶) will rotate to show it's expanded (▼).

**Screen Displayed**: Expanded Product Variants section.

**Visible Elements**:
- **"Linked Variants"** label (if variants exist)
- List of currently linked variants (empty if this is a new group)
- **"Link as Variant"** button (blue outline button)
- **"Unlink All"** button (red, if variants exist)

### Step 5: Click "Link as Variant"

1. Click the **"Link as Variant"** button.

**Screen Displayed**: "Link Product as Variant" dialog (modal popup).

**Visible Elements**:
- Dialog title: "Link Product as Variant"
- **"Scan Barcode to Find Product"** button
- **Search input** field with placeholder: "Search by ND Number, Barcode, or Name..."
- Search results area (appears after searching)
- Color override dropdown (appears after selecting a product)
- **"Cancel"** button
- **"Link Variant"** button

### Step 6: Search for the Product to Link

**Option A: Manual Search**

1. In the search input field, type:
   - ND Number (e.g., "ND-1234")
   - Barcode (e.g., "6281001234567")
   - Product name (e.g., "Cooking Pot")
   - Product ID
2. Wait briefly — search results appear automatically after typing.

**Option B: Scan Barcode**

1. Click **"Scan Barcode to Find Product"** button.
2. The barcode scanner opens (full screen, camera view).
3. Point your camera at the barcode.
4. When scanned, the app automatically:
   - Closes the scanner
   - Searches for the product
   - Selects it if found

**Scanner Screen Displayed**:

- Full black screen with camera preview
- White corner brackets showing scan area
- Red horizontal line in center
- "Back" button (top left)
- "Flash On/Off" button (bottom, if supported)
- "Type Manually" button (bottom)

### Step 7: Select the Product from Results

1. In the search results list, click on the product you want to link.
2. The selected product row becomes highlighted (background changes).

**Visible After Selection**:
- Product is highlighted
- **"Variant Color Override"** dropdown appears below

### Step 8: Choose Variant Color Override (Optional)

1. If the linked product has a different color than what's stored, select from the dropdown:
2. Click the dropdown labeled **"Select color (optional)"**.
3. Choose a color from the list (Beige, Black, Blue, Brown, Gold, Green, Grey, Metallic, Multicolor, Orange, Pink, Red, Silver, Transparent, White).

**What This Does**: Overrides the variant's color display. Useful when the product record has no color or an incorrect color.

### Step 9: Confirm the Link

1. Click the **"Link Variant"** button (blue, right side of dialog footer).

**What Happens**:
- If this is the first link → Creates a new variant group with both products
- If a group already exists → Adds the selected product to the existing group
- Dialog closes
- Success message: "Variant group created" or "Product added as variant"

**Screen Displayed**: Edit Product form with updated Product Variants section.

**Visible After Linking**:
- Badge showing "X variants" (where X is the number)
- List of linked products with:
  - Source Row number
  - ND Number or Barcode
  - Product name
  - Color badge (if set)
  - "Current" badge on the product you're viewing
  - Unlink button (chain icon) on each non-current member

---

# 3. Linking Existing Products

## Scenario

You have already imported two separate products (Product A and Product B) and want to link them together as variants.

## Complete Navigation Path

```
Dashboard → Products → Find Product A → Click Edit → Product Variants → Link as Variant → Search for Product B → Select Product B → Link Variant → Save
```

## Detailed Workflow

### Step 1: Open Product A

1. Navigate to **Products** (via Dashboard or bottom nav).
2. Use the search bar to find Product A by:
   - ND Number
   - Barcode
   - Name
3. Click on Product A's row in the table.

**Screen**: Product Detail page for Product A.

### Step 2: Enter Edit Mode

1. Click the **"Edit"** button (top right).

**Screen**: Edit Product form for Product A.

### Step 3: Open Variant Manager

1. Scroll to the **"Product Variants"** card.
2. Click to expand it.

**Screen**: Expanded Product Variants section (empty if no existing links).

### Step 4: Initiate Linking

1. Click **"Link as Variant"** button.

**Screen**: Link Product as Variant dialog.

### Step 5: Find Product B

**Method 1: Search by Text**

1. Type Product B's identifier in the search field:
   - ND Number: e.g., "ND-5678"
   - Barcode: e.g., "6281001234568"
   - Product Name: e.g., "Blue Cooking Pot"
2. Results appear below.

**Method 2: Scan Barcode**

1. Click **"Scan Barcode to Find Product"**.
2. Camera opens.
3. Point at Product B's barcode.
4. Scanner auto-detects and closes.
5. Product B is auto-selected if found.

### Step 6: Select and Confirm

1. Click on Product B in the results list (it highlights).
2. Optionally select a color override from the dropdown.
3. Click **"Link Variant"**.

**Result**:
- Variant group created containing Product A and Product B
- Both products now show "X variants" badge when opened
- Toast message: "Variant group created"

### Step 7: Verify the Link

1. Click **Back** button to return to Products list.
2. Open Product B.
3. Click **Edit**.
4. Expand **Product Variants**.
5. You should see Product A listed as a linked variant.

---

# 4. Adding Variants with the Same Barcode

## Scenario

You scan an item with barcode "6281001234567" and discover it's actually a different color variant of an existing product.

## Complete Navigation Path

```
Products → Scan Barcode → Detect Duplicate → View Existing Product → Edit → Product Variants → Link as Variant → Add New Variant Info → Save
```

## Detailed Workflow

### Step 1: Scan a Product Barcode

1. Go to **Products** page.
2. Click the **barcode scanner icon** (camera icon) in the top-right toolbar.

**Screen**: Barcode Scanner (full screen).

**Visible Elements**:
- Camera preview
- White corner brackets framing scan area
- Red horizontal scan line
- "Back" button (top left)
- "Flash On/Off" toggle (bottom)
- Instructions: "Point your camera at a barcode..."

### Step 2: Point at Barcode

1. Align the barcode within the white brackets.
2. Keep steady until the red line crosses the barcode.
3. Scanner detects and processes automatically.

### Step 3: Handle Duplicate Detection

**If barcode matches an existing product**:

The app shows the existing product's detail page with a **Duplicate Warning** alert.

**Screen**: Product Detail with duplicate alert.

**Visible Elements**:
- Yellow/red alert banner: "Duplicate barcode detected"
- Existing product's information
- Options to:
  - View the existing product
  - Edit the existing product
  - Link as variant

### Step 4: Link as Variant

1. Click **"Edit"** on the existing product.
2. Expand **"Product Variants"**.
3. Click **"Link as Variant"**.

### Step 5: Add the New Variant Information

Since the scanned product is a NEW physical item (different color), you need to first add it as a separate product record before linking.

**Alternative Path** (if product doesn't exist yet):

1. Go to **Dashboard**.
2. Click **"Add Product"**.
3. Enter the same barcode.
4. Fill in product details with the NEW color.
5. Save the new product.
6. Then follow the linking steps in Section 3.

### Step 6: Upload Variant-Specific Image

1. After linking, the new variant appears in the variant list.
2. Each variant can have its own image.

**To upload a variant image**:

1. Open the variant product (click its row in the Products list).
2. Click **Edit**.
3. In the **Images** section:
   - Click **"Upload Image"** button
   - Or drag-and-drop an image
   - Or paste an image (Ctrl+V)
4. The image is uploaded to that specific variant product.

**Important**: Variant images are stored per-product, not per-variant-group. Each linked product maintains its own image gallery.

---

# 5. Different Barcode Variant Workflow

## Scenario

Two products have DIFFERENT barcodes but are actually the same product in different colors. Example:
- Product A: Barcode "6281001234567", Red pot
- Product B: Barcode "6281001234568", Blue pot (same product, different color)

You want to manually link these together.

## Complete Navigation Path

```
Dashboard → Products → Find Product A → Edit → Product Variants → Link as Variant → Search "6281001234568" → Select Product B → Set Color Override → Link Variant → Verify
```

## Step-by-Step Instructions

### Step 1: Open Product A

1. Navigate to **Products**.
2. Search for Product A by barcode or ND Number.
3. Click Product A's row.

**Screen**: Product Detail page.

### Step 2: Edit Product A

1. Click **"Edit"** button (top right).

**Screen**: Edit Product form.

### Step 3: Open Variant Manager

1. Scroll to **"Product Variants"** section.
2. Click the card header to expand.

**Screen**: Product Variants section (empty initially).

### Step 4: Initiate Manual Linking

1. Click **"Link as Variant"** button.

**Screen**: Link Product as Variant dialog.

### Step 5: Search by Different Barcode

1. In the search field, type Product B's barcode: "6281001234568".
2. Press Enter or wait — search results appear.

**OR use scanner**:

1. Click **"Scan Barcode to Find Product"**.
2. Scan Product B's barcode directly.
3. Scanner closes, Product B auto-selected.

### Step 6: Select Product B

1. Click on Product B in the results list.
2. Row highlights to confirm selection.

### Step 7: Set Color Override

Since Product B is a different color:

1. In the **"Variant Color Override"** dropdown:
2. Select "Blue" (or whatever color Product B is).

**Why This Matters**: The color override helps distinguish variants when viewing the group. It overrides whatever color is (or isn't) stored in Product B's record.

### Step 8: Confirm Link

1. Click **"Link Variant"** button.

**Result**:
- New variant group created
- Product A and Product B linked
- Toast: "Variant group created"

### Step 9: Verify from Product B

1. Navigate to Products list.
2. Find and open Product B.
3. Click **Edit**.
4. Expand Product Variants.
5. You should see:
   - Product A listed as a linked variant
   - Badge showing "2 variants"

---

# 6. Editing Variants

## Overview

After creating a variant group, you can modify individual variant members. This includes changing colors, updating images, and adjusting variant-specific properties.

## What Can Be Edited

| Property | Where to Edit | Notes |
|----------|---------------|-------|
| Color Override | Variant Manager dialog | Specific to the variant link |
| Product Color | Edit Product form | Stored in the product record |
| Variant Image | Product's Image Gallery | Each product has its own images |
| All product fields | Edit Product form | Opens full edit screen |

## Workflow: Edit Variant Color Override

**Navigation Path**:

```
Products → Open Primary Product → Edit → Product Variants → View Linked Variants → (Re-link with new color)
```

**Note**: Color overrides are set during linking. To change, you must unlink and re-link with the new color.

**Steps**:

1. Open the primary product.
2. Click **Edit**.
3. Expand **Product Variants**.
4. Find the variant to modify.
5. Click the **Unlink button** (chain icon) on that variant.
6. Confirm unlinking.
7. Click **"Link as Variant"** again.
8. Search for the same product.
9. Select it.
10. Choose the **new color** from the dropdown.
11. Click **"Link Variant"**.

## Workflow: Edit Product Fields (Affects All Variants)

Some fields are shared across variants (like brand, dimensions). Others are variant-specific (like color).

**Navigation Path**:

```
Products → Open Variant → Edit → Modify Fields → Save
```

**Steps**:

1. Open any variant product from the Products list.
2. Click **"Edit"** button.
3. Modify any fields (name, dimensions, price, etc.).
4. Click **"Save"** button (top right).

**Result**: Changes apply to that specific product record only. Linked variants remain linked but each has independent records.

## Workflow: Replace Variant Image

**Navigation Path**:

```
Products → Open Variant → Images Section → Delete Old Image → Upload New Image → Set as Primary
```

**Steps**:

1. Open the variant product from the Products list.
2. Scroll to the **Images** section.
3. To delete an old image:
   - Hover over the image
   - Click the **trash icon** (red)
   - Confirm deletion
4. To upload a new image:
   - Click **"Upload Image"** button
   - Or drag-and-drop a file
   - Or paste (Ctrl+V)
5. To set as primary:
   - Hover over the new image
   - Click the **star icon** (yellow)
   - Image becomes the primary/featured image

---

# 7. Removing Variants

## Options for Removing Variants

| Action | Effect | Navigation |
|--------|--------|------------|
| Unlink single variant | Removes one product from group | Variant Manager → Unlink button |
| Unlink all variants | Deletes entire variant group | Variant Manager → Unlink All button |
| Delete product entirely | Removes product AND its variant link | Product Detail → Delete button |

## Workflow: Unlink Single Variant

**Navigation Path**:

```
Products → Open Primary Product → Edit → Product Variants → Find Variant → Click Unlink Icon → Confirm
```

**Step-by-Step**:

1. Open the primary product (any linked member works).
2. Click **"Edit"** button.
3. Expand **"Product Variants"**.
4. In the "Linked Variants" list, find the variant to remove.
5. Click the **unlink button** (chain-break icon) on the right side of that row.
6. A confirmation dialog appears.

**Dialog Displayed**:
- Title: "Remove Variant?"
- Message: "This will unlink this product from the variant group."
- Buttons: "Cancel" and "Remove"

7. Click **"Remove"**.

**Result**:
- Variant removed from the group
- If only 1 variant remains, the entire group is deleted automatically
- Toast message: "Variant removed"

## Workflow: Unlink All Variants (Delete Group)

**Navigation Path**:

```
Products → Open Any Variant → Edit → Product Variants → Unlink All → Confirm
```

**Step-by-Step**:

1. Open any product in the variant group.
2. Click **"Edit"**.
3. Expand **"Product Variants"**.
4. Click **"Unlink All"** button (red, in the card header).

**Dialog Displayed**:
- Title: "Delete Variant Group?"
- Message: "This will unlink all X products from this variant group. The products themselves will remain intact."
- Buttons: "Cancel" and "Delete Group"

5. Click **"Delete Group"**.

**Result**:
- All variant links removed
- All products remain in the database (not deleted)
- Toast: "Variant group deleted"

## Workflow: Delete Entire Product (Removes Variant Link)

**Navigation Path**:

```
Products → Open Product → Delete → Confirm → Variant Group Updates
```

**Step-by-Step**:

1. Open the product from the Products list.
2. Click **"Delete"** button (red, top right).

**Dialog Displayed**:
- Title: "Delete Product"
- Message: "Are you sure you want to delete [product name]? This will also delete all images. This cannot be undone."
- Buttons: "Cancel" and "Delete"

3. Click **"Delete"**.

**Result**:
- Product deleted from database
- Product automatically removed from any variant group
- If group shrinks to 1 member, group is deleted
- Toast: "Product deleted successfully"

---

# 8. Viewing Variants on Product Pages

## Where Variants Appear

| Location | What You See |
|----------|--------------|
| Product Edit Form | Full variant management controls |
| Product Detail Page | Related products with same ND Number |
| Products List | Products appear individually (no group badge yet) |

## Product Detail Page: Related Products Section

**When Does This Appear**: If a product has an ND Number that matches other products, a "Related Products" card appears at the bottom of the Product Detail page.

**Navigation Path**:

```
Products → Open Product → Scroll to Bottom → Related Products Section
```

**Screen Displayed**: Product Detail page with "Other Products with Same ND (ND-XXXX)" section.

**Visible Elements**:
- Card title: "Other Products with Same ND (ND-XXXX)"
- List of related products showing:
  - Thumbnail image
  - Product name
  - Product ID / Barcode
  - Price
- Each row is clickable

**Behavior**: Clicking a related product opens its detail page.

## Product Edit Page: Variant Manager

**Navigation Path**:

```
Products → Open Product → Edit → Product Variants Section
```

**Screen Displayed**: Edit Product form with expandable Product Variants card.

**When Expanded, You See**:

1. **Badge**: "X variants" showing count of linked products

2. **Linked Variants List** (scrollable, max 200px height):
   - Each row shows:
     - Source Row number
     - ND Number or Barcode
     - Product name
     - Color badge (if override set)
     - "Current" badge on product being viewed
     - Unlink button (on non-current products)

3. **Action Buttons**:
   - "Link as Variant" — Opens linking dialog
   - "Unlink All" — Deletes entire group (if variants exist)

## Switching Between Variants

**From Product Detail Page**:

1. Scroll to "Related Products" section.
2. Click on any related product row.
3. That product's detail page opens.

**From Edit Mode**:

1. In the Linked Variants list, note the names/identifiers.
2. Click **Back** to return to Products list.
3. Find and open the desired variant.

## Understanding Shared vs. Variant-Specific Information

### Shared Information (Same Across Variants)

| Field | Typically Shared |
|-------|------------------|
| Brand | All variants have same brand |
| Product Family | Same family |
| Dimensions | Same size (unless size variants) |
| Price | May vary per variant |
| Name (English) | Base name same, color may differ |
| ND Number | Often same across variants |

### Variant-Specific Information

| Field | Typically Variant-Specific |
|-------|----------------------------|
| Color | Different per variant |
| Barcode | Usually unique per variant |
| Product ID | Unique identifier |
| Images | Each variant has own images |
| Color Override | Set during linking |

---

# 9. Scanner Workflow with Variants

## Scanner Locations in the App

| Location | Scanner Purpose |
|----------|-----------------|
| Products List (top toolbar) | Search products by barcode |
| Add/Edit Product form (barcode field) | Fill barcode field |
| Link Variant dialog | Find product to link by barcode |

## Workflow: Scan to Find Product for Linking

**Navigation Path**:

```
Products → Open Product → Edit → Product Variants → Link as Variant → Scan Barcode to Find Product → Point Camera → Auto-Select → Link
```

### Step-by-Step Scanner Usage

**Step 1: Open Scanner from Link Dialog**

1. In the "Link Product as Variant" dialog, click **"Scan Barcode to Find Product"** button.

**Screen**: Full-screen Barcode Scanner.

**Visible Elements**:
- Camera preview (full screen)
- White corner brackets (scan zone)
- Red horizontal scan line
- Header: "Scan Barcode" with Back button
- Bottom controls: Flash toggle, Type Manually button

**Step 2: Point Camera**

1. Hold your phone steady.
2. Align the barcode within the white brackets.
3. Ensure good lighting.
4. The red line should cross the barcode horizontally.

**Step 3: Detection**

When barcode is detected:

- Scanner automatically closes
- Search is performed with the scanned barcode
- If product found:
  - Product auto-selected in results
  - Color dropdown appears
- If NOT found:
  - Toast message: "No product found with this barcode"

**Step 4: Confirm Linking**

1. Review the auto-selected product.
2. Optionally choose a color override.
3. Click **"Link Variant"** button.

## Scanner Features

### Flashlight Toggle

**Location**: Bottom of scanner screen.

**Button**: "Flash On" / "Flash Off"

**Usage**:
1. Click to turn on flash for better scanning in low light.
2. Click again to turn off.

**Note**: Only available if your device supports flash control.

### Type Manually

**Location**: Bottom of scanner screen.

**Button**: "Type Manually"

**Usage**: If scanner can't read the barcode, click this to close scanner and type the barcode manually in the search field.

## What Happens After Scanning

| Scan Result | App Behavior |
|-------------|--------------|
| Product found | Auto-select, show color dropdown |
| Product not found | Show toast "No product found" |
| Same product as current | Show toast "Cannot link the same product" |
| Already linked product | Product filtered from results |

---

# 10. Quick Reference Navigation Paths

## Complete Navigation Cheat Sheet

### Create Variant Group

```
Dashboard → Products → [Click Product Row] → Edit → Product Variants → [Click Expand] → Link as Variant → [Search/Scan] → [Select Product] → [Choose Color] → Link Variant
```

### Link Additional Variant to Existing Group

```
Products → [Open Product in Group] → Edit → Product Variants → Link as Variant → [Search] → [Select] → [Color Override] → Link Variant
```

### Unlink Single Variant

```
Products → [Open Product] → Edit → Product Variants → [Find Variant Row] → [Click Unlink Icon] → Confirm
```

### Delete Entire Variant Group

```
Products → [Open Any Variant] → Edit → Product Variants → Unlink All → Confirm
```

### Upload Variant Image

```
Products → [Open Variant Product] → Images → Upload Image → [Select File] → [Set Primary if needed]
```

### Find Product by Barcode Scanner

```
Products → [Click Scanner Icon] → [Point Camera] → [Auto-Detect] → [Product Opens]
```

### Scan to Link Variant

```
Edit → Product Variants → Link as Variant → Scan Barcode to Find Product → [Point Camera] → [Auto-Select] → Link Variant
```

---

# 11. Troubleshooting

## Common Issues and Solutions

### Issue: "Cannot link the same product as a variant"

**Cause**: You tried to link a product to itself.

**Solution**: Select a DIFFERENT product from the search results.

---

### Issue: "No product found with this barcode"

**Cause**: The scanned barcode doesn't exist in the database.

**Solution**:
1. First add the new product (Dashboard → Add Product)
2. Enter the barcode and save
3. Then return to link it as a variant

---

### Issue: Variant group disappears after unlinking

**Cause**: Variant groups with only 1 member are auto-deleted.

**Solution**: This is expected behavior. A variant group requires at least 2 members.

---

### Issue: Color override not showing

**Cause**: Color override is set at the LINK level, not the product level.

**Solution**: When viewing the Linked Variants list, the color badge shows either:
- The override color (if set during linking)
- The product's stored color (if no override)

---

### Issue: Scanner not working / Camera permission denied

**Cause**: Browser or device denied camera access.

**Solution**:
1. Check browser settings for camera permissions
2. Allow camera access for this site
3. Try the "Type Manually" button as fallback

---

### Issue: Related products section not appearing

**Cause**: No other products share the same ND Number.

**Solution**: Use the variant linking system to manually link products, even if they have different ND Numbers.

---

### Issue: Product appears in search but can't be linked

**Cause**: Product is already linked in a different variant group, or it's the current product.

**Solution**:
1. Unlink it from its existing group first
2. Or search for a different product

---

## Frequently Asked Questions

**Q: Can a product belong to multiple variant groups?**

A: No. Each product can only belong to one variant group at a time.

---

**Q: Does linking variants merge the product records?**

A: No. Each product maintains its own separate record. Linking creates a relationship between records, not a merge.

---

**Q: What happens to images when linking variants?**

A: Each product keeps its own images. Linked variants do NOT share images automatically.

---

**Q: Can I change the primary product in a variant group?**

A: Currently, the first product linked becomes the primary. To change, unlink all and re-link starting with your preferred primary.

---

**Q: Do variant links persist across imports?**

A: Yes. Variant groups are stored in the database and persist independently of product imports/updates.

---

## Support Tips

1. **Always expand the Product Variants section** to see current links before adding new ones.

2. **Use color overrides** to clearly distinguish variants in the list view.

3. **Check both products** after linking — open each one to verify the relationship appears in both.

4. **Scanner is fastest** for linking products with different barcodes.

5. **Unlink before re-linking** if you want to change a variant's color override.

---

# Appendix: Screen Elements Reference

## Product Variants Section (Expanded)

| Element | Description |
|---------|-------------|
| ChevronDown icon | Indicates section is expanded |
| "Product Variants" title | Section header |
| "X variants" badge | Shows count of linked products |
| "Unlink All" button | Deletes entire variant group |
| "Linked Variants" label | Header for variant list |
| ScrollArea (200px) | Contains variant member rows |
| Member row | Shows: SR#, ND#/Barcode, Name, Color, Current badge |
| "Current" badge | Highlights the product being viewed |
| Unlink icon button | Removes individual member from group |
| "Link as Variant" button | Opens linking dialog |

## Link Product as Variant Dialog

| Element | Description |
|---------|-------------|
| Dialog title | "Link Product as Variant" |
| "Scan Barcode..." button | Opens camera scanner |
| Search input | Text field for manual search |
| Search results | Scrollable list of matching products |
| Selected row | Highlighted background |
| Color dropdown | "Select color (optional)" with 15 color options |
| "Cancel" button | Closes dialog without linking |
| "Link Variant" button | Creates link (requires selection) |

## Barcode Scanner Screen

| Element | Description |
|---------|-------------|
| Camera preview | Full-screen live camera feed |
| White corner brackets | Visual guide for scan alignment |
| Red horizontal line | Scan indicator |
| "Back" button | Returns to previous screen |
| "Flash On/Off" | Toggles device flash (if supported) |
| "Type Manually" | Closes scanner for manual entry |
| Instructions text | "Point your camera at a barcode..." |

---

**Document Version**: 1.0
**Last Updated**: July 2026
**Application**: Al-Nassim Product Catalog Management System