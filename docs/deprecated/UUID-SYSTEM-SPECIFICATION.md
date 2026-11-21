# UUID System Specification

## Current Mechanism (Legacy)

### UUID Generation
**Location**: `src/windows/utils.ts::assignUUIDs()`
- Uses cryptographically secure UUID generator (`crypto.randomUUID()`)
- Created at page load time for all SectionProps objects
- **Problem**: Tightly coupled to `processContent()` function, not reusable independently

### UUID Injection
**Location**: `src/windows/utils.ts::assignUUIDs()`
- Recursively traverses content structure
- Injects `uuid` and `treeIndex` fields into SectionProps objects
- Generates metadata map for minimize/restore tracking
- **Problem**: Complex recursion, multiple types, hard to test

### Provider Pattern (Current)
**Location**: `src/windows/providers.tsx::SectionProvider`
- State lives in provider's reducer
- Uses `pageMetadata.sections` array from UUID injection
- **Problem**: Provider-driven state management, two-tier UUID infrastructure

## Proposed Optimized Mechanism

### a) Provider-Style UUID Generation

**File**: `src/hooks/useUUIDLayer.ts`

**Mechanism**:
```typescript
const UUIDLayerProvider = ({ content, pageMetadata, onUUIDsAssigned }) => {
  const metadataRef = useRef<SectionMetadata[]>(pageMetadata || []);
  
  const { processedContent, metadata } = useMemo(() => {
    const result = injectUUIDsIntoContent(content, metadataRef.current);
    metadataRef.current = result.metadata;
    return result;
  }, [content]);
  
  return {
    processedContent,
    metadata: metadataRef.current,
    generateUUID: useCallback(() => crypto.randomUUID(), []),
    processInMemory: useCallback((content) => injectUUIDsIntoContent(content), [])
  };
};
```

**Benefits**:
1. **Single Source of Truth**: All UUID injection logic in one file
2. **Declarative**: Clean provider interface with clear props
3. **Testable**: Functions are pure and standalone
4. **Reusable**: Can be used in providers, hooks, or standalone utilities

### b) How UUIDs Are Added to Page Components

**Current Approach**:
```typescript
// In utils.ts - processContent calls assignUUIDs
export function processContent<T extends SectionProps>(content: T | T[]) {
  return assignUUIDs(content, metadata);
}
```

**Optimized Approach**:
```typescript
// In hooks/useUUIDLayer.ts
export function injectUUIDsIntoContent(content: Content): { processed: Content, metadata: SectionMetadata[] } {
  const metadata = new Map<string, SectionMetadata>();
  let processedContent = content;
  
  if (Array.isArray(content)) {
    processedContent = content.map((item) => processContentItem(item, metadata)) as Content;
  } else {
    processedContent = processContentItem(content, metadata) as Content;
  }
  
  return { processed: processedContent, metadata: Array.from(metadata.values()) };
}
```

**Benefits**:
1. **Type Safety**: Works with `Content` union type
2. **Separation**: UUID injection separated from content processing
3. **Explicit**: Clear return value `{ processed, metadata }`
4. **Minimal**: Simpler recursion, no complex type gymnastics

### c) How Optimized Provider-Style Reduces Moving Parts

**Current System Components**:
1. `src/windows/utils.ts` - processContent (assignUUIDs)
2. `src/windows/providers.tsx` - SectionProvider (state management)
3. `src/windows/types.ts` - UUID types (ContentWithUUID, etc.)

**Optimized System**:
```typescript
1. `src/hooks/useUUIDLayer.ts` - Single provider + utility functions
```

**Reductions**:
- ❌ **Removed**: `src/windows/utils.ts` (UUID logic)
- ❌ **Removed**: `src/windows/Section.tsx` (UUID assignment complexity)
- ❌ **Removed**: `src/types.ts` (ContentWithUUID type alias redundancy)
- ✅ **Added**: `src/hooks/useUUIDLayer.ts` (centralized provider)

**Core Benefits**:
1. **Unified Logic**: One file handles all UUID functionality
2. **Reduced Complexity**: No two-tier infrastructure (processing + provider)
3. **Clean Abstraction**: Clear separation between UUID injection and React state
4. **Easier Testing**: Pure functions, no React state machinery
5. **Type Safety**: Works directly with Content union without complex generics

## File Inventory Current Legacy System

### UUID Mechanism Required Files:
1. **src/windows/utils.ts**
   - `createUUID()` - UUID generation
   - `validateContentLinks()` - Link validation
   - `processContent()` - Main UUID injection
   - `assignUUIDs()` - Recursion with UUID assignment
   - `getAncestorSectionUuids()` - Section hierarchy lookup

2. **src/windows/providers.tsx**
   - `SectionProvider` - React context provider
   - `SectionState` - State structure
   - `sectionReducer` - State management
   - `pageMetadata` - UUID metadata storage

3. **src/windows/types.ts**
   - `ContentWithUUID<T>` - Type with injected fields
   - `SectionMetadata` - Metadata structure
   - `SectionProps` - Component props with UUID fields

### Rescue Components (New Required Files):
4. **src/components/OkButton.tsx** ← from windows/
5. **src/components/Section.tsx** ← from windows/ (43978 lines)
6. **src/components/ShowPermalinkButton.tsx** ← from windows/

### Components Currently Using Legacy System:
7. **src/components/Addon.tsx** - imports from windowing
8. **src/components/MusicContent.tsx** - imports from windowing
9. **src/components/SitemapContent.tsx** - imports from windowing
10. **src/components/BlogContent.tsx** - imports from windowing
11. **src/components/PageSpace.tsx** - uses windowing/Section
12. **src/components/Page.tsx** - uses windowing
13. **src/components/MenuBarWithContext.tsx** - uses windowing
14. **src/pages/HomePage.tsx** - imports from windowing
15. **src/pages/AddonsPage.tsx** - imports from windowing
16. **src/pages/WowPage.tsx** - imports from windowing
17. **src/pages/index.ts** - exports Pages object

### Summary of Files for Old-Style UUID Mechanism: **17 Files**
- 1: `src/hooks/useUUIDLayer.ts` (NEW - proposed)
- 4: Legacy system files (to be removed)
- 2: Rescued components (to be refactored)
- 10+ Components importing from legacy system (requires refactoring)
