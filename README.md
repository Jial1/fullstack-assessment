# Stackline Full-Stack Assignment – Evan Liu

## Overview
This project is a simplified eCommerce app with a **Product List Page**, **Search Results**, and **Product Detail Page**.  
The original implementation included UX bugs, layout inconsistencies, and state synchronization issues.  
This README documents the key issues I identified, how I fixed them, and why I made each change.

---

## Bugs & Issues Identified

### 1. Subcategory scoped to Category
- **Issue:** Subcategroy filter is not based on the first filter
- **Fix:** The Subcategory filter is now scoped to the selected Category (first filter), not the entire catalog.
  ```ts
  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      setSelectedSubCategory(undefined);
      return;
    }
    fetch(`/api/subcategories?category=${encodeURIComponent(selectedCategory)}`)
      .then(r => r.json())
      .then(d => setSubCategories(d.subCategories ?? []));
  }, [selectedCategory]);
  ```
- **Why:** Prevents invalid combinations and shortens the list for better UX.
---

### 2. Image Load Error – “Invalid src prop on next/image”
- **Issue:** Images from Amazon CDNs weren’t displayed.
- **Root Cause:** The domain was not configured in `next.config.js`.
- **Fix:**
  ```js
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "m.media-amazon.com" }
    ],
  },
  ```
- **Why:** Restrict image sources to safe, valid domains while fixing runtime crash.

---

### 3. “View Details” Buttons Misaligned Across Cards
- **Issue:** Product cards of varying heights caused inconsistent button alignment.
- **Fix:**
  ```tsx
  <Card className="h-full flex flex-col">
    <CardContent className="flex-1">...</CardContent>
    <CardFooter className="mt-auto pt-0">
      <Button variant="outline" className="w-full">View Details</Button>
    </CardFooter>
  </Card>
  ```
  And on the grid:
  ```tsx
  <div className="grid ... items-stretch">
  ```
- **Why:** Uses Flexbox to keep footers aligned visually across rows.

---

### 4. Search Unstable for Long Inputs
- **Issue:** Rapid typing triggered multiple re-renders and inconsistent results.
- **Fix:** Added a 300 ms debounce to delay fetch:
  ```ts
  useEffect(() => {
    const id = setTimeout(() => pushQuery({ search }), 300);
    return () => clearTimeout(id);
  }, [search]);
  ```
- **Why:** Reduces request spam and improves perceived performance.


## Improvements & Enhancements

### Functional
- **URL-driven filters & pagination**
  - **Single source of truth:** All state is encoded in the URL so pages are reloadable, linkable, and restorable with Back/Forward.
  - **Next/Prev logic**
    ```ts
    function nextPage()  { pushQuery({ offset: String(offset + LIMIT) }); }
    function prevPage()  { pushQuery({ offset: String(Math.max(0, offset - LIMIT)) }); };
    ```
  - **Preserves context on navigation:** Product links include the current query string so returning with Back restores the exact filtered/paged view.
  - **Server validation:** API clamps and validates `limit`/`offset` to prevent abuse and off-by-one errors, returning `{ products, total, limit, offset }`.

- **Debounced search:** Smooth and resource-efficient.

### UI/UX
- Consistent card layout and aligned buttons.
- Clear placeholders (“All Categories”, “All Subcategories”).


## Other Main changes

The `pushQuery()` function is the **central mechanism** that keeps filters, search, and pagination in sync with the URL.  
Instead of manually managing multiple React states and side effects, it ensures a **single source of truth** — the URL query string.

### Purpose
`pushQuery()` updates the URL with new parameters whenever a user:
- types in the search box,
- changes a category/subcategory filter,
- or navigates between pages.

This ensures that:
- the browser’s **Back/Forward** buttons restore the same filter/search state,
- the current view is **shareable via link**,
- and filters/pagination remain **consistent across reloads**.

    ```ts
  function pushQuery(next: Record<string, string | undefined>) {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v !== undefined && v !== "") qs.set(k, v);
      else qs.delete(k);
    }
    // reset paging when filters change
    if ("search" in next || "category" in next || "subCategory" in next) qs.set("offset", "0");
    // always keep limit
    qs.set("limit", String(LIMIT));
    router.push(`/?${qs.toString()}`, { scroll: false });
  }
    ```

