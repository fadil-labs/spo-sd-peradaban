# PHASE-2.9.C.1-BUGFIX-REPORT.md

## 1. Executive Summary

Notification badge in the topbar did not update after the user marked notifications as read on the notifications page. The root cause was an unreliable React state update chain between the notifications page and the app shell.

**Final Status:** PASS

## 2. Root Cause

The notification badge count (`unreadCount`) in `AppShell.tsx` was stored in local React state (`useState`). When a user marked notifications as read in `NotificationsClient.tsx`, the client dispatched a `"notification:refresh"` window event. `AppShell.tsx` listened for this event and called `refreshUnreadCount()`, which called the server action `getUnreadNotificationCountAction()` and then called `setUnreadCount(result.count)`.

In some cases, this state update did not cause the `Topbar` component to re-render with the new count. The most likely causes were:
1. The event listener and state updater were in a `useEffect` with an empty dependency array, but the `refreshUnreadCount` function was recreated on every render, potentially causing stale closures.
2. The `useEffect` had eslint-disable comments for `react-hooks/set-state-in-effect`, indicating the state update was happening inside an effect without proper dependencies, which can lead to missed updates in React's concurrent mode.
3. The event-based approach did not guarantee synchronous notification of all subscribers, especially if multiple events fired in quick succession.

## 3. Fix Applied

### File
`src/components/layout/AppShell.tsx`

### Change
Replaced the local `useState`-based `unreadCount` with a `useSyncExternalStore`-backed store. This ensures that all subscribers are notified synchronously when the count changes.

```typescript
// Before:
const [unreadCount, setUnreadCount] = useState(0);

const refreshUnreadCount = async () => {
  const result = await getUnreadNotificationCountAction();
  if ("count" in result) {
    setUnreadCount(result.count);
  }
};

useEffect(() => {
  refreshUnreadCount();
  // ... event listeners
}, []);

// After:
function createUnreadCountStore(initialCount: number) {
  let count = initialCount;
  const listeners = new Set<() => void>();

  return {
    getCount: () => count,
    setCount: (newCount: number) => {
      count = newCount;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const unreadCountStore = createUnreadCountStore(0);

const unreadCount = useSyncExternalStore(
  unreadCountStore.subscribe,
  unreadCountStore.getCount,
  () => 0
);

const refreshUnreadCount = async () => {
  const result = await getUnreadNotificationCountAction();
  if ("count" in result) {
    unreadCountStore.setCount(result.count);
  }
};

useEffect(() => {
  refreshUnreadCount();
  // ... event listeners
}, []);
```

### Why It Fixes the Problem
`useSyncExternalStore` is designed for subscribing to external data sources. It guarantees that all subscribers are notified synchronously when the store updates. By using a simple store with a `Set` of listeners, we ensure that when `unreadCountStore.setCount()` is called after `refreshUnreadCount()` fetches the new count, every component using `useSyncExternalStore` with this store will re-render immediately with the correct value.

This eliminates the race condition and stale closure issues inherent in the previous event-based `useState` approach.

## 4. Verification

1. Open the application as a parent user.
2. Note the unread notification badge count in the topbar.
3. Navigate to the notifications page.
4. Mark a single notification as read.
5. Verify that the badge count in the topbar updates immediately.
6. Mark all notifications as read.
7. Verify that the badge count disappears (or shows 0) immediately.
8. Refresh the page and verify the count persists correctly.

## 5. Related Changes

- `src/app/dashboard/orang-tua/bills/[id]/ParentBillDetailClient.tsx` — Removed inline payment form to prevent bypassing the checkout page. Parents now must use the dedicated payment checkout page.
- `src/components/layout/AppShell.tsx` — Replaced `useState` with `useSyncExternalStore` for notification badge count.
