

## Page size: 50 vs 20-30

At current scale, the difference is negligible. The bottleneck is DOM rendering, and both 30 and 50 rows render in under 16ms on any modern device. The data is already fetched client-side — slicing 30 vs 50 from an array costs nothing.

**30 rows per page** is the better choice, but not for performance — for usability:

- Admin tables have 5-6 columns with dropdowns, checkboxes, and action buttons per row
- 50 rows of interactive elements creates a long scrollable page on laptops (1366x768 screens)
- 30 rows fits on one screen without scrolling on most admin devices
- Admins scanning content find what they need faster in shorter pages

**Recommendation:** Use 30 as the default `pageSize`. No measurable performance gain over 50, but a noticeably better admin experience.

The plan stays identical — just change the default from 50 to 30 in `ContentAdminTable.tsx`.

