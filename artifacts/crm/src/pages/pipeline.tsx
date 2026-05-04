import { useState } from "react";
import { Link } from "wouter";
import { useListContacts, useUpdateContactStatus } from "@workspace/api-client-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PIPELINE_STAGES, CONTACT_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical, Phone, Clock } from "lucide-react";

export default function Pipeline() {
  const { data: contacts, isLoading } = useListContacts();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateContactStatus({
    mutation: {
      onSuccess: () => {
        // We optimistically updated, but we invalidate just in case
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      }
    }
  });

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const contactId = parseInt(draggableId, 10);
    const newStatus = destination.droppableId as any;

    // Optimistic update
    queryClient.setQueryData(["/api/contacts"], (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.map((c: any) =>
        c.id === contactId ? { ...c, status: newStatus } : c
      );
    });

    updateStatus.mutate({ id: contactId, data: { status: newStatus } });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading pipeline...</div>;
  }

  // Group contacts by status
  const columns = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = contacts?.filter(c => c.status === stage) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Drag and drop leads to update their stage.</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 md:gap-4 h-full min-w-max items-start">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage} className="w-[280px] md:w-[320px] flex flex-col h-full max-h-full glass-subtle rounded-2xl p-2">
                <div className="p-2 flex items-center justify-between shrink-0">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {CONTACT_STATUS_LABELS[stage]}
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                      {columns[stage].length}
                    </Badge>
                  </h3>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-2 space-y-3 min-h-[150px] transition-colors rounded-lg ${snapshot.isDraggingOver ? 'bg-muted/60' : ''}`}
                    >
                      {columns[stage].map((contact, index) => (
                        <Draggable key={contact.id} draggableId={contact.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow border-muted ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20 rotate-1' : ''}`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline hover:text-primary transition-colors truncate pr-2">
                                    {contact.name}
                                  </Link>
                                  <div {...provided.dragHandleProps} className="text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 cursor-grab">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </div>

                                {contact.serviceRequested && (
                                  <div className="text-xs font-medium text-primary mb-2 line-clamp-1 bg-primary/5 w-fit px-1.5 py-0.5 rounded">
                                    {contact.serviceRequested}
                                  </div>
                                )}

                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                  <Phone className="h-3 w-3" />
                                  <span>{contact.phone}</span>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })}
                                  </div>
                                  <div className="font-semibold text-sm">
                                    ${contact.totalRevenue.toLocaleString()}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}