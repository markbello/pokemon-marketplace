'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { FormattedDate } from '@/components/FormattedDate';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Order } from '@prisma/client';

interface PurchasesTableProps {
  orders: Order[];
}

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 lg:px-4"
        >
          Order #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span className="font-mono text-sm">#{row.original.id.slice(-8)}</span>;
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      return <span className="text-sm">{row.original.description}</span>;
    },
  },
  {
    accessorKey: 'totalCents',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 lg:px-4"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className="font-semibold">{formatCurrency(row.original.totalCents, row.original.currency)}</span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 lg:px-4"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={
            status === 'PAID'
              ? 'default'
              : status === 'PENDING'
                ? 'secondary'
                : status === 'CANCELLED'
                  ? 'secondary'
                  : 'destructive'
          }
          className={
            status === 'PAID'
              ? 'bg-green-100 text-green-800 hover:bg-green-100'
              : status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                : ''
          }
        >
          {status === 'PAID'
            ? '✓ Paid'
            : status === 'PENDING'
              ? '⏳ Pending'
              : status === 'CANCELLED'
                ? '○ Cancelled'
                : '✗ Refunded'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 lg:px-4"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          <FormattedDate date={row.original.createdAt} purchaseTimezone={row.original.purchaseTimezone} />
        </span>
      );
    },
  },
  {
    accessorKey: 'isTestPayment',
    header: 'Type',
    cell: ({ row }) => {
      if (row.original.isTestPayment) {
        return (
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
            Test
          </Badge>
        );
      }
      return <span className="text-sm text-muted-foreground">—</span>;
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      return (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orders/${row.original.id}`}>
            View
            <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      );
    },
  },
];

export function PurchasesTable({ orders }: PurchasesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

