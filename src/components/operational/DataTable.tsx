interface DataTableProps<T> {
  columns: {
    key: string;
    header: string;
    className?: string;
    render?: (item: T) => React.ReactNode;
  }[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<T>({ columns, data, keyExtractor, emptyState, isLoading }: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center">
        {emptyState || <p className="text-sm text-muted">Tidak ada data.</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left py-3 px-4 font-medium text-muted ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-muted/5 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-4 ${col.className || ""}`}>
                  {col.render ? col.render(item) : (item as unknown as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
