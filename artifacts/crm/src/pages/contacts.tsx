import { useState } from "react";
import { Link } from "wouter";
import { useListContacts, useUpdateContactStatus, useExportContacts } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Plus, Mail, Phone, MoreHorizontal } from "lucide-react";
import { CONTACT_STATUS_LABELS, CONTACT_SOURCE_LABELS, STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useListContacts({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    source: sourceFilter !== "all" ? sourceFilter as any : undefined,
  });

  const updateStatus = useUpdateContactStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      }
    }
  });

  const { refetch: exportContacts } = useExportContacts({
    query: {
      enabled: false,
      queryKey: ["/api/contacts/export"] as any,
    }
  });

  const handleExport = async () => {
    const { data } = await exportContacts();
    if (data) {
      const blob = new Blob([data as any], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full max-w-7xl mx-auto h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Manage and track all your leads and customers.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} size="sm" className="glass-subtle rounded-xl flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Export</span> CSV
          </Button>
          <Button asChild size="sm" className="rounded-xl flex-1 sm:flex-none shadow-md shadow-primary/20">
            <Link href="/leads/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New Contact
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch glass rounded-2xl p-3 md:p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="glass-input pl-9 h-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] glass-input rounded-xl h-10">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(CONTACT_STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-[150px] glass-input rounded-xl h-10">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.entries(CONTACT_SOURCE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass rounded-2xl flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading contacts...</TableCell>
              </TableRow>
            ) : contacts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No contacts found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              contacts?.map((contact) => (
                <TableRow key={contact.id} className="group hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <Link href={`/contacts/${contact.id}`} className="hover:underline">
                      {contact.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 p-0 px-2 w-auto data-[state=open]:bg-muted">
                          <Badge variant="outline" className={`${STATUS_COLORS[contact.status] || ''}`}>
                            {CONTACT_STATUS_LABELS[contact.status]}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.entries(CONTACT_STATUS_LABELS).map(([val, label]) => (
                          <DropdownMenuItem
                            key={val}
                            onClick={() => updateStatus.mutate({ id: contact.id, data: { status: val as any } })}
                            className={contact.status === val ? "bg-muted font-medium" : ""}
                          >
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {CONTACT_SOURCE_LABELS[contact.source] || contact.source}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${contact.totalRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/contacts/${contact.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`tel:${contact.phone}`}>Call</a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}