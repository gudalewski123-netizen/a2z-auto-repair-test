import { useParams, useLocation, Link } from "wouter";
import { useGetContact, useUpdateContact, useUpdateContactStatus, useDeleteContact, useListJobs, useCreateJob, useUpdateJob, useDeleteJob, useListActivities, useListFollowUps, useCreateFollowUp, useUpdateFollowUp, useDeleteFollowUp, getGetContactQueryKey, getListJobsQueryKey, getListActivitiesQueryKey, getListFollowUpsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, Tag, Calendar, CheckCircle2, Clock, Trash2, Edit, Plus, FileText, ChevronDown, CheckCircle, Activity, Briefcase } from "lucide-react";
import { CONTACT_STATUS_LABELS, STATUS_COLORS, CONTACT_SOURCE_LABELS } from "@/lib/constants";
import { format, isPast, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const jobFormSchema = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  date: z.string().optional(),
  notes: z.string().optional(),
});

const followUpFormSchema = z.object({
  dueDate: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});

export default function ContactDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteDialogOpen] = useState(false);

  const { data: contact, isLoading: isContactLoading } = useGetContact(id, {
    query: { enabled: !!id, queryKey: getGetContactQueryKey(id) }
  });

  const { data: jobs, isLoading: isJobsLoading } = useListJobs(id, {
    query: { enabled: !!id, queryKey: getListJobsQueryKey(id) }
  });

  const { data: activities, isLoading: isActivitiesLoading } = useListActivities(id, {
    query: { enabled: !!id, queryKey: getListActivitiesQueryKey(id) }
  });

  const { data: followUps, isLoading: isFollowUpsLoading } = useListFollowUps({ status: undefined, overdue: undefined }, {
    query: { enabled: !!id, queryKey: getListFollowUpsQueryKey({ status: undefined, overdue: undefined }) }
  });

  const contactFollowUps = followUps?.filter(f => f.contactId === id) || [];

  const updateContact = useUpdateContact();
  const updateStatus = useUpdateContactStatus();
  const deleteContact = useDeleteContact();
  const createJob = useCreateJob();
  const deleteJob = useDeleteJob();
  const createFollowUp = useCreateFollowUp();
  const updateFollowUp = useUpdateFollowUp();
  const deleteFollowUp = useDeleteFollowUp();

  const handleNotesSave = () => {
    if (!contact) return;
    updateContact.mutate(
      { id, data: { notes: notesValue } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetContactQueryKey(id), data);
          setIsEditingNotes(false);
        }
      }
    );
  };

  const handleStatusChange = (status: any) => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetContactQueryKey(id), data);
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(id) });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteContact.mutate(
      { id },
      {
        onSuccess: () => {
          setLocation("/contacts");
        }
      }
    );
  };

  const jobForm = useForm<z.infer<typeof jobFormSchema>>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      serviceType: "",
      price: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    }
  });

  const onJobSubmit = (values: z.infer<typeof jobFormSchema>) => {
    createJob.mutate(
      { contactId: id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(id) });
          setIsJobDialogOpen(false);
          jobForm.reset();
        }
      }
    );
  };

  const followUpForm = useForm<z.infer<typeof followUpFormSchema>>({
    resolver: zodResolver(followUpFormSchema),
    defaultValues: {
      dueDate: format(new Date(), "yyyy-MM-dd"),
      note: "",
    }
  });

  const onFollowUpSubmit = (values: z.infer<typeof followUpFormSchema>) => {
    createFollowUp.mutate(
      { contactId: id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFollowUpsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(id) });
          setIsFollowUpDialogOpen(false);
          followUpForm.reset();
        }
      }
    );
  };

  const toggleFollowUpStatus = (followUpId: number, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "completed" : "pending";
    updateFollowUp.mutate(
      { id: followUpId, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFollowUpsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(id) });
        }
      }
    );
  };

  useEffect(() => {
    if (contact && !isEditingNotes) {
      setNotesValue(contact.notes || "");
    }
  }, [contact, isEditingNotes]);

  if (isContactLoading) {
    return <div className="p-8 text-center">Loading contact...</div>;
  }

  if (!contact) {
    return <div className="p-8 text-center text-destructive">Contact not found</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto h-full pb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8 bg-card border shadow-sm">
            <Link href="/contacts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {contact.name}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 font-medium bg-background border shadow-sm hover:bg-muted">
                    <Badge variant="secondary" className={`${STATUS_COLORS[contact.status] || ''} mr-2`}>
                      {CONTACT_STATUS_LABELS[contact.status]}
                    </Badge>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(CONTACT_STATUS_LABELS).map(([val, label]) => (
                    <DropdownMenuItem
                      key={val}
                      onClick={() => handleStatusChange(val)}
                      className={contact.status === val ? "bg-muted font-medium" : ""}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Phone className="h-3.5 w-3.5" /> {contact.phone}
              </a>
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" /> {contact.email}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Source: {CONTACT_SOURCE_LABELS[contact.source] || contact.source}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-9">
                <Trash2 className="h-4 w-4 mr-2" /> Delete Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete {contact.name}'s profile and all associated data including jobs, activities, and follow-ups.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteContact.isPending}>
                  {deleteContact.isPending ? "Deleting..." : "Delete Contact"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lifetime Revenue</p>
                  <h3 className="text-2xl font-bold text-primary mt-1">${contact.totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Requested</p>
                  <h3 className="text-lg font-semibold mt-1 line-clamp-1">{contact.serviceRequested || "None specified"}</h3>
                </div>
                <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-4">
              <TabsTrigger value="jobs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Jobs</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Notes</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4 mt-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Job History</h3>
                <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Job</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Job</DialogTitle>
                      <DialogDescription>Record a completed job to track revenue.</DialogDescription>
                    </DialogHeader>
                    <Form {...jobForm}>
                      <form onSubmit={jobForm.handleSubmit(onJobSubmit)} className="space-y-4">
                        <FormField control={jobForm.control} name="serviceType" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type</FormLabel>
                            <FormControl><Input placeholder="e.g. Full Interior Detail" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={jobForm.control} name="price" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={jobForm.control} name="date" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date Completed</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={jobForm.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea placeholder="Optional details..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsJobDialogOpen(false)}>Cancel</Button>
                          <Button type="submit" disabled={createJob.isPending}>Save Job</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {isJobsLoading ? (
                <div className="space-y-3"><Skeleton className="h-20 w-full" /></div>
              ) : jobs?.length === 0 ? (
                <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground flex flex-col items-center">
                  <Briefcase className="h-10 w-10 text-muted mb-2" />
                  <p>No jobs recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs?.map((job) => (
                    <Card key={job.id} className="overflow-hidden">
                      <CardContent className="p-4 sm:p-5 flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-base">{job.serviceType}</h4>
                            <Badge variant="outline" className="font-normal text-xs py-0 h-5">
                              {job.date ? format(parseISO(job.date), "MMM d, yyyy") : "Unknown date"}
                            </Badge>
                          </div>
                          {job.notes && <p className="text-sm text-muted-foreground mt-2">{job.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="font-bold text-lg text-primary">${job.price.toLocaleString()}</div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                            if(confirm("Delete this job? This will reduce total revenue.")) {
                              deleteJob.mutate({ contactId: id, id: job.id }, {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: getListJobsQueryKey(id) });
                                  queryClient.invalidateQueries({ queryKey: getGetContactQueryKey(id) });
                                }
                              });
                            }
                          }}>
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                  <CardTitle className="text-lg">Contact Notes</CardTitle>
                  {!isEditingNotes ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Notes
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleNotesSave} disabled={updateContact.isPending}>Save</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {isEditingNotes ? (
                    <Textarea
                      className="min-h-[200px]"
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add notes about this customer..."
                    />
                  ) : (
                    <div className="min-h-[200px] whitespace-pre-wrap text-sm">
                      {contact.notes || <span className="text-muted-foreground italic">No notes added yet.</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {isActivitiesLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-[80%]" />
                    </div>
                  ) : activities?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet.</p>
                  ) : (
                    <div className="relative border-l border-muted ml-3 pl-4 space-y-6">
                      {activities?.map((activity) => (
                        <div key={activity.id} className="relative">
                          <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                          <p className="text-sm font-medium">{activity.action}</p>
                          {activity.details && <p className="text-sm text-muted-foreground mt-0.5">{activity.details}</p>}
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Follow-ups */}
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-sm bg-primary/5">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Follow-ups
              </CardTitle>
              <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/20"><Plus className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Follow-up Reminder</DialogTitle>
                  </DialogHeader>
                  <Form {...followUpForm}>
                    <form onSubmit={followUpForm.handleSubmit(onFollowUpSubmit)} className="space-y-4">
                      <FormField control={followUpForm.control} name="dueDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={followUpForm.control} name="note" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reminder Note</FormLabel>
                          <FormControl><Textarea placeholder="E.g., Check if they want to book..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsFollowUpDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createFollowUp.isPending}>Save Reminder</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isFollowUpsLoading ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /></div>
              ) : contactFollowUps.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground bg-card/50 rounded-lg border border-dashed">
                  No pending follow-ups.
                </div>
              ) : (
                <div className="space-y-3">
                  {contactFollowUps.map((fu) => {
                    const isOverdue = fu.status === "pending" && isPast(parseISO(fu.dueDate)) && format(parseISO(fu.dueDate), "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd");
                    return (
                      <div key={fu.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors ${fu.status === 'completed' ? 'opacity-60 grayscale' : isOverdue ? 'border-destructive bg-destructive/5' : ''}`}>
                        <button
                          onClick={() => toggleFollowUpStatus(fu.id, fu.status)}
                          className={`mt-0.5 shrink-0 transition-colors ${fu.status === 'completed' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${fu.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {fu.note || "Follow up"}
                          </p>
                          <p className={`text-xs mt-1 font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {format(parseISO(fu.dueDate), "MMM d, yyyy")}
                            {isOverdue && " (Overdue)"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1"><ChevronDown className="h-3 w-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => deleteFollowUp.mutate({ id: fu.id }, {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: getListFollowUpsQueryKey() });
                                queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(id) });
                              }
                            })} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}