## Fix Chapter Icon Visibility in Header Breadcrumb

**Problem**: The chapter icon in the header breadcrumb has poor contrast in dark mode — the current `dark:bg-white/15` background is too subtle for dark-colored icons.

**Solution**: add a white padding in the icon background 

### Change in `src/components/layout/MainLayout.tsx` (line 189)

Update the chapter icon classes from:

```
bg-muted/60 dark:bg-white/15 p-0.5
```

to:

```
bg-muted/80 dark:bg-white/30 p-1
```

This doubles the dark-mode background opacity (15% → 30%) and increases padding, making the icon clearly visible against the dark header regardless of the icon's own color.