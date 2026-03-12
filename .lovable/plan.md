

# Fix: `TypeError: Z.closest is not a function` in BlueprintExamRunner

## Root Cause

Line 173 casts `e.target` as `HTMLElement`, but on Android Chrome Mobile (the Sentry trace shows Chrome Mobile 145 on Android 10), the `selectstart` event can fire with `e.target` being a `Text` node or `null` — neither of which has a `.closest()` method. Text nodes are valid event targets but are not Elements.

## Fix

Add a guard at line 172-173 to check that `target` is actually an `Element` before calling `.closest()`:

```ts
const blockSelection = (e: Event) => {
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (!target.closest('textarea') && !target.closest('input')) {
    e.preventDefault();
  }
};
```

Same guard needed for `blockKeyboard` at line 179-180:

```ts
const blockKeyboard = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('textarea') && !target.closest('input')) {
      e.preventDefault();
    }
  }
};
```

## Scope

One file, two guards. No behavioral change — just prevents the crash on non-Element targets.

